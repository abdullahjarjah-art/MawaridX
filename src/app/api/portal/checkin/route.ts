import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAttendanceSettings, timeToMins, calcWorkHours } from "@/lib/attendance-settings";

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

/** تحويل رقم اليوم (0=أحد) إلى اسم عربي */
function dayNameAr(day: number): string {
  return ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][day] ?? "";
}

// GET — جلب حالة الحضور اليوم
export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [attendance, employee, activeLeave, todayHoliday, empShift] = await Promise.all([
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
    // هل اليوم عطلة رسمية؟
    prisma.holiday.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
      select: { name: true, type: true },
    }),
    // جدول دوام الموظف
    prisma.employeeShift.findFirst({
      where: { employeeId: session.employeeId, endDate: null },
      include: {
        shift: {
          select: { id: true, name: true, checkInTime: true, checkOutTime: true, workDays: true, color: true },
        },
      },
    }),
  ]);

  // هل اليوم يوم دوام؟
  const todayDay = new Date().getDay(); // 0=أحد
  const workDaysList = empShift?.shift?.workDays?.split(",").map(Number) ?? null;
  const isWorkDay = workDaysList ? workDaysList.includes(todayDay) : true; // بدون شيفت = دوام دائماً

  return NextResponse.json({
    attendance,
    workLocation: employee?.workLocation ?? null,
    activeLeave: activeLeave ?? null,
    todayHoliday: todayHoliday ?? null,
    shift: empShift?.shift ?? null,
    isWorkDay,
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

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // منع البصمة في العطل الرسمية
  const holiday = await prisma.holiday.findFirst({
    where: { date: { gte: today, lt: tomorrow } },
    select: { name: true },
  });
  if (holiday) {
    return NextResponse.json(
      { error: `اليوم عطلة رسمية (${holiday.name}) — لا يمكن تسجيل البصمة` },
      { status: 403 },
    );
  }

  // منع البصمة إذا كان الموظف في إجازة معتمدة تشمل اليوم
  const activeLeave = await prisma.leave.findFirst({
    where: {
      employeeId: session.employeeId,
      status: "approved",
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { type: true, endDate: true },
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

  // جلب شيفت الموظف الكامل
  const empShift = await prisma.employeeShift.findFirst({
    where: { employeeId: session.employeeId, endDate: null },
    include: {
      shift: {
        select: { checkInTime: true, checkOutTime: true, workDays: true },
      },
    },
  });

  // ── التحقق من أيام الدوام ──
  if (empShift?.shift?.workDays) {
    const workDaysList = empShift.shift.workDays.split(",").map(Number);
    const todayDay = now.getDay(); // 0=أحد
    if (!workDaysList.includes(todayDay)) {
      return NextResponse.json(
        { error: `اليوم (${dayNameAr(todayDay)}) ليس من أيام دوامك` },
        { status: 403 },
      );
    }
  } else {
    // ── fallback Weekend: لا يوجد شيفت — رفض الجمعة/السبت ──
    const dow = now.getDay();
    if (dow === 5 || dow === 6) {
      return NextResponse.json(
        { error: `اليوم (${dayNameAr(dow)}) عطلة أسبوعية — لا يمكن تسجيل البصمة` },
        { status: 403 },
      );
    }
  }

  const existing = await prisma.attendance.findFirst({
    where: { employeeId: session.employeeId, date: { gte: today, lt: tomorrow } },
  });

  if (action === "checkin") {
    if (existing) return NextResponse.json({ error: "تم تسجيل دخولك مسبقاً اليوم" }, { status: 400 });

    // تحديد التأخير: أولاً من الشيفت، ثم من الإعدادات العامة
    let status = "present";
    if (empShift?.shift?.checkInTime) {
      const [sh, sm] = empShift.shift.checkInTime.split(":").map(Number);
      const shiftInMins = sh * 60 + sm;
      const actualMins = now.getHours() * 60 + now.getMinutes();
      // جلب مهلة التأخير
      const tolSetting = await prisma.setting.findUnique({ where: { key: "lateToleranceMinutes" } });
      const tolerance = tolSetting ? Number(tolSetting.value) : 15;
      if (actualMins - shiftInMins > tolerance) status = "late";
    } else {
      // fallback على الإعدادات العامة
      const attSettings = await getAttendanceSettings();
      const limit = timeToMins(attSettings.checkInTime) + attSettings.lateToleranceMinutes;
      if (now.getHours() * 60 + now.getMinutes() > limit) status = "late";
    }

    const record = await prisma.attendance.create({
      data: {
        employeeId: session.employeeId,
        date: today,
        checkIn: now,
        status,
        workLocationId: loc?.id ?? null,
        source: "gps",
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

    // التحقق أن وقت الخروج بعد الدخول
    if (now <= checkInTime) {
      return NextResponse.json({ error: "وقت الخروج يجب أن يكون بعد وقت الدخول" }, { status: 400 });
    }

    const workHours = calcWorkHours(checkInTime, now);

    // حساب الأوفرتايم بناءً على شيفت الموظف
    let overtimeMinutes = 0;
    if (empShift?.shift?.checkOutTime) {
      const [eh, em] = empShift.shift.checkOutTime.split(":").map(Number);
      const shiftOutMins = eh * 60 + em;
      const actualOutMins = now.getHours() * 60 + now.getMinutes();
      overtimeMinutes = Math.max(0, actualOutMins - shiftOutMins);
    }

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now, workHours, overtimeMinutes },
      include: { workLocation: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, attendance: record, distance: distanceMeters });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
