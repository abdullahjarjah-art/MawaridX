import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, date, type } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (date) {
    const d = new Date(date);
    data.date = d;
    data.year = d.getFullYear();
  }
  if (type) data.type = type;

  const updated = await prisma.holiday.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  await prisma.holiday.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
