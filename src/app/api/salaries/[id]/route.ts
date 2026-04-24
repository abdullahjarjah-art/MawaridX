import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function calcGosi(basicSalary: number, nationality: string) {
  const base = basicSalary;
  if (nationality === "saudi") {
    return { gosiEmployee: Math.round(base * 0.09 * 100) / 100, gosiEmployer: Math.round(base * 0.09 * 100) / 100 };
  }
  return { gosiEmployee: 0, gosiEmployer: Math.round(base * 0.02 * 100) / 100 };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const basic      = parseFloat(body.basicSalary);
  const allowances = parseFloat(body.allowances ?? 0);
  const bonus      = parseFloat(body.bonus ?? 0);
  const overtime   = parseFloat(body.overtimePay ?? 0);
  const deductions = parseFloat(body.deductions ?? 0);

  // إعادة حساب GOSI إذا لم يُرسَل override
  let gosiEmployee = body.gosiEmployee !== undefined ? parseFloat(body.gosiEmployee) : null;
  let gosiEmployer = body.gosiEmployer !== undefined ? parseFloat(body.gosiEmployer) : null;

  if (gosiEmployee === null || gosiEmployer === null) {
    // جلب جنسية الموظف من السجل الحالي
    const existing = await prisma.salary.findUnique({
      where: { id },
      include: { employee: { select: { nationality: true } } },
    });
    const nationality = existing?.employee?.nationality ?? "non_saudi";
    const auto = calcGosi(basic, nationality);
    gosiEmployee = gosiEmployee ?? auto.gosiEmployee;
    gosiEmployer = gosiEmployer ?? auto.gosiEmployer;
  }

  const net = basic + allowances + bonus + overtime - deductions - gosiEmployee;

  const salary = await prisma.salary.update({
    where: { id },
    data: {
      basicSalary: basic,
      allowances,
      deductions,
      bonus,
      overtimePay: overtime,
      gosiEmployee,
      gosiEmployer,
      netSalary: net,
      status: body.status,
      paidAt: body.status === "paid" ? new Date() : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(salary);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.salary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
