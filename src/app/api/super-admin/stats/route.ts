import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";

// GET /api/super-admin/stats - إحصاءات عامة
export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.res;

  const [
    totalCompanies,
    activeCompanies,
    trialCompanies,
    suspendedCompanies,
    totalUsers,
    totalEmployees,
    companiesByPlan,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "active" } }),
    prisma.company.count({ where: { plan: "trial" } }),
    prisma.company.count({ where: { status: "suspended" } }),
    prisma.user.count(),
    prisma.employee.count(),
    prisma.company.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
  ]);

  // حساب الإيرادات التقديرية بناءً على الخطط
  const planPrices: Record<string, number> = {
    trial: 0,
    basic: 299,
    growth: 599,
    business: 1299,
    enterprise: 2999,
  };

  let monthlyRevenue = 0;
  for (const group of companiesByPlan) {
    monthlyRevenue += (planPrices[group.plan] ?? 0) * (group._count.plan ?? 0);
  }

  return NextResponse.json({
    totalCompanies,
    activeCompanies,
    trialCompanies,
    suspendedCompanies,
    totalUsers,
    totalEmployees,
    monthlyRevenue,
    yearlyRevenue: monthlyRevenue * 12,
    companiesByPlan: companiesByPlan.map(g => ({
      plan: g.plan,
      count: g._count.plan,
    })),
  });
}
