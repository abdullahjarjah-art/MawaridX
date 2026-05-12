import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year + 1, 0, 1);

  // ── تشغيل كل الاستعلامات بالتوازي ──
  const [
    attendanceByStatus,
    workHoursByMonth,
    attendanceLateCheckIns,
    salaryRows,
    requestRows,
    totalEmployees,
    departments,
    employeesByDept,
  ] = await Promise.all([

    // حضور: تجميع حسب (شهر + حالة) مباشرة في الداتابيس بدل جلب كل السجلات
    prisma.$queryRaw<{ month: number; status: string; cnt: number }[]>`
      SELECT
        CAST(strftime('%m', date) AS INTEGER) AS month,
        status,
        COUNT(*) AS cnt
      FROM "Attendance"
      WHERE date >= ${yearStart.toISOString()} AND date < ${yearEnd.toISOString()}
      GROUP BY month, status
    `,

    // ساعات العمل: مجموع ساعات وأوفرتايم لكل شهر
    prisma.$queryRaw<{ month: number; totalHours: number; totalOvertime: number }[]>`
      SELECT
        CAST(strftime('%m', date) AS INTEGER) AS month,
        ROUND(SUM(COALESCE(workHours, 0)), 1) AS totalHours,
        ROUND(SUM(COALESCE(overtimeMinutes, 0)) / 60.0, 1) AS totalOvertime
      FROM "Attendance"
      WHERE date >= ${yearStart.toISOString()} AND date < ${yearEnd.toISOString()}
        AND workHours IS NOT NULL
      GROUP BY month
    `,

    // تأخير: مجموع دقائق التأخير لكل شهر (فقط checkIn بعد 08:00)
    prisma.$queryRaw<{ month: number; lateMins: number }[]>`
      SELECT
        CAST(strftime('%m', date) AS INTEGER) AS month,
        SUM(
          MAX(0,
            (CAST(strftime('%H', checkIn) AS INTEGER) * 60 +
             CAST(strftime('%M', checkIn) AS INTEGER)) - 480
          )
        ) AS lateMins
      FROM "Attendance"
      WHERE
        date >= ${yearStart.toISOString()} AND date < ${yearEnd.toISOString()}
        AND status = 'late'
        AND checkIn IS NOT NULL
      GROUP BY month
    `,

    // رواتب: تجميع حسب (شهر + حالة)
    prisma.salary.groupBy({
      by: ["month", "status"],
      where: { year },
      _sum: { netSalary: true },
      _count: true,
    }),

    // طلبات: تجميع حسب (نوع + حالة)
    prisma.request.groupBy({
      by: ["type", "status"],
      where: { createdAt: { gte: yearStart, lt: yearEnd } },
      _count: true,
    }),

    prisma.employee.count({ where: { status: "active" } }),
    prisma.department.findMany({ select: { name: true } }),
    prisma.employee.groupBy({
      by: ["department"],
      where: { status: "active" },
      _count: true,
    }),
  ]);

  // ── بناء attendanceByMonth من النتائج المجمّعة ──
  const lateMap = new Map(attendanceLateCheckIns.map(r => [r.month, Number(r.lateMins) || 0]));

  const workHoursMap = new Map(workHoursByMonth.map(r => [Number(r.month), { hours: Number(r.totalHours) || 0, overtime: Number(r.totalOvertime) || 0 }]));

  const attendanceByMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const rows = attendanceByStatus.filter(r => Number(r.month) === m);
    const get = (s: string) => Number(rows.find(r => r.status === s)?.cnt ?? 0);
    const wh = workHoursMap.get(m) ?? { hours: 0, overtime: 0 };
    return {
      month: m,
      present:       get("present"),
      late:          get("late"),
      absent:        get("absent"),
      total:         rows.reduce((sum, r) => sum + Number(r.cnt), 0),
      lateMins:      lateMap.get(m) ?? 0,
      totalHours:    wh.hours,
      overtimeHours: wh.overtime,
    };
  });

  // ── بناء salaryByMonth ──
  const salaryByMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const rows = salaryRows.filter(r => r.month === m);
    const totalNet = rows.reduce((sum, r) => sum + (r._sum.netSalary ?? 0), 0);
    const count    = rows.reduce((sum, r) => sum + r._count, 0);
    const paid     = rows.find(r => r.status === "paid")?._count ?? 0;
    return { month: m, totalNet, count, paid };
  });

  // ── بناء requestsByType ──
  const requestsByType: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
  for (const r of requestRows) {
    if (!requestsByType[r.type]) requestsByType[r.type] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    requestsByType[r.type].total += r._count;
    if (r.status === "approved")       requestsByType[r.type].approved += r._count;
    else if (r.status === "rejected")  requestsByType[r.type].rejected += r._count;
    else                               requestsByType[r.type].pending  += r._count;
  }

  return NextResponse.json({
    attendanceByMonth,
    salaryByMonth,
    requestsByType,
    totalEmployees,
    departments: departments.map(d => d.name),
    employeesByDept: employeesByDept.map(e => ({ department: e.department ?? "غير محدد", count: e._count })),
  });
}
