import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readBackup } from "@/lib/backup";

// ── GET /api/admin/backup/download?name=... — تحميل نسخة ──
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const name = new URL(req.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "اسم الملف مطلوب" }, { status: 400 });

  const buf = readBackup(name);
  if (!buf) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(buf.length),
    },
  });
}
