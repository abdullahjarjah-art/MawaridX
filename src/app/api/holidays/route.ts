import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const SAUDI_HOLIDAYS_2025 = [
  { name: "رأس السنة الميلادية", date: "2025-01-01", type: "official" },
  { name: "يوم التأسيس", date: "2025-02-22", type: "national" },
  { name: "عيد الفطر (اليوم الأول)", date: "2025-03-30", type: "religious" },
  { name: "عيد الفطر (اليوم الثاني)", date: "2025-03-31", type: "religious" },
  { name: "عيد الفطر (اليوم الثالث)", date: "2025-04-01", type: "religious" },
  { name: "يوم عرفة", date: "2025-06-05", type: "religious" },
  { name: "عيد الأضحى (اليوم الأول)", date: "2025-06-06", type: "religious" },
  { name: "عيد الأضحى (اليوم الثاني)", date: "2025-06-07", type: "religious" },
  { name: "عيد الأضحى (اليوم الثالث)", date: "2025-06-08", type: "religious" },
  { name: "اليوم الوطني السعودي", date: "2025-09-23", type: "national" },
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : new Date().getFullYear();

  const holidays = await prisma.holiday.findMany({
    where: { year },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();

  // استيراد العطل الافتراضية للسنة
  if (body.importDefaults) {
    const year = body.year ?? new Date().getFullYear();
    const existing = await prisma.holiday.count({ where: { year } });
    if (existing > 0) return NextResponse.json({ error: "العطل لهذه السنة موجودة مسبقاً" }, { status: 409 });

    const created = await prisma.holiday.createMany({
      data: SAUDI_HOLIDAYS_2025.map(h => ({
        name: h.name,
        date: new Date(h.date),
        type: h.type,
        year,
      })),
    });
    return NextResponse.json({ success: true, count: created.count });
  }

  const { name, date, type } = body;
  if (!name || !date) return NextResponse.json({ error: "الاسم والتاريخ مطلوبان" }, { status: 400 });

  const d = new Date(date);
  const holiday = await prisma.holiday.create({
    data: { name, date: d, type: type ?? "official", year: d.getFullYear() },
  });

  return NextResponse.json(holiday, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await req.json();
  await prisma.holiday.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
