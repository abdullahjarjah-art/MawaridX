import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
