import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateSaudization, NITAQAT_BANDS } from "@/lib/saudization";

// GET /api/saudization — إحصائيات السعودة
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const stats = await calculateSaudization();
  return NextResponse.json({ ...stats, bands: NITAQAT_BANDS });
}

// POST /api/saudization — تحديث النطاق المستهدف
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { targetBand } = await req.json();
  if (!NITAQAT_BANDS.some(b => b.id === targetBand)) {
    return NextResponse.json({ error: "نطاق غير صالح" }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key: "saudization_target" },
    update: { value: targetBand },
    create: { key: "saudization_target", value: targetBand },
  });
  return NextResponse.json({ success: true });
}
