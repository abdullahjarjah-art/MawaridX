import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAttendanceSettings, timeToMins } from "@/lib/attendance-settings";

// حساب المسافة بين نقطتين بالمتر (Haversine)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET — جلب حالة الحضور اليوم
export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [attendance, employee, activeLeave] = await Promise.all([
    prisma.attendance.findFirst({
      where: { employeeId: session.employeeId, date: { gte: today, lt: tomorrow } },
      include: { workLocation: { select: { id: true, name: true } } },
    }),
    prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { workLocationId: true, workLocation: { select: { id: true, name: true, latitude: true, longitude: true, radius: true } } },
    }),
    prisma.leave.findFirst({
      where: {
        employeeId: session.employeeId,
        status: "approved",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { type: true, startDate: true, endDate: true },
    }),
  ]);

  return NextResponse.json({
    attendance,
    workLocation: employee?.workLocation ?? null,
    activeLeave: activeLeave ?? null,
  });
}

// POST — تسجيل بصمة (دخول أو خروج)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const { latitude, longitude, action } = body; // action: "checkin" | "checkout"

  if (!latitude || !longitude) return NextResponse.json({ error: "تعذّر تحديد موقعك" }, { status: 400 });

  // التحقق من الموقع الجغرافي
  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { workLocation: { select: { id: true, name: true, latitude: true, longitude: true, radius: true } } },
  });

  const loc = employee?.workLocation;
  let distanceMeters: number | null = null;
  let locationVerified = false;

  if (loc?.latitude && loc?.longitude) {
    distanceMeters = Math.round(haversine(latitude, longitude, loc.latitude, loc.longitude));
    locationVerified = distanceMeters <= (loc.radius ?? 200);

    if (!locationVerified) {
      return NextResponse.json({
        error: `أنت خارج نطاق موقع العمل`,
        distance: distanceMeters,
        radius: loc.radius,
        locationName: loc.name,
      }, { status: 403 });
    }
  }

  const attSettings = await getAttendanceSettings();
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // منع البصمة إذا كان الموظف في إجازة معتمدة تشمل اليوم
  const activeLeave = await prisma.leave.findFirst({
    where: {
      employeeId: session.employeeId,
      status: "approved",
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { type: true, startDate: true, endDate: true },
  });
  if (activeLeave) {
    const leaveTypeMap: Record<string, string> = {
      annual: "سنوية", sick: "مرضية", emergency: "طارئة",
      unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
    };
    const typeName = leaveTypeMap[activeLeave.type] ?? activeLeave.type;
    const endStr = activeLeave.endDate.toISOString().slice(0, 10);
    return NextResponse.json(
      { error: `أنت في إجازة ${typeName} حتى ${endStr} — لا يمكن تسجيل البصمة` },
      { status: 403 },
    );
  }

  const existing = await prisma.attendance.findFirst({
    where: { employeeId: session.employeeId, date: { gte: today, lt: tomorrow } },
  });

  if (action === "checkin") {
    if (existing) return NextResponse.json({ error: "تم تسجيل دخولك مسبقاً اليوم" }, { status: 400 });

    const record = await prisma.attendance.create({
      data: {
        employeeId: session.employeeId,
        date: today,
        checkIn: now,
        status: (() => { const att = attSettings; const limit = timeToMins(att.checkInTime) + att.lateToleranceMinutes; return now.getHours() * 60 + now.getMinutes() > limit ? "late" : "present"; })(),
        workLocationId: loc?.id ?? null,
        notes: distanceMeters !== null ? `بُعد: ${distanceMeters}م` : undefined,
      },
      include: { workLocation: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, attendance: record, distance: distanceMeters });
  }

  if (action === "checkout") {
    if (!existing) return NextResponse.json({ error: "لم يتم تسجيل دخولك اليوم" }, { status: 400 });
    if (existing.checkOut) return NextResponse.json({ error: "تم تسجيل خروجك مسبقاً" }, { status: 400 });

    const checkInTime = existing.checkIn ?? now;
    const workHours = Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100;

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now, workHours },
      include: { workLocation: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, attendance: record, distance: distanceMeters });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
