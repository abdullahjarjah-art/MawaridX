import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { verifyFileSignature } from "@/lib/file-validation";

const KEY = "branding";
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — رُفع الحد لاستيعاب PDF

// ──────────────────────────────────────────────────────────
// POST /api/settings/branding/logo — رفع شعار الشركة
// ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل هذه الإعدادات" }, { status: 403 });
  }
  if (!hasFeature("customBranding")) {
    return NextResponse.json({ error: "تخصيص الهوية البصرية غير متاح في الخطة الحالية" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق شعار" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "صيغة الشعار يجب أن تكون PNG أو JPEG أو WebP أو SVG أو PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "حجم الشعار يجب ألا يتجاوز 2 ميجابايت" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // التحقق من محتوى الملف حسب نوعه
  if (file.type === "image/svg+xml") {
    // فحص خفيف لـ SVG — يجب يبدأ بـ <svg أو <?xml
    const head = buffer.subarray(0, 200).toString("utf8").trim().toLowerCase();
    if (!head.startsWith("<svg") && !head.startsWith("<?xml")) {
      return NextResponse.json({ error: "ملف SVG غير صالح" }, { status: 400 });
    }
    if (head.includes("<script")) {
      return NextResponse.json({ error: "SVG يحتوي على محتوى غير آمن" }, { status: 400 });
    }
  } else if (file.type === "application/pdf") {
    // PDF magic bytes: %PDF-
    const sig = buffer.subarray(0, 5).toString("ascii");
    if (sig !== "%PDF-") {
      return NextResponse.json({ error: "محتوى الملف لا يطابق نوع PDF" }, { status: 400 });
    }
  } else {
    if (!verifyFileSignature(buffer, file.type, file.name)) {
      return NextResponse.json({ error: "محتوى الملف لا يطابق نوعه" }, { status: 400 });
    }
  }

  const ext =
    file.type === "image/png"      ? ".png"  :
    file.type === "image/jpeg"     ? ".jpg"  :
    file.type === "image/webp"     ? ".webp" :
    file.type === "application/pdf"? ".pdf"  :
                                     ".svg";
  const fileName = `logo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "branding");
  const logoUrl = `/uploads/branding/${fileName}`;

  // قراءة DB ورفع الملف بالتوازي — يوفر رحلة كاملة
  const [, existingRow] = await Promise.all([
    mkdir(dir, { recursive: true }).then(() => writeFile(path.join(dir, fileName), buffer)),
    prisma.setting.findUnique({ where: { key: KEY } }),
  ]);

  const current = existingRow ? (JSON.parse(existingRow.value) as Record<string, unknown>) : {};

  // حذف الشعار القديم وتحديث الـ DB بالتوازي
  const oldLogoUrl = current.logoUrl as string | undefined;
  await Promise.all([
    oldLogoUrl?.startsWith("/uploads/branding/")
      ? unlink(path.join(process.cwd(), "public", oldLogoUrl)).catch(() => {})
      : Promise.resolve(),
    prisma.setting.upsert({
      where:  { key: KEY },
      update: { value: JSON.stringify({ ...current, logoUrl }) },
      create: { key: KEY, value: JSON.stringify({ logoUrl }) },
    }),
  ]);

  return NextResponse.json({ success: true, logoUrl });
}

// ──────────────────────────────────────────────────────────
// DELETE — حذف الشعار الحالي
// ──────────────────────────────────────────────────────────
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const existing = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!existing) return NextResponse.json({ success: true });

  const current = JSON.parse(existing.value) as { logoUrl?: string };
  if (current.logoUrl?.startsWith("/uploads/branding/")) {
    const oldPath = path.join(process.cwd(), "public", current.logoUrl);
    await unlink(oldPath).catch(() => {});
  }

  const updated = { ...current, logoUrl: null };
  await prisma.setting.update({
    where: { key: KEY },
    data:  { value: JSON.stringify(updated) },
  });

  return NextResponse.json({ success: true });
}
