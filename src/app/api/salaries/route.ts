import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// حساب التأمينات الاجتماعية (GOSI)
function calcGosi(basicSalary: number, nationality: string) {
  const base = basicSalary;
  if (nationality === "saudi") {
    return { gosiEmployee: Math.round(base * 0.09 * 100) / 100, gosiEmployer: Math.round(base * 0.09 * 100) / 100 };
  }
  // غير سعودي: 2% على صاحب العمل فقط (أخطار مهنية)
  return { gosiEmployee: 0, gosiEmployer: Math.round(base * 0.02 * 100) / 100 };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const employeeId = searchParams.get("employeeId");
  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);

  const page     = Math.max(1, Number(searchParams.get("page")     || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
  const noPagination = searchParams.get("all") === "1" || employeeId;

  if (noPagination) {
    const salaries = await prisma.salary.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, photo: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(salaries);
  }

  const [total, salaries] = await Promise.all([
    prisma.salary.count({ where }),
    prisma.salary.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, photo: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ data: salaries, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();

  // توليد رواتب بالجملة لجميع الموظفين
  // إعادة حساب GOSI لجميع رواتب شهر/سنة معينة
  if (body.recalcGosi) {
    const { month, year } = body;
    const salaries = await prisma.salary.findMany({
      where: { month: Number(month), year: Number(year) },
      include: { employee: { select: { nationality: true } } },
    });
    let updated = 0;
    for (const s of salaries) {
      const nationality = s.employee?.nationality ?? "non_saudi";
      const gosiEmployee = nationality === "saudi" ? Math.round(s.basicSalary * 0.09 * 100) / 100 : 0;
      const gosiEmployer = nationality === "saudi"
        ? Math.round(s.basicSalary * 0.09 * 100) / 100
        : Math.round(s.basicSalary * 0.02 * 100) / 100;
      const netSalary = s.basicSalary + s.allowances + s.bonus + s.overtimePay - s.deductions;
      await prisma.salary.update({
        where: { id: s.id },
        data: { gosiEmployee, gosiEmployer, netSalary },
      });
      updated++;
    }
    return NextResponse.json({ updated });
  }

  // تحديد جميع الرواتب المعلقة كمصروفة
  if (body.markAllPaid) {
    const { month, year } = body;
    const result = await prisma.salary.updateMany({
      where: { month: Number(month), year: Number(year), status: "pending" },
      data: { status: "paid", paidAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  }

  if (body.bulk) {
    const { month, year } = body;
    const [employees, existing, deductionRules] = await Promise.all([
      prisma.employee.findMany({
        where: { status: "active" },
        select: {
          id: true, basicSalary: true, nationality: true,
          housingAllowance: true, transportAllowance: true, otherAllowance: true,
        },
      }),
      prisma.salary.findMany({
        where: { month: Number(month), year: Number(year) },
        select: { employeeId: true },
      }),
      prisma.salaryDeductionRule.findMany({ where: { isActive: true } }),
    ]);
    const existingIds = new Set(existing.map((s) => s.employeeId));
    const toCreate = employees.filter((e) => !existingIds.has(e.id));
    if (toCreate.length > 0) {
      // تحديد الخصومات الفعّالة (استبعاد الأقساط المنتهية)
      const activeRules = deductionRules.filter(
        (r) => r.totalMonths === 0 || r.appliedMonths < r.totalMonths
      );

      await prisma.salary.createMany({
        data: toCreate.map((e) => {
          const { gosiEmployee, gosiEmployer } = calcGosi(e.basicSalary, e.nationality);
          // بدلات الموظف من ملفه
          const totalAllowances = (e.housingAllowance ?? 0) + (e.transportAllowance ?? 0) + (e.otherAllowance ?? 0);
          // جمع الخصومات المنطبقة على هذا الموظف (ثابتة أو نسبة)
          const fixedDeductions = activeRules
            .filter((r) => r.employeeId === null || r.employeeId === e.id)
            .reduce((sum, r) => {
              const val = r.type === "percentage"
                ? Math.round(e.basicSalary * (r.amount / 100) * 100) / 100
                : r.amount;
              return sum + val;
            }, 0);
          return {
            employeeId: e.id,
            month: Number(month),
            year: Number(year),
            basicSalary: e.basicSalary,
            allowances: totalAllowances,
            deductions: fixedDeductions,
            bonus: 0,
            overtimePay: 0,
            gosiEmployee,
            gosiEmployer,
            netSalary: e.basicSalary + totalAllowances - fixedDeductions,
            status: "pending",
          };
        }),
      });

      // زيادة عداد الأشهر المطبقة للأقساط + تعطيل المنتهية
      for (const rule of activeRules) {
        if (rule.totalMonths > 0) {
          const hasAffectedEmployee = toCreate.some(
            (e) => rule.employeeId === null || rule.employeeId === e.id
          );
          if (hasAffectedEmployee) {
            const newApplied = rule.appliedMonths + 1;
            await prisma.salaryDeductionRule.update({
              where: { id: rule.id },
              data: {
                appliedMonths: newApplied,
                isActive: newApplied < rule.totalMonths,
              },
            });
          }
        }
      }
    }
    return NextResponse.json({ created: toCreate.length });
  }

  // ── التحقق من المدخلات ──
  if (!body.employeeId) return NextResponse.json({ error: "الموظف مطلوب" }, { status: 400 });
  if (!body.month || !body.year) return NextResponse.json({ error: "الشهر والسنة مطلوبان" }, { status: 400 });
  if (parseFloat(body.basicSalary) < 0) return NextResponse.json({ error: "الراتب الأساسي لا يمكن أن يكون سالباً" }, { status: 400 });

  // فحص التكرار
  const duplicate = await prisma.salary.findFirst({
    where: { employeeId: body.employeeId, month: Number(body.month), year: Number(body.year) },
  });
  if (duplicate) return NextResponse.json({ error: "يوجد راتب مسجل بالفعل لهذا الموظف في هذا الشهر" }, { status: 409 });

  // جلب جنسية الموظف لحساب GOSI
  const employee = await prisma.employee.findUnique({
    where: { id: body.employeeId },
    select: { nationality: true },
  });
  const nationality = employee?.nationality ?? "non_saudi";

  const basic      = parseFloat(body.basicSalary);
  const allowances = parseFloat(body.allowances ?? 0);
  const bonus      = parseFloat(body.bonus ?? 0);
  const overtime   = parseFloat(body.overtimePay ?? 0);
  const deductions = parseFloat(body.deductions ?? 0);

  // إذا أرسل الطلب قيمة GOSI صريحة (override) استخدمها، وإلا احسبها تلقائياً
  const { gosiEmployee: autoGosiEmp, gosiEmployer: autoGosiEer } = calcGosi(basic, nationality);
  const gosiEmployee = body.gosiEmployee !== undefined ? parseFloat(body.gosiEmployee) : autoGosiEmp;
  const gosiEmployer = body.gosiEmployer !== undefined ? parseFloat(body.gosiEmployer) : autoGosiEer;

  const net = basic + allowances + bonus + overtime - deductions;

  const salary = await prisma.salary.create({
    data: {
      employeeId: body.employeeId,
      month: Number(body.month),
      year: Number(body.year),
      basicSalary: basic,
      allowances,
      deductions,
      bonus,
      overtimePay: overtime,
      gosiEmployee,
      gosiEmployer,
      netSalary: net,
      status: "pending",
      notes: body.notes,
    },
  });
  return NextResponse.json(salary, { status: 201 });
}
