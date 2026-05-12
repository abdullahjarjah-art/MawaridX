import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const folders = await prisma.folder.findMany({
    include: { children: true, _count: { select: { documents: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "hr"].includes(session.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  const folder = await prisma.folder.create({
    data: {
      name: body.name.trim(),
      parentId: body.parentId || null,
      color: body.color || "#6b7280",
      createdBy: session.userId,
    },
  });
  return NextResponse.json(folder, { status: 201 });
}
