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

// ── جلب العطل الدينية من تقويم أم القرى الرسمي (Aladhan / HJCoSA) ──
// المصدر: api.aladhan.com — يستخدم نفس طريقة حساب المملكة العربية السعودية (HJCoSA)
type AladhanDay = {
  hijri: { day: string; month: { number: number }; year: string };
  gregorian: { date: string; year: string };
};

async function fetchHijriMonth(month: number, hYear: number): Promise<AladhanDay[]> {
  const url = `https://api.aladhan.com/v1/hToGCalendar/${month}/${hYear}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Aladhan ${month}/${hYear}: ${r.status}`);
  const j = await r.json();
  return j?.data ?? [];
}

/** يحوّل "DD-MM-YYYY" إلى "YYYY-MM-DD" */
function gToIso(d: string): string {
  const [dd, mm, yyyy] = d.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

/** يجلب العطل السعودية من المصدر الرسمي + يضيف العطل الثابتة الميلادية. */
async function fetchSaudiHolidaysFromSource(gYear: number) {
  const list: { name: string; date: string; type: string }[] = [];
  list.push(...getFixedHolidays(gYear));

  // السنة الهجرية تقريبًا = الميلادية − 579. نجلب H و H+1 لتغطية السنة الميلادية كاملة.
  const baseH = gYear - 579;
  const hijriYears = [baseH, baseH + 1];

  // اجلب شوّال (شهر 10) وذو الحجة (شهر 12) لكلتا السنتين، بالتوازي.
  const tasks = hijriYears.flatMap(h => [
    fetchHijriMonth(10, h).catch(() => [] as AladhanDay[]),
    fetchHijriMonth(12, h).catch(() => [] as AladhanDay[]),
  ]);
  const results = await Promise.all(tasks);

  for (let i = 0; i < hijriYears.length; i++) {
    const shawwal   = results[i * 2];
    const dhuHijjah = results[i * 2 + 1];

    // عيد الفطر: 1, 2, 3 شوّال
    for (const day of [1, 2, 3]) {
      const rec = shawwal.find(d => Number(d.hijri.day) === day);
      if (rec && Number(rec.gregorian.year) === gYear) {
        list.push({
          name: `عيد الفطر (اليوم ${day === 1 ? "الأول" : day === 2 ? "الثاني" : "الثالث"})`,
          date: gToIso(rec.gregorian.date),
          type: "religious",
        });
      }
    }

    // يوم عرفة (9) + عيد الأضحى (10, 11, 12)
    const adhaMap: Record<number, string> = {
      9:  "يوم عرفة",
      10: "عيد الأضحى (اليوم الأول)",
      11: "عيد الأضحى (اليوم الثاني)",
      12: "عيد الأضحى (اليوم الثالث)",
    };
    for (const day of [9, 10, 11, 12]) {
      const rec = dhuHijjah.find(d => Number(d.hijri.day) === day);
      if (rec && Number(rec.gregorian.year) === gYear) {
        list.push({
          name: adhaMap[day],
          date: gToIso(rec.gregorian.date),
          type: "religious",
        });
      }
    }
  }

  // إزالة المكرر + ترتيب
  const uniq = new Map<string, { name: string; date: string; type: string }>();
  for (const h of list) uniq.set(`${h.date}|${h.name}`, h);
  return [...uniq.values()].sort((a, b) => a.date.localeCompare(b.date));
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

    // المصدر الرسمي: تقويم أم القرى عبر Aladhan (HJCoSA)
    let source: "umm-al-qura" | "fallback-static" | "fallback-fixed" = "umm-al-qura";
    let list: { name: string; date: string; type: string }[];
    try {
      list = await fetchSaudiHolidaysFromSource(year);
      // إذا لم يرجع المصدر أي عطل دينية (انقطاع، حظر)، نسقط على البيانات الثابتة المسجلة
      const hasReligious = list.some(h => h.type === "religious");
      if (!hasReligious) throw new Error("no religious holidays returned");
    } catch {
      if (SAUDI_HOLIDAYS[year]) {
        list = SAUDI_HOLIDAYS[year];
        source = "fallback-static";
      } else {
        list = getFixedHolidays(year);
        source = "fallback-fixed";
      }
    }

    const created = await prisma.holiday.createMany({
      data: list.map(h => ({
        name: h.name,
        date: new Date(h.date),
        type: h.type,
        year,
      })),
    });
    const note =
      source === "umm-al-qura"     ? "تم الجلب من تقويم أم القرى الرسمي" :
      source === "fallback-static" ? "تنبيه: تعذّر الاتصال بالمصدر — تم استخدام بيانات مخزّنة لهذه السنة" :
                                     "تنبيه: تعذّر جلب عطل الفطر والأضحى — أضفها يدوياً";
    return NextResponse.json({ success: true, count: created.count, source, note });
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
