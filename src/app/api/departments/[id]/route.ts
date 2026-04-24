import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { id } = await params;
    const { name, description, managerId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
    const dept = await prisma.department.update({
      where: { id },
      data: { name: name.trim(), description: description?.trim() || null, managerId: managerId || null },
    });
    return NextResponse.json(dept);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "اسم القسم موجود مسبقاً" }, { status: 400 });
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { id } = await params;
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
