import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// الموظف يوافق أو يرفض — أو الأدمن يعدّل
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const custody = await prisma.custody.findUnique({ where: { id } });
  if (!custody) return NextResponse.json({ error: "لم يتم العثور على العهدة" }, { status: 404 });

  // الموظف يوافق أو يرفض على عهدته فقط
  if (session.role === "employee") {
    if (custody.employeeId !== session.employeeId)
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    if (custody.status !== "pending")
      return NextResponse.json({ error: "العهدة لا يمكن تعديلها" }, { status: 400 });
    const updated = await prisma.custody.update({
      where: { id },
      data: {
        status: body.status, // approved | rejected
        employeeNote: body.employeeNote || null,
        approvedAt: body.status === "approved" ? new Date() : null,
      },
    });
    return NextResponse.json(updated);
  }

  // الأدمن / الحسابات يمكنه تعديل كل شيء
  const updated = await prisma.custody.update({
    where: { id },
    data: {
      type: body.type ?? custody.type,
      title: body.title ?? custody.title,
      description: body.description ?? custody.description,
      quantity: body.quantity != null ? parseFloat(body.quantity) : custody.quantity,
      unit: body.unit ?? custody.unit,
      status: body.status ?? custody.status,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.custody.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
