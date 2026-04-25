import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const locationId = searchParams.get("locationId");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (locationId) where.workLocationId = locationId;
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    where.date = { gte: start, lt: end };
  }

  const page     = Math.max(1, Number(searchParams.get("page")     || 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 25)));
  const noPagination = searchParams.get("all") === "1";

  const locationSelect = { select: { id: true, name: true, address: true } };
  const includeAll = {
    employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, photo: true } },
    workLocation: locationSelect,
    checkInLocation: locationSelect,
    checkOutLocation: locationSelect,
  };

  if (noPagination) {
    const records = await prisma.attendance.findMany({ where, include: includeAll, orderBy: { date: "desc" } });
    return NextResponse.json(records);
  }

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({ where, include: includeAll, orderBy: { date: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  return NextResponse.json({ data: records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const employeeId = body.employeeId;

  // منع البصمة لأي موظف في إجازة رسمية معتمدة
  if (employeeId && body.checkIn) {
    const recordDate = body.date ? new Date(body.date) : new Date();
    recordDate.setHours(0, 0, 0, 0);

    const activeLeave = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: "approved",
        startDate: { lte: recordDate },
        endDate: { gte: recordDate },
      },
      select: { type: true, endDate: true },
    });

    if (activeLeave) {
      const leaveTypeMap: Record<string, string> = {
        annual: "سنوية", sick: "مرضية", emergency: "طارئة",
        unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
      };
      const typeName = leaveTypeMap[activeLeave.type] ?? activeLeave.type;
      const endStr = new Date(activeLeave.endDate).toLocaleDateString("ar-SA");
      return NextResponse.json(
        { error: `الموظف في إجازة ${typeName} حتى ${endStr} — لا يمكن تسجيل البصمة` },
        { status: 403 }
      );
    }
  }

  // ── حساب التأخير بناءً على شيفت الموظف ──
  let statusFinal = body.status ?? "present";
  let overtimeMinutes = 0;

  if (body.checkIn && employeeId) {
    // جلب الشيفت الحالي للموظف
    const empShift = await prisma.employeeShift.findFirst({
      where: { employeeId, endDate: null },
      include: { shift: true },
    });

    if (empShift?.shift) {
      const shift = empShift.shift;
      const checkInDt = new Date(body.checkIn);
      const [sh, sm] = shift.checkInTime.split(":").map(Number);
      const shiftInMs = sh * 60 + sm; // دقائق
      const actualInMs = checkInDt.getHours() * 60 + checkInDt.getMinutes();
      const lateMins = actualInMs - shiftInMs;

      // جلب مهلة التأخير من الإعدادات (افتراضي 15 دقيقة)
      const tolSetting = await prisma.setting.findUnique({ where: { key: "lateToleranceMinutes" } });
      const tolerance = tolSetting ? Number(tolSetting.value) : 15;

      if (lateMins > tolerance) statusFinal = "late";

      // حساب الإضافي إذا أُرسل checkOut
      if (body.checkOut) {
        const checkOutDt = new Date(body.checkOut);
        const [eh, em] = shift.checkOutTime.split(":").map(Number);
        const shiftOutMs = eh * 60 + em;
        const actualOutMs = checkOutDt.getHours() * 60 + checkOutDt.getMinutes();
        overtimeMinutes = Math.max(0, actualOutMs - shiftOutMs);
      }
    }
  }

  const record = await prisma.attendance.create({
    data: {
      employeeId: body.employeeId,
      date: new Date(body.date),
      checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
      checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
      status: statusFinal,
      notes: body.notes,
      workHours: body.workHours ? parseFloat(body.workHours) : undefined,
      overtimeMinutes,
      workLocationId: body.workLocationId || null,
      checkInLocationId: body.checkInLocationId || null,
      checkOutLocationId: body.checkOutLocationId || null,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
