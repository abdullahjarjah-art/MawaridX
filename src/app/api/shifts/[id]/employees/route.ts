import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/shifts/[id]/employees — تعيين موظف للشيفت
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: shiftId } = await params;
  const body = await req.json();
  const { employeeId, customCheckInTime, customCheckOutTime, customBreakMinutes, exceptionNote } = body;
  if (!employeeId) return NextResponse.json({ error: "employeeId مطلوب" }, { status: 400 });

  // إزالة الموظف من أي شيفت آخر حالي أولاً
  await prisma.employeeShift.updateMany({
    where: { employeeId, endDate: null },
    data: { endDate: new Date() },
  });

  // تعيين للشيفت الجديد
  const link = await prisma.employeeShift.upsert({
    where: { employeeId_shiftId: { employeeId, shiftId } },
    update: {
      endDate: null,
      startDate: new Date(),
      customCheckInTime:  customCheckInTime  ?? null,
      customCheckOutTime: customCheckOutTime ?? null,
      customBreakMinutes: customBreakMinutes != null ? Number(customBreakMinutes) : null,
      exceptionNote:      exceptionNote      ?? null,
    },
    create: {
      employeeId,
      shiftId,
      customCheckInTime:  customCheckInTime  ?? null,
      customCheckOutTime: customCheckOutTime ?? null,
      customBreakMinutes: customBreakMinutes != null ? Number(customBreakMinutes) : null,
      exceptionNote:      exceptionNote      ?? null,
    },
  });
  return NextResponse.json(link, { status: 201 });
}

// PATCH /api/shifts/[id]/employees — تعديل استثناء موظف
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: shiftId } = await params;
  const body = await req.json();
  const { employeeId, customCheckInTime, customCheckOutTime, customBreakMinutes, exceptionNote } = body;
  if (!employeeId) return NextResponse.json({ error: "employeeId مطلوب" }, { status: 400 });

  const updated = await prisma.employeeShift.updateMany({
    where: { employeeId, shiftId, endDate: null },
    data: {
      customCheckInTime:  customCheckInTime  ?? null,
      customCheckOutTime: customCheckOutTime ?? null,
      customBreakMinutes: customBreakMinutes != null ? Number(customBreakMinutes) : null,
      exceptionNote:      exceptionNote      ?? null,
    },
  });
  return NextResponse.json({ success: true, count: updated.count });
}

// DELETE /api/shifts/[id]/employees?employeeId=... — إزالة موظف من الشيفت
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: shiftId } = await params;
  const employeeId = new URL(req.url).searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId مطلوب" }, { status: 400 });

  await prisma.employeeShift.updateMany({
    where: { employeeId, shiftId, endDate: null },
    data: { endDate: new Date() },
  });
  return NextResponse.json({ message: "تم الإزالة" });
}
