import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * ترحيل رصيد الإجازات من السنة السابقة إلى السنة الجديدة
 * POST /api/leave-balance/carryover
 * Body: { fromYear, toYear, maxCarryAnnual?, maxCarrySick?, maxCarryEmergency? }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const fromYear = Number(body.fromYear);
  const toYear = Number(body.toYear);
  const maxCarryAnnual = body.maxCarryAnnual !== undefined ? Number(body.maxCarryAnnual) : 15; // أقصى ترحيل سنوي
  const maxCarrySick = body.maxCarrySick !== undefined ? Number(body.maxCarrySick) : 0;        // لا ترحيل مرضي
  const maxCarryEmergency = body.maxCarryEmergency !== undefined ? Number(body.maxCarryEmergency) : 0; // لا ترحيل طارئ

  if (!fromYear || !toYear || toYear <= fromYear) {
    return NextResponse.json({ error: "السنوات غير صحيحة" }, { status: 400 });
  }

  // جلب جميع الموظفين النشطين
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { id: true, firstName: true, lastName: true },
  });

  const results: {
    employeeId: string;
    name: string;
    carriedAnnual: number;
    carriedSick: number;
    carriedEmergency: number;
    newAnnual: number;
    newSick: number;
    newEmergency: number;
    skipped?: boolean;
  }[] = [];

  for (const emp of employees) {
    // جلب رصيد السنة السابقة
    const oldBalance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: emp.id, year: fromYear } },
    });

    // حساب المتبقي
    const remainAnnual = oldBalance ? oldBalance.annual - oldBalance.usedAnnual : 0;
    const remainSick = oldBalance ? oldBalance.sick - oldBalance.usedSick : 0;
    const remainEmergency = oldBalance ? oldBalance.emergency - oldBalance.usedEmergency : 0;

    // تطبيق الحد الأقصى للترحيل
    const carriedAnnual = Math.min(Math.max(remainAnnual, 0), maxCarryAnnual);
    const carriedSick = Math.min(Math.max(remainSick, 0), maxCarrySick);
    const carriedEmergency = Math.min(Math.max(remainEmergency, 0), maxCarryEmergency);

    // الرصيد الافتراضي + المُرحّل
    const newAnnual = 30 + carriedAnnual;
    const newSick = 15 + carriedSick;
    const newEmergency = 5 + carriedEmergency;

    // تحقق إذا كان الرصيد الجديد موجود مسبقاً
    const existing = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: emp.id, year: toYear } },
    });

    if (existing && existing.usedAnnual + existing.usedSick + existing.usedEmergency > 0) {
      // الرصيد موجود ومُستخدم → لا نعدّل عليه
      results.push({
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        carriedAnnual: 0, carriedSick: 0, carriedEmergency: 0,
        newAnnual: existing.annual, newSick: existing.sick, newEmergency: existing.emergency,
        skipped: true,
      });
      continue;
    }

    // إنشاء أو تحديث رصيد السنة الجديدة
    await prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId: emp.id, year: toYear } },
      update: { annual: newAnnual, sick: newSick, emergency: newEmergency },
      create: { employeeId: emp.id, year: toYear, annual: newAnnual, sick: newSick, emergency: newEmergency },
    });

    results.push({
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      carriedAnnual, carriedSick, carriedEmergency,
      newAnnual, newSick, newEmergency,
    });
  }

  // سجل تدقيق
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      userName: session.email,
      action: "create",
      entity: "leave_balance",
      details: `ترحيل رصيد الإجازات من ${fromYear} إلى ${toYear} (${results.filter(r => !r.skipped).length} موظف)`,
    },
  });

  return NextResponse.json({
    message: "تم ترحيل الأرصدة بنجاح",
    fromYear,
    toYear,
    total: employees.length,
    carried: results.filter(r => !r.skipped).length,
    skipped: results.filter(r => r.skipped).length,
    results,
  });
}

/**
 * GET /api/leave-balance/carryover?fromYear=2025
 * معاينة الترحيل قبل التنفيذ
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromYear = Number(searchParams.get("fromYear") || new Date().getFullYear() - 1);

  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { id: true, firstName: true, lastName: true },
  });

  const preview: {
    employeeId: string;
    name: string;
    remainAnnual: number;
    remainSick: number;
    remainEmergency: number;
    hasBalance: boolean;
  }[] = [];

  for (const emp of employees) {
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: emp.id, year: fromYear } },
    });

    preview.push({
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      remainAnnual: balance ? Math.max(balance.annual - balance.usedAnnual, 0) : 0,
      remainSick: balance ? Math.max(balance.sick - balance.usedSick, 0) : 0,
      remainEmergency: balance ? Math.max(balance.emergency - balance.usedEmergency, 0) : 0,
      hasBalance: !!balance,
    });
  }

  return NextResponse.json({ fromYear, employees: preview });
}
