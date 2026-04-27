import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  // الموظف يشوف وثائقه فقط
  if (!["hr", "admin"].includes(session.role) && session.employeeId !== id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const docs = await prisma.document.findMany({
    where: { employeeId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  // HR/Admin يرفعون لأي موظف، الموظف يرفع لنفسه فقط
  if (!["hr", "admin"].includes(session.role) && session.employeeId !== id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const formData = await req.formData();

  const file     = formData.get("file") as File | null;
  const type     = (formData.get("type") as string)  || "other";
  const name     = (formData.get("name") as string)  || file?.name || "وثيقة";
  const expiry   = formData.get("expiryDate") as string | null;
  const notes    = formData.get("notes") as string | null;

  let fileUrl: string | null = null;

  if (file) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: "نوع غير مدعوم — صور أو PDF فقط" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "الحجم يجب ألا يتجاوز 10 ميجابايت" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    // Magic-byte verification
    const { verifyFileSignature } = await import("@/lib/file-validation");
    if (!verifyFileSignature(buffer, file.type, file.name)) {
      return NextResponse.json({ error: "محتوى الملف لا يطابق نوعه" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase().slice(0, 8) || ".bin";
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "documents");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), buffer);
    fileUrl = `/uploads/documents/${fileName}`;
  }

  const doc = await prisma.document.create({
    data: {
      employeeId: id,
      type,
      name,
      fileUrl,
      expiryDate: expiry ? new Date(expiry) : null,
      notes: notes || null,
    },
  });
  return NextResponse.json(doc, { status: 201 });
}
