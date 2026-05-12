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
      files: true,
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

  await prisma.companyDocument.update({
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
      folderId:         body.folderId !== undefined ? (body.folderId || null) : undefined,
    },
  });

  // Handle files update
  if (Array.isArray(body.files)) {
    // Delete all existing files and re-create (simplest approach)
    await prisma.companyDocumentFile.deleteMany({ where: { documentId: id } });
    if (body.files.length > 0) {
      await prisma.companyDocumentFile.createMany({
        data: body.files.map((f: { url: string; name: string; size?: number; fileType?: string }) => ({
          documentId: id,
          fileUrl: f.url,
          fileName: f.name,
          fileSize: f.size ? parseInt(String(f.size)) : null,
          fileType: f.fileType || null,
        })),
      });
    }
  }
  const docWithFiles = await prisma.companyDocument.findUnique({
    where: { id },
    include: { files: true },
  });
  return NextResponse.json(docWithFiles);
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
