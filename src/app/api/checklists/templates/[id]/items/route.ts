import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST — إضافة مهمة للقالب
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: templateId } = await params;
  const { title, assignedTo } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });

  const count = await prisma.checklistTemplateItem.count({ where: { templateId } });
  const item = await prisma.checklistTemplateItem.create({
    data: { templateId, title: title.trim(), assignedTo: assignedTo ?? "hr", order: count + 1 },
  });
  return NextResponse.json(item, { status: 201 });
}

// DELETE — حذف مهمة من القالب
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId مطلوب" }, { status: 400 });

  await prisma.checklistTemplateItem.delete({ where: { id: itemId } });
  return NextResponse.json({ message: "تم الحذف" });
}
