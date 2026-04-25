import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH — تحديث القيمة الحالية لـ Key Result
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; krId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { krId } = await params;
  const body = await req.json();
  const kr = await prisma.keyResult.update({
    where: { id: krId },
    data: {
      title: body.title,
      currentValue: body.currentValue !== undefined ? Number(body.currentValue) : undefined,
      targetValue: body.targetValue !== undefined ? Number(body.targetValue) : undefined,
      unit: body.unit,
    },
  });
  return NextResponse.json(kr);
}

// DELETE — حذف Key Result
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; krId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { krId } = await params;
  await prisma.keyResult.delete({ where: { id: krId } });
  return NextResponse.json({ message: "تم الحذف" });
}
