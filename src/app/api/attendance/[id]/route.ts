import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcWorkHours } from "@/lib/attendance-settings";

/** جلب دقائق الاستراحة من شيفت الموظف */
async function getBreakMinutes(employeeId: string): Promise<number> {
  const empShift = await prisma.employeeShift.findFirst({
    where: { employeeId, endDate: null },
    select: { shift: { select: { breakMinutes: true } } },
  });
  return empShift?.shift?.breakMinutes ?? 0;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // جلب السجل الحالي لاستخدامه عند الحساب
  const existing = await prisma.attendance.findUnique({
    where: { id },
    select: { employeeId: true, checkIn: true, checkOut: true },
  });
  if (!existing) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  // ── الموظف: يُسمح له فقط بتسجيل انصرافه الخاص ──
  if (!["hr", "admin"].includes(session.role)) {
    const emp = await prisma.employee.findFirst({ where: { userId: session.userId }, select: { id: true } });
    if (!emp || existing.employeeId !== emp.id) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const checkOutDt = body.checkOut ? new Date(body.checkOut) : null;
    const checkInDt  = existing.checkIn;

    if (checkOutDt && checkInDt && checkOutDt <= checkInDt) {
      return NextResponse.json({ error: "وقت الخروج يجب أن يكون بعد وقت الدخول" }, { status: 400 });
    }

    let workHours: number | undefined;
    if (checkOutDt && checkInDt) {
      const breakMins = await getBreakMinutes(existing.employeeId);
      workHours = calcWorkHours(checkInDt, checkOutDt, breakMins) ?? undefined;
    }

    const record = await prisma.attendance.update({
      where: { id },
      data: {
        checkOut: checkOutDt ?? undefined,
        workHours,
        checkOutLocationId: body.checkOutLocationId || null,
      },
    });
    return NextResponse.json(record);
  }

  // ── HR/Admin: تعديل كامل ──
  const newCheckIn  = body.checkIn  ? new Date(body.checkIn)  : existing.checkIn;
  const newCheckOut = body.checkOut ? new Date(body.checkOut) : existing.checkOut;

  // التحقق من ترتيب الأوقات
  if (newCheckIn && newCheckOut && newCheckOut <= newCheckIn) {
    return NextResponse.json({ error: "وقت الخروج يجب أن يكون بعد وقت الدخول" }, { status: 400 });
  }

  // حساب ساعات العمل تلقائياً
  let workHours: number | undefined;
  if (newCheckIn && newCheckOut) {
    const breakMins = await getBreakMinutes(existing.employeeId);
    workHours = calcWorkHours(newCheckIn, newCheckOut, breakMins) ?? undefined;
  }

  const record = await prisma.attendance.update({
    where: { id },
    data: {
      status:    body.status,
      checkIn:   body.checkIn  ? newCheckIn  : undefined,
      checkOut:  body.checkOut ? newCheckOut : undefined,
      notes:     body.notes,
      workHours,                   // دائماً محسوب تلقائياً
      checkInLocationId:  body.checkInLocationId  !== undefined ? (body.checkInLocationId  || null) : undefined,
      checkOutLocationId: body.checkOutLocationId !== undefined ? (body.checkOutLocationId || null) : undefined,
    },
  });
  return NextResponse.json(record);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  await prisma.attendance.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
