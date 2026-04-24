import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const prev = await prisma.salaryDeductionRule.findUnique({ where: { id } });
  const isActive = body.isActive ?? true;
  const type = body.type ?? "fixed";
  const amount = parseFloat(body.amount);
  const employeeId = body.employeeId || null;

  const totalMonths = body.totalMonths !== undefined ? (parseInt(body.totalMonths) || 0) : undefined;

  const rule = await prisma.salaryDeductionRule.update({
    where: { id },
    data: {
      name: body.name, type, amount, employeeId, isActive,
      ...(totalMonths !== undefined && { totalMonths }),
    },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
  });

  // إرسال إشعار إذا تغيّر المبلغ أو تم تفعيل الخصم من جديد
  const amountChanged = prev && prev.amount !== amount;
  const justActivated = prev && !prev.isActive && isActive;
  if (isActive && (amountChanged || justActivated)) {
    const amountLabel = type === "percentage" ? `${amount}%` : `${amount.toLocaleString("ar-SA")} ر.س`;
    const targets = employeeId
      ? [employeeId]
      : (await prisma.employee.findMany({ where: { status: "active" }, select: { id: true } })).map((e) => e.id);

    await prisma.notification.createMany({
      data: targets.map((empId) => ({
        recipientId: empId,
        title: "تنبيه: تحديث خصم على راتبك",
        message: `تم ${justActivated ? "تفعيل" : "تعديل"} خصم "${body.name}" ليصبح ${amountLabel} شهرياً.`,
        type: "info",
        relatedId: id,
      })),
    });
  }

  return NextResponse.json(rule);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  await prisma.salaryDeductionRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
