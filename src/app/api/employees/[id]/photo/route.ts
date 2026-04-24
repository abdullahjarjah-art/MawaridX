import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  // السماح للموظف برفع صورته فقط، والـ hr/admin يرفع لأي موظف
  if (!["hr", "admin"].includes(session.role) && session.employeeId !== id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق صورة" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "يُسمح فقط بصور JPEG أو PNG أو WebP" }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "حجم الصورة يجب ألا يتجاوز 3 ميجابايت" }, { status: 400 });

  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  const photoUrl = `/uploads/avatars/${fileName}`;
  await prisma.employee.update({ where: { id }, data: { photo: photoUrl } });

  return NextResponse.json({ photo: photoUrl });
}
