import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PUT /api/shifts/[id] — تعديل شيفت
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      name: body.name,
      checkInTime: body.checkInTime,
      checkOutTime: body.checkOutTime,
      breakMinutes: Number(body.breakMinutes ?? 60),
      workDays: body.workDays,
      color: body.color,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    },
  });
  return NextResponse.json(shift);
}

// DELETE /api/shifts/[id] — حذف شيفت
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  // إلغاء تعيين الموظفين أولاً
  await prisma.employeeShift.deleteMany({ where: { shiftId: id } });
  await prisma.shift.delete({ where: { id } });
  return NextResponse.json({ message: "تم الحذف" });
}
