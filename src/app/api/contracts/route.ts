import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// جلب كل الموظفين الذين لديهم عقود (endDate موجود)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all"; // all | expiring | expired | active

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [employees, pendingRenewals, pendingNonRenewals] = await Promise.all([
    prisma.employee.findMany({
      where: {
        endDate: { not: null },
        status: { not: "terminated" },
      },
      select: {
        id: true, employeeNumber: true, firstName: true, lastName: true,
        photo: true, jobTitle: true, department: true, position: true,
        startDate: true, endDate: true,
        contractDuration: true, noticePeriodDays: true,
      },
      orderBy: { endDate: "asc" },
    }),
    prisma.request.findMany({
      where: { type: "contract_renewal", status: "pending" },
      select: { employeeId: true },
    }),
    prisma.request.findMany({
      where: { type: "contract_non_renewal", status: "pending" },
      select: { employeeId: true },
    }),
  ]);

  const pendingSet    = new Set(pendingRenewals.map(r => r.employeeId));
  const pendingNonSet = new Set(pendingNonRenewals.map(r => r.employeeId));

  // إضافة حالة العقد لكل موظف
  const withStatus = employees.map(emp => {
    const end   = new Date(emp.endDate!);
    const notice = emp.noticePeriodDays ?? 60;
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    const noticeDate = new Date(end.getTime() - notice * 86400000);
    const inNoticePeriod = today >= noticeDate && daysLeft >= 0;

    let contractStatus: "expired" | "notice" | "active";
    if (daysLeft < 0)        contractStatus = "expired";
    else if (inNoticePeriod) contractStatus = "notice";
    else                     contractStatus = "active";

    return {
      ...emp,
      daysLeft,
      contractStatus,
      noticeDate,
      pendingRenewal:    pendingSet.has(emp.id),
      pendingNonRenewal: pendingNonSet.has(emp.id),
    };
  });

  // فلترة
  const filtered = filter === "all"      ? withStatus
    : filter === "expired"  ? withStatus.filter(e => e.contractStatus === "expired")
    : filter === "expiring" ? withStatus.filter(e => e.contractStatus === "notice")
    : filter === "active"   ? withStatus.filter(e => e.contractStatus === "active")
    : withStatus;

  return NextResponse.json(filtered);
}
