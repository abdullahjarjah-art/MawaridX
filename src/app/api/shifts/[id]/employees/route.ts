import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/shifts/[id]/employees — تعيين موظف للشيفت
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: shiftId } = await params;
  const { employeeId } = await req.json();
  if (!employeeId) return NextResponse.json({ error: "employeeId مطلوب" }, { status: 400 });

  // إزالة الموظف من أي شيفت آخر حالي أولاً
  await prisma.employeeShift.updateMany({
    where: { employeeId, endDate: null },
    data: { endDate: new Date() },
  });

  // تعيين للشيفت الجديد
  const link = await prisma.employeeShift.upsert({
    where: { employeeId_shiftId: { employeeId, shiftId } },
    update: { endDate: null, startDate: new Date() },
    create: { employeeId, shiftId },
  });
  return NextResponse.json(link, { status: 201 });
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
