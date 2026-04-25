import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBackup, listBackups, deleteBackup } from "@/lib/backup";

// ── GET /api/admin/backup — قائمة النسخ ──
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const backups = listBackups().map(b => ({
    name: b.name,
    sizeBytes: b.sizeBytes,
    createdAt: b.createdAt.toISOString(),
  }));
  return NextResponse.json(backups);
}

// ── POST /api/admin/backup — إنشاء نسخة ──
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const name = createBackup();
    return NextResponse.json({ name, message: "تمت النسخة الاحتياطية بنجاح" }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "فشل إنشاء النسخة" }, { status: 500 });
  }
}

// ── DELETE /api/admin/backup?name=... — حذف نسخة ──
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const name = new URL(req.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "اسم الملف مطلوب" }, { status: 400 });

  const ok = deleteBackup(name);
  if (!ok) return NextResponse.json({ error: "الملف غير موجود أو اسم غير صالح" }, { status: 404 });
  return NextResponse.json({ message: "تم الحذف" });
}
