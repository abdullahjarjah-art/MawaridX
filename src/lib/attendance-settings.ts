import { prisma } from "@/lib/prisma";

export type AttendanceSettings = {
  type: "fixed" | "flexible";
  checkInTime: string;         // "08:00"
  checkOutTime: string;        // "17:00"
  requiredHours: number;
  lateToleranceMinutes: number;
};

export const DEFAULT_ATT: AttendanceSettings = {
  type: "fixed",
  checkInTime: "08:00",
  checkOutTime: "17:00",
  requiredHours: 8,
  lateToleranceMinutes: 15,
};

/** جلب إعدادات الدوام من قاعدة البيانات (server-side) */
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "attendance_settings" } });
    if (!s) return DEFAULT_ATT;
    return { ...DEFAULT_ATT, ...JSON.parse(s.value) };
  } catch {
    return DEFAULT_ATT;
  }
}

/** تحويل وقت "HH:MM" إلى دقائق من منتصف الليل */
export function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * حساب ساعات العمل من وقت الدخول والخروج
 * @returns ساعات العمل (مقربة لخانتين عشريتين) أو null إذا كان checkOut قبل checkIn
 */
export function calcWorkHours(
  checkIn: Date,
  checkOut: Date,
): number | null {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return null;
  return Math.round((diffMs / 3_600_000) * 100) / 100;
}
