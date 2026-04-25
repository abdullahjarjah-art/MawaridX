import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST — إضافة Key Result جديد لهدف موجود
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: objectiveId } = await params;
  const body = await req.json();
  if (!body.title?.trim() || body.targetValue === undefined)
    return NextResponse.json({ error: "العنوان والقيمة المستهدفة مطلوبان" }, { status: 400 });

  const kr = await prisma.keyResult.create({
    data: {
      objectiveId,
      title: body.title.trim(),
      unit: body.unit || null,
      startValue: Number(body.startValue ?? 0),
      targetValue: Number(body.targetValue),
      currentValue: Number(body.currentValue ?? 0),
    },
  });
  return NextResponse.json(kr, { status: 201 });
}
