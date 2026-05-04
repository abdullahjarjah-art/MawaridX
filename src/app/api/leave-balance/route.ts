import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const year = Number(searchParams.get("year") || new Date().getFullYear());

  if (!employeeId) return NextResponse.json({ error: "employeeId مطلوب" }, { status: 400 });

  // جلب أو إنشاء رصيد الإجازات
  let balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_year: { employeeId, year } },
  });

  if (!balance) {
    // حساب الإجازات المستخدمة من الجدول
    const leaves = await prisma.leave.findMany({
      where: {
        employeeId,
        status: "approved",
        startDate: { gte: new Date(year, 0, 1) },
        endDate: { lt: new Date(year + 1, 0, 1) },
      },
      select: { type: true, days: true, attachmentUrl: true },
    });

    const usedAnnual = leaves.filter(l => l.type === "annual").reduce((s, l) => s + l.days, 0);
    // الإجازة المرضية مع عذر طبي مرفق لا تُخصم من الرصيد
    const usedSick = leaves.filter(l => l.type === "sick" && !l.attachmentUrl).reduce((s, l) => s + l.days, 0);
    const usedEmergency = leaves.filter(l => l.type === "emergency").reduce((s, l) => s + l.days, 0);

    balance = await prisma.leaveBalance.create({
      data: { employeeId, year, usedAnnual, usedSick, usedEmergency },
    });
  }

  return NextResponse.json(balance);
}

// تحديث الرصيد يدوياً (HR فقط)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { employeeId, year, annual, sick, emergency } = body;

  const balance = await prisma.leaveBalance.upsert({
    where: { employeeId_year: { employeeId, year: Number(year) } },
    update: {
      annual: annual !== undefined ? Number(annual) : undefined,
      sick: sick !== undefined ? Number(sick) : undefined,
      emergency: emergency !== undefined ? Number(emergency) : undefined,
    },
    create: {
      employeeId,
      year: Number(year),
      annual: Number(annual ?? 30),
      sick: Number(sick ?? 15),
      emergency: Number(emergency ?? 5),
    },
  });

  return NextResponse.json(balance);
}
