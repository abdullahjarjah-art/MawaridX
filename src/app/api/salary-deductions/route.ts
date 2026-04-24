import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const rules = await prisma.salaryDeductionRule.findMany({
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  if (!body.name || body.amount === undefined) {
    return NextResponse.json({ error: "الاسم والمبلغ مطلوبان" }, { status: 400 });
  }

  const isActive = body.isActive ?? true;
  const type = body.type ?? "fixed";
  const amount = parseFloat(body.amount);
  const employeeId = body.employeeId || null;

  const totalMonths = parseInt(body.totalMonths) || 0;

  const rule = await prisma.salaryDeductionRule.create({
    data: { name: body.name, type, amount, employeeId, isActive, totalMonths, appliedMonths: 0 },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
  });

  // إرسال إشعار للموظفين المعنيين إذا كان الخصم مفعلاً
  if (isActive) {
    const amountLabel = type === "percentage" ? `${amount}%` : `${amount.toLocaleString("ar-SA")} ر.س`;
    const monthsLabel = totalMonths > 0 ? ` لمدة ${totalMonths} شهر` : "";
    const targets = employeeId
      ? [employeeId]
      : (await prisma.employee.findMany({ where: { status: "active" }, select: { id: true } })).map((e) => e.id);

    await prisma.notification.createMany({
      data: targets.map((id) => ({
        recipientId: id,
        title: "تنبيه: خصم جديد على راتبك",
        message: `تم إضافة خصم "${body.name}" بمقدار ${amountLabel}${monthsLabel} وسيُطبَّق على راتبك الشهري.`,
        type: "info",
        relatedId: rule.id,
      })),
    });
  }

  return NextResponse.json(rule);
}
