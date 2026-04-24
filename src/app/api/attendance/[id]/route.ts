import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // الموظف يسمح له فقط بتسجيل انصرافه الخاص
  if (!["hr", "admin"].includes(session.role)) {
    const emp = await prisma.employee.findFirst({ where: { userId: session.userId }, select: { id: true } });
    const att = await prisma.attendance.findUnique({ where: { id }, select: { employeeId: true } });
    if (!emp || att?.employeeId !== emp.id) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const record = await prisma.attendance.update({
      where: { id },
      data: {
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
        workHours: body.workHours ? parseFloat(body.workHours) : undefined,
        checkOutLocationId: body.checkOutLocationId || null,
      },
    });
    return NextResponse.json(record);
  }

  // HR/Admin: تعديل كامل
  const record = await prisma.attendance.update({
    where: { id },
    data: {
      status: body.status,
      checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
      checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
      notes: body.notes,
      workHours: body.workHours ? parseFloat(body.workHours) : undefined,
      checkInLocationId: body.checkInLocationId !== undefined ? (body.checkInLocationId || null) : undefined,
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
