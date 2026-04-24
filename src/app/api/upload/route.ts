import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// رفع مرفقات (مرضية، طلبات...)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "general";

  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم — يُسمح فقط بالصور وملفات PDF" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "حجم الملف يجب ألا يتجاوز 5 ميجابايت" }, { status: 400 });
  }

  // اسم آمن للمجلد
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "general";
  const ext = path.extname(file.name).toLowerCase().slice(0, 8) || "";
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, fileName), buffer);

  const url = `/uploads/${safeFolder}/${fileName}`;
  return NextResponse.json({ url, name: file.name, size: file.size, type: file.type });
}
