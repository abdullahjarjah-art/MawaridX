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
 * حساب ساعات العمل الفعلية مع خصم الاستراحة
 * @param checkIn  وقت الدخول
 * @param checkOut وقت الخروج
 * @param breakMinutes دقائق الاستراحة (من الشيفت)
 * @returns ساعات العمل الصافية (مقربة لخانتين عشريتين) أو null إذا كان checkOut قبل checkIn
 */
export function calcWorkHours(
  checkIn: Date,
  checkOut: Date,
  breakMinutes = 0,
): number | null {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return null; // خروج قبل الدخول — خطأ في البيانات
  const rawHours = diffMs / 3_600_000;
  const breakHours = breakMinutes / 60;
  const net = Math.max(0, rawHours - breakHours);
  return Math.round(net * 100) / 100;
}
