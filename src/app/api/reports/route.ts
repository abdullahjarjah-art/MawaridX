import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") || new Date().getFullYear());

  // إحصائيات الحضور الشهرية
  const attendance = await prisma.attendance.findMany({
    where: {
      date: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    select: { date: true, status: true, checkIn: true },
  });

  const attendanceByMonth = Array.from({ length: 12 }, (_, i) => {
    const monthRecords = attendance.filter((a) => new Date(a.date).getMonth() === i);
    const present = monthRecords.filter((a) => a.status === "present").length;
    const late = monthRecords.filter((a) => a.status === "late").length;
    const absent = monthRecords.filter((a) => a.status === "absent").length;
    // دقائق التأخير
    const lateMins = monthRecords.reduce((sum, a) => {
      if (!a.checkIn) return sum;
      const d = new Date(a.checkIn);
      const mins = d.getHours() * 60 + d.getMinutes();
      return sum + (mins > 480 ? mins - 480 : 0); // 8:00 = 480
    }, 0);
    return { month: i + 1, present, late, absent, total: monthRecords.length, lateMins };
  });

  // إحصائيات الرواتب الشهرية
  const salaries = await prisma.salary.findMany({
    where: { year },
    select: { month: true, netSalary: true, status: true },
  });

  const salaryByMonth = Array.from({ length: 12 }, (_, i) => {
    const monthSalaries = salaries.filter((s) => s.month === i + 1);
    const totalNet = monthSalaries.reduce((sum, s) => sum + s.netSalary, 0);
    const paid = monthSalaries.filter((s) => s.status === "paid").length;
    return { month: i + 1, totalNet, count: monthSalaries.length, paid };
  });

  // إحصائيات الطلبات
  const requests = await prisma.request.findMany({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    select: { type: true, status: true },
  });

  const requestsByType: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
  requests.forEach((r) => {
    if (!requestsByType[r.type]) requestsByType[r.type] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    requestsByType[r.type].total++;
    if (r.status === "approved") requestsByType[r.type].approved++;
    else if (r.status === "rejected") requestsByType[r.type].rejected++;
    else requestsByType[r.type].pending++;
  });

  // إحصائيات عامة
  const totalEmployees = await prisma.employee.count({ where: { status: "active" } });
  const departments = await prisma.department.findMany({ select: { name: true } });
  const employeesByDept = await prisma.employee.groupBy({
    by: ["department"],
    where: { status: "active" },
    _count: true,
  });

  return NextResponse.json({
    attendanceByMonth,
    salaryByMonth,
    requestsByType,
    totalEmployees,
    departments: departments.map((d) => d.name),
    employeesByDept: employeesByDept.map((e) => ({ department: e.department ?? "غير محدد", count: e._count })),
  });
}
