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

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
