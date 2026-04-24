import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: { select: { id: true, startDate: true } } },
  });
  if (!user?.employee) return NextResponse.json({ error: "لا يوجد موظف مرتبط" }, { status: 404 });

  const empId = user.employee.id;
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();

  // أول يوم وآخر يوم في الشهر الحالي
  const monthStart = new Date(thisYear, now.getMonth(), 1);
  const monthEnd = new Date(thisYear, now.getMonth() + 1, 0, 23, 59, 59);

  const [
    leaveBalance,
    attendanceThisMonth,
    lateThisMonth,
    absentThisMonth,
    pendingRequests,
    totalLeavesTaken,
    salary,
    custodyCount,
  ] = await Promise.all([
    // رصيد الإجازات السنوية
    prisma.leaveBalance.findFirst({
      where: { employeeId: empId, year: thisYear },
      select: { annual: true, sick: true, emergency: true, usedAnnual: true, usedSick: true, usedEmergency: true },
    }),
    // أيام الحضور هذا الشهر
    prisma.attendance.count({
      where: { employeeId: empId, date: { gte: monthStart, lte: monthEnd }, status: { in: ["present", "late"] } },
    }),
    // أيام التأخير هذا الشهر
    prisma.attendance.count({
      where: { employeeId: empId, date: { gte: monthStart, lte: monthEnd }, status: "late" },
    }),
    // أيام الغياب هذا الشهر
    prisma.attendance.count({
      where: { employeeId: empId, date: { gte: monthStart, lte: monthEnd }, status: "absent" },
    }),
    // طلبات معلقة
    prisma.request.count({
      where: { employeeId: empId, status: { in: ["pending", "manager_approved"] } },
    }),
    // إجمالي أيام الإجازات المأخوذة هذا العام
    prisma.leave.aggregate({
      where: { employeeId: empId, status: "approved", startDate: { gte: new Date(thisYear, 0, 1) } },
      _sum: { days: true },
    }),
    // آخر راتب
    prisma.salary.findFirst({
      where: { employeeId: empId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { month: true, year: true, netSalary: true, status: true },
    }),
    // عدد العهد
    prisma.custody.count({ where: { employeeId: empId, status: "active" } }),
  ]);

  // حساب مدة الخدمة
  const startDate = user.employee.startDate;
  const diffMs = now.getTime() - new Date(startDate).getTime();
  const totalDays = Math.floor(diffMs / 86400000);
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);

  // نسبة الحضور هذا الشهر
  const totalWorkDays = attendanceThisMonth + absentThisMonth;
  const attendanceRate = totalWorkDays > 0 ? Math.round((attendanceThisMonth / totalWorkDays) * 100) : 100;

  return NextResponse.json({
    leaveBalance: leaveBalance?.annual ?? 30,
    leaveUsed: leaveBalance?.usedAnnual ?? 0,
    sickBalance: leaveBalance?.sick ?? 15,
    sickUsed: leaveBalance?.usedSick ?? 0,
    totalLeavesTaken: totalLeavesTaken._sum.days ?? 0,
    attendanceThisMonth,
    lateThisMonth,
    absentThisMonth,
    attendanceRate,
    pendingRequests,
    serviceYears: years,
    serviceMonths: months,
    serviceTotalDays: totalDays,
    lastSalary: salary,
    custodyCount,
    month: thisMonth,
    year: thisYear,
  });
}
