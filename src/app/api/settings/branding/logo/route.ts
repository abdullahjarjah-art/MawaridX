import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { verifyFileSignature } from "@/lib/file-validation";

const KEY = "branding";
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — شعارات أقل من هذا

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
    return NextResponse.json({ error: "صيغة الشعار يجب أن تكون PNG أو JPEG أو WebP أو SVG" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "حجم الشعار يجب ألا يتجاوز 2 ميجابايت" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // SVG لا يمتلك magic bytes ثابتة فنتجاهل التحقق منها
  if (file.type !== "image/svg+xml") {
    if (!verifyFileSignature(buffer, file.type, file.name)) {
      return NextResponse.json({ error: "محتوى الملف لا يطابق نوعه" }, { status: 400 });
    }
  } else {
    // فحص خفيف لـ SVG — يجب يبدأ بـ <svg أو <?xml
    const head = buffer.subarray(0, 200).toString("utf8").trim().toLowerCase();
    if (!head.startsWith("<svg") && !head.startsWith("<?xml")) {
      return NextResponse.json({ error: "ملف SVG غير صالح" }, { status: 400 });
    }
    // لا نسمح بـ scripts داخل SVG
    if (head.includes("<script")) {
      return NextResponse.json({ error: "SVG يحتوي على محتوى غير آمن" }, { status: 400 });
    }
  }

  const ext =
    file.type === "image/png"     ? ".png"  :
    file.type === "image/jpeg"    ? ".jpg"  :
    file.type === "image/webp"    ? ".webp" :
                                    ".svg";
  const fileName = `logo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "branding");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  const logoUrl = `/uploads/branding/${fileName}`;

  // حذف الشعار القديم لو موجود
  try {
    const existing = await prisma.setting.findUnique({ where: { key: KEY } });
    if (existing) {
      const old = JSON.parse(existing.value) as { logoUrl?: string };
      if (old.logoUrl?.startsWith("/uploads/branding/")) {
        const oldPath = path.join(process.cwd(), "public", old.logoUrl);
        await unlink(oldPath).catch(() => {});
      }
    }
  } catch { /* ignore */ }

  // تحديث الـ branding setting
  const existing = await prisma.setting.findUnique({ where: { key: KEY } });
  const current = existing ? JSON.parse(existing.value) : {};
  const updated = { ...current, logoUrl };

  await prisma.setting.upsert({
    where:  { key: KEY },
    update: { value: JSON.stringify(updated) },
    create: { key: KEY, value: JSON.stringify(updated) },
  });

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
