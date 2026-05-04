import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── GET: مستند واحد ───
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const doc = await prisma.companyDocument.findUnique({
    where: { id },
    include: {
      downloads: {
        orderBy: { downloadedAt: "desc" },
        take: 20,
        select: { id: true, employeeId: true, employeeName: true, downloadedAt: true },
      },
    },
  });
  if (!doc) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(doc);
}

// ─── PUT: تعديل مستند (HR / admin) ───
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.role !== "hr" && session.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const doc = await prisma.companyDocument.update({
    where: { id },
    data: {
      title:            body.title?.trim(),
      description:      body.description || null,
      category:         body.category,
      fileUrl:          body.fileUrl    || null,
      fileName:         body.fileName   || null,
      fileSize:         body.fileSize   ? parseInt(body.fileSize) : null,
      fileType:         body.fileType   || null,
      accessLevel:      body.accessLevel,
      accessDepts:      body.accessDepts      ? JSON.stringify(body.accessDepts)      : null,
      accessEmployeeIds: body.accessEmployeeIds ? JSON.stringify(body.accessEmployeeIds) : null,
      expiryDate:       body.expiryDate  ? new Date(body.expiryDate) : null,
      notifyDaysBefore: body.notifyDaysBefore ? parseInt(body.notifyDaysBefore) : 30,
      isActive:         body.isActive !== undefined ? body.isActive : true,
    },
  });
  return NextResponse.json(doc);
}

// ─── DELETE: حذف مستند (HR / admin) ───
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.role !== "hr" && session.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.companyDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// ─── POST ?action=download: تسجيل تحميل ───
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await prisma.companyDocumentDownload.create({
    data: {
      documentId:   id,
      employeeId:   body.employeeId   || session.userId,
      employeeName: body.employeeName || null,
    },
  });
  return NextResponse.json({ success: true });
}
