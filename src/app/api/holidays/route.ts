import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── بيانات العطل الرسمية السعودية حسب السنة ──
// الثابتة: رأس السنة (1 يناير)، التأسيس (22 فبراير)، الوطني (23 سبتمبر)
// المتغيرة: الفطر والأضحى — تعتمد على رؤية الهلال وتختلف كل سنة
const SAUDI_HOLIDAYS: Record<number, { name: string; date: string; type: string }[]> = {
  2024: [
    { name: "رأس السنة الميلادية",          date: "2024-01-01", type: "official"  },
    { name: "يوم التأسيس",                  date: "2024-02-22", type: "national"  },
    { name: "عيد الفطر (اليوم الأول)",      date: "2024-04-10", type: "religious" },
    { name: "عيد الفطر (اليوم الثاني)",     date: "2024-04-11", type: "religious" },
    { name: "عيد الفطر (اليوم الثالث)",     date: "2024-04-12", type: "religious" },
    { name: "يوم عرفة",                     date: "2024-06-15", type: "religious" },
    { name: "عيد الأضحى (اليوم الأول)",     date: "2024-06-16", type: "religious" },
    { name: "عيد الأضحى (اليوم الثاني)",    date: "2024-06-17", type: "religious" },
    { name: "عيد الأضحى (اليوم الثالث)",    date: "2024-06-18", type: "religious" },
    { name: "اليوم الوطني السعودي",          date: "2024-09-23", type: "national"  },
  ],
  2025: [
    { name: "رأس السنة الميلادية",          date: "2025-01-01", type: "official"  },
    { name: "يوم التأسيس",                  date: "2025-02-22", type: "national"  },
    { name: "عيد الفطر (اليوم الأول)",      date: "2025-03-30", type: "religious" },
    { name: "عيد الفطر (اليوم الثاني)",     date: "2025-03-31", type: "religious" },
    { name: "عيد الفطر (اليوم الثالث)",     date: "2025-04-01", type: "religious" },
    { name: "يوم عرفة",                     date: "2025-06-05", type: "religious" },
    { name: "عيد الأضحى (اليوم الأول)",     date: "2025-06-06", type: "religious" },
    { name: "عيد الأضحى (اليوم الثاني)",    date: "2025-06-07", type: "religious" },
    { name: "عيد الأضحى (اليوم الثالث)",    date: "2025-06-08", type: "religious" },
    { name: "اليوم الوطني السعودي",          date: "2025-09-23", type: "national"  },
  ],
  2026: [
    { name: "رأس السنة الميلادية",          date: "2026-01-01", type: "official"  },
    { name: "يوم التأسيس",                  date: "2026-02-22", type: "national"  },
    { name: "عيد الفطر (اليوم الأول)",      date: "2026-03-20", type: "religious" },
    { name: "عيد الفطر (اليوم الثاني)",     date: "2026-03-21", type: "religious" },
    { name: "عيد الفطر (اليوم الثالث)",     date: "2026-03-22", type: "religious" },
    { name: "يوم عرفة",                     date: "2026-05-26", type: "religious" },
    { name: "عيد الأضحى (اليوم الأول)",     date: "2026-05-27", type: "religious" },
    { name: "عيد الأضحى (اليوم الثاني)",    date: "2026-05-28", type: "religious" },
    { name: "عيد الأضحى (اليوم الثالث)",    date: "2026-05-29", type: "religious" },
    { name: "اليوم الوطني السعودي",          date: "2026-09-23", type: "national"  },
  ],
};

/** عطل ثابتة لأي سنة غير مسجّلة (الوطني + التأسيس + رأس السنة فقط) */
function getFixedHolidays(year: number) {
  return [
    { name: "رأس السنة الميلادية", date: `${year}-01-01`, type: "official" },
    { name: "يوم التأسيس",         date: `${year}-02-22`, type: "national" },
    { name: "اليوم الوطني السعودي", date: `${year}-09-23`, type: "national" },
  ];
}

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

    const list = SAUDI_HOLIDAYS[year] ?? getFixedHolidays(year);
    const created = await prisma.holiday.createMany({
      data: list.map(h => ({
        name: h.name,
        date: new Date(h.date),
        type: h.type,
        year,
      })),
    });
    const note = SAUDI_HOLIDAYS[year] ? undefined : "تنبيه: عطل الفطر والأضحى لهذه السنة غير متوفرة — أضفها يدوياً";
    return NextResponse.json({ success: true, count: created.count, note });
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
