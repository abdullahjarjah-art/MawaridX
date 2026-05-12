import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["admin", "hr"].includes(session.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const folder = await prisma.folder.update({
    where: { id },
    data: {
      name:     body.name     !== undefined ? body.name.trim()  : undefined,
      color:    body.color    !== undefined ? body.color        : undefined,
      parentId: body.parentId !== undefined ? (body.parentId || null) : undefined,
    },
  });
  return NextResponse.json(folder);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["admin", "hr"].includes(session.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await params;
  // Move documents in this folder to root before deleting
  await prisma.companyDocument.updateMany({ where: { folderId: id }, data: { folderId: null } });
  // Move child folders to root
  await prisma.folder.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
