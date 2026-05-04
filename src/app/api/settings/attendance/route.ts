import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const KEY = "attendance_settings";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const s = await prisma.setting.findUnique({ where: { key: KEY } });
    if (!s) return NextResponse.json({
      type: "fixed",
      checkInTime: "08:00",
      checkOutTime: "17:00",
      requiredHours: 8,
      lateToleranceMinutes: 15,
    });
    return NextResponse.json(JSON.parse(s.value));
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = await req.json();
    await prisma.setting.upsert({
      where: { key: KEY },
      update: { value: JSON.stringify(body) },
      create: { key: KEY, value: JSON.stringify(body) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
