import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // حساب تاريخ بعد شهرين
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

  // آخر 7 أيام للرسم البياني
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // الشهر الحالي للرواتب
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [
    totalEmployees,
    activeEmployees,
    todayAttendance,
    pendingLeaves,
    pendingRequests,
    recentEmployees,
    pendingRequestsList,
    iqamaRenewals,
    weekAttendance,
    lateToday,
    salarySummary,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "active" } }),
    prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow }, status: { in: ["present", "late"] } } }),
    prisma.leave.count({ where: { status: "pending" } }),
    // طلبات معلقة (بانتظار المدير أو HR)
    prisma.request.count({ where: { status: { in: ["pending", "manager_approved"] } } }),
    prisma.employee.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true, createdAt: true, employeeNumber: true, photo: true } }),
    // آخر الطلبات المعلقة (كل الأنواع)
    prisma.request.findMany({
      where: { status: { in: ["pending", "manager_approved"] } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { firstName: true, lastName: true, photo: true } } },
    }),
    prisma.employee.findMany({
      where: { nationality: "non_saudi", iqamaExpiry: { not: null, lte: twoMonthsLater } },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true, department: true, iqamaExpiry: true },
      orderBy: { iqamaExpiry: "asc" },
    }),
    // حضور آخر 7 أيام
    prisma.attendance.findMany({
      where: { date: { gte: sevenDaysAgo, lt: tomorrow } },
      select: { date: true, status: true },
    }),
    // المتأخرون اليوم
    prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, status: "late" },
      take: 5,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, photo: true } } },
      orderBy: { checkIn: "desc" },
    }),
    // ملخص رواتب الشهر الحالي
    prisma.salary.groupBy({
      by: ["status"],
      where: { month: currentMonth, year: currentYear },
      _sum: { netSalary: true },
      _count: true,
    }),
  ]);

  // تجهيز بيانات الرسم البياني (7 أيام)
  const weekChart: { date: string; present: number; late: number; absent: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayRecords = weekAttendance.filter(
      (a) => new Date(a.date).toISOString().slice(0, 10) === dayStr
    );
    weekChart.push({
      date: dayStr,
      present: dayRecords.filter((a) => a.status === "present").length,
      late: dayRecords.filter((a) => a.status === "late").length,
      absent: dayRecords.filter((a) => a.status === "absent").length,
    });
  }

  // تجهيز ملخص الرواتب
  const salaryPaid = salarySummary.find((s) => s.status === "paid");
  const salaryPending = salarySummary.find((s) => s.status === "pending");
  const salaryInfo = {
    paidCount: salaryPaid?._count ?? 0,
    paidTotal: salaryPaid?._sum.netSalary ?? 0,
    pendingCount: salaryPending?._count ?? 0,
    pendingTotal: salaryPending?._sum.netSalary ?? 0,
    month: currentMonth,
    year: currentYear,
  };

  return NextResponse.json({
    totalEmployees, activeEmployees, todayAttendance,
    pendingLeaves, pendingRequests,
    recentEmployees, pendingRequestsList, iqamaRenewals,
    weekChart, lateToday, salaryInfo,
  });
}
