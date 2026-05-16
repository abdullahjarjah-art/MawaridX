import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isValidEmail, isValidPhone, isValidIBAN } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const full = searchParams.get("full");

  if (full === "1") {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        subordinates: { select: { id: true, firstName: true, lastName: true, jobTitle: true, photo: true } },
        workLocation: { select: { id: true, name: true } },
        attendances: { orderBy: { date: "desc" }, take: 10, select: { id: true, date: true, status: true, checkIn: true, checkOut: true, workHours: true } },
        salaries: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 6, select: { id: true, month: true, year: true, netSalary: true, status: true } },
        requests: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, type: true, title: true, status: true, createdAt: true } },
        leaves: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, type: true, startDate: true, endDate: true, days: true, status: true } },
      },
    });
    if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(employee);
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const nullIfEmpty = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);

    // ── التحقق من المدخلات ──
    if (!body.firstName?.trim()) return NextResponse.json({ error: "الاسم الأول مطلوب" }, { status: 400 });
    if (!body.lastName?.trim())  return NextResponse.json({ error: "الاسم الأخير مطلوب" }, { status: 400 });
    if (!body.email?.trim())     return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    if (!isValidEmail(body.email)) return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
    if (body.phone && !isValidPhone(body.phone)) return NextResponse.json({ error: "رقم الجوال غير صحيح" }, { status: 400 });
    if (body.iban && !isValidIBAN(body.iban))    return NextResponse.json({ error: "رقم الآيبان غير صحيح" }, { status: 400 });
    if (body.basicSalary !== undefined && parseFloat(body.basicSalary) < 0) return NextResponse.json({ error: "الراتب لا يمكن أن يكون سالباً" }, { status: 400 });

    // فحص تكرار الإيميل مع استثناء نفس الموظف
    if (body.email) {
      const dup = await prisma.employee.findFirst({ where: { email: body.email.trim(), NOT: { id } } });
      if (dup) return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }

    // إذا الموظف عادي وعنده قسم ولم يُحدد مدير يدوياً، نجلب مدير القسم تلقائياً
    let managerId = nullIfEmpty(body.managerId);
    if (body.position === "employee" && !managerId && body.department) {
      const dept = await prisma.department.findFirst({ where: { name: body.department } });
      if (dept?.managerId) managerId = dept.managerId;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        arabicName: nullIfEmpty(body.arabicName),
        email: body.email,
        phone: nullIfEmpty(body.phone),
        nationalId: nullIfEmpty(body.nationalId),
        gender: nullIfEmpty(body.gender),
        maritalStatus: nullIfEmpty(body.maritalStatus),
        address: nullIfEmpty(body.address),
        city: nullIfEmpty(body.city),
        jobTitle: nullIfEmpty(body.jobTitle),
        position: body.position ?? "employee",
        managerId,
        department: nullIfEmpty(body.department),
        employmentType: body.employmentType ?? "full_time",
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        startDate:        body.startDate ? new Date(body.startDate) : undefined,
        endDate:          body.endDate   ? new Date(body.endDate)   : null,
        contractDuration: body.contractDuration ? parseFloat(body.contractDuration) : null,
        noticePeriodDays: body.noticePeriodDays ? parseInt(body.noticePeriodDays)   : 60,
        basicSalary: body.basicSalary ? parseFloat(body.basicSalary) : undefined,
        housingAllowance: body.housingAllowance !== undefined ? parseFloat(body.housingAllowance) || 0 : undefined,
        transportAllowance: body.transportAllowance !== undefined ? parseFloat(body.transportAllowance) || 0 : undefined,
        otherAllowance: body.otherAllowance !== undefined ? parseFloat(body.otherAllowance) || 0 : undefined,
        bankName: nullIfEmpty(body.bankName),
        iban: nullIfEmpty(body.iban),
        nationality: body.nationality ?? "saudi",
        iqamaExpiry: body.iqamaExpiry ? new Date(body.iqamaExpiry) : null,
        costGosiOverride:       body.costGosiOverride       !== undefined ? (body.costGosiOverride === null || body.costGosiOverride === "" ? null : parseFloat(body.costGosiOverride)) : undefined,
        costIqamaOverride:      body.costIqamaOverride      !== undefined ? (body.costIqamaOverride === null || body.costIqamaOverride === "" ? null : parseFloat(body.costIqamaOverride)) : undefined,
        costWorkPermitOverride: body.costWorkPermitOverride !== undefined ? (body.costWorkPermitOverride === null || body.costWorkPermitOverride === "" ? null : parseFloat(body.costWorkPermitOverride)) : undefined,
        costExpatLevyOverride:  body.costExpatLevyOverride  !== undefined ? (body.costExpatLevyOverride === null || body.costExpatLevyOverride === "" ? null : parseFloat(body.costExpatLevyOverride)) : undefined,
        costMedicalInsurance:   body.costMedicalInsurance   !== undefined ? (body.costMedicalInsurance === null || body.costMedicalInsurance === "" ? null : parseFloat(body.costMedicalInsurance)) : undefined,
        costOtherAnnual:        body.costOtherAnnual        !== undefined ? (body.costOtherAnnual === null || body.costOtherAnnual === "" ? null : parseFloat(body.costOtherAnnual)) : undefined,
        workLocationId: nullIfEmpty(body.workLocationId),
        multiLocation: body.multiLocation === true || body.multiLocation === "true",
      },
    });
    return NextResponse.json(employee);
  } catch (err) {
    console.error("Update employee error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء التحديث" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "غير مصرح لك بحذف الموظفين" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  try {
    const emp = await prisma.employee.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!emp) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });

    // عدّ السجلات المرتبطة قبل اتخاذ القرار
    const [attendance, leaves, salaries, evals, requests] = await Promise.all([
      prisma.attendance.count({ where: { employeeId: id } }),
      prisma.leave.count({ where: { employeeId: id } }),
      prisma.salary.count({ where: { employeeId: id } }),
      prisma.evaluation.count({ where: { employeeId: id } }),
      prisma.request.count({ where: { employeeId: id } }),
    ]);
    const refs = attendance + leaves + salaries + evals + requests;

    if (refs > 0 && !force) {
      return NextResponse.json({
        error: "للموظف سجلات مرتبطة — أضف ?force=1 للحذف الكامل أو غيّر حالته لـ \"غير نشط\" بدل الحذف",
        counts: { attendance, leaves, salaries, evaluations: evals, requests },
        suggestion: "soft_delete",
      }, { status: 409 });
    }

    // تنظيف السجلات التابعة بالترتيب الصحيح ثم حذف الموظف
    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { employeeId: id } });
      await tx.leave.deleteMany({ where: { employeeId: id } });
      await tx.salary.deleteMany({ where: { employeeId: id } });
      await tx.evaluation.deleteMany({ where: { employeeId: id } });
      await tx.request.deleteMany({ where: { employeeId: id } });
      await tx.leaveBalance.deleteMany({ where: { employeeId: id } });
      await tx.disciplinary.deleteMany({ where: { employeeId: id } });
      await tx.employeeShift.deleteMany({ where: { employeeId: id } });
      await tx.employeeWorkLocation.deleteMany({ where: { employeeId: id } });
      await tx.employeeTraining.deleteMany({ where: { employeeId: id } });
      await tx.document.deleteMany({ where: { employeeId: id } });
      await tx.custody.deleteMany({ where: { employeeId: id } });
      await tx.employee.delete({ where: { id } });
      if (emp.userId) {
        try { await tx.user.delete({ where: { id: emp.userId } }); } catch { /* user may already be gone */ }
      }
    });

    return NextResponse.json({ success: true, removedReferences: refs });
  } catch (err) {
    console.error("Delete employee error:", err);
    return NextResponse.json({ error: "تعذّر حذف الموظف", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !["admin", "hr"].includes(session.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const parseNullable = (v: unknown): number | null =>
      v === null || v === "" || v === undefined ? null : parseFloat(String(v));

    const data: Record<string, number | null> = {};
    const costKeys = ["costGosiOverride","costIqamaOverride","costWorkPermitOverride","costExpatLevyOverride","costMedicalInsurance","costOtherAnnual"] as const;
    for (const key of costKeys) {
      if (key in body) data[key] = parseNullable(body[key]);
    }

    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json(employee);
  } catch (err) {
    console.error("PATCH employee cost error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
