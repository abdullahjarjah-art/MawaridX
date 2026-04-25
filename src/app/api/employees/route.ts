import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isValidEmail, isValidPhone, isValidIBAN } from "@/lib/validate";
import { sendEmployeeInviteEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page")  || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
  const search   = searchParams.get("search")?.trim() || "";
  const dept     = searchParams.get("department")?.trim() || "";
  const noPagination = searchParams.get("all") === "1"; // للقوائم المنسدلة
  const managerId   = searchParams.get("managerId")?.trim() || "";

  const where: Record<string, unknown> = {};
  if (managerId) where.managerId = managerId;
  if (search) {
    where.OR = [
      { firstName:      { contains: search } },
      { lastName:       { contains: search } },
      { employeeNumber: { contains: search } },
      { email:          { contains: search } },
    ];
  }
  if (dept) where.department = dept;

  if (noPagination) {
    const employees = await prisma.employee.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(employees);
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ data: employees, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  try {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    arabicName,
    email,
    phone,
    nationalId,
    birthDate,
    gender,
    maritalStatus,
    address,
    city,
    jobTitle,
    position,
    managerId,
    department,
    employmentType,
    startDate,
    basicSalary,
    housingAllowance,
    transportAllowance,
    otherAllowance,
    bankName,
    iban,
    nationality,
    iqamaExpiry,
    workLocationId,
  } = body;

  // ── التحقق من المدخلات ──
  if (!firstName?.trim()) return NextResponse.json({ error: "الاسم الأول مطلوب" }, { status: 400 });
  if (!lastName?.trim())  return NextResponse.json({ error: "الاسم الأخير مطلوب" }, { status: 400 });
  if (!email?.trim())     return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
  if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "رقم الجوال غير صحيح" }, { status: 400 });
  if (iban && !isValidIBAN(iban))    return NextResponse.json({ error: "رقم الآيبان غير صحيح" }, { status: 400 });
  if (basicSalary !== undefined && parseFloat(basicSalary) < 0) return NextResponse.json({ error: "الراتب لا يمكن أن يكون سالباً" }, { status: 400 });

  // فحص التكرار
  const existing = await prisma.employee.findFirst({
    where: { OR: [{ email: email.trim() }, ...(nationalId?.trim() ? [{ nationalId: nationalId.trim() }] : [])] },
  });
  if (existing) {
    const dup = existing.email === email.trim() ? "البريد الإلكتروني" : "رقم الهوية";
    return NextResponse.json({ error: `${dup} مستخدم بالفعل` }, { status: 409 });
  }

  const count = await prisma.employee.count();
  const employeeNumber = `EMP${String(count + 1).padStart(4, "0")}`;

  const nullIfEmpty = (v: string | undefined) => (v && v.trim() !== "" ? v : null);

  // إنشاء حساب مستخدم مع token دعوة (48 ساعة)
  const resetToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const tempHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const user = await prisma.user.create({
    data: {
      email: email.trim(),
      password: tempHash,
      role: "employee",
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  // إذا موظف عادي وعنده قسم بدون مدير محدد، نجلب مدير القسم تلقائياً
  let resolvedManagerId = nullIfEmpty(managerId);
  if ((position === "employee" || !position) && !resolvedManagerId && department) {
    const dept = await prisma.department.findFirst({ where: { name: department } });
    if (dept?.managerId) resolvedManagerId = dept.managerId;
  }

  const employee = await prisma.employee.create({
    data: {
      employeeNumber,
      firstName,
      lastName,
      arabicName: nullIfEmpty(arabicName),
      email,
      phone: nullIfEmpty(phone),
      nationalId: nullIfEmpty(nationalId),
      birthDate: birthDate ? new Date(birthDate) : null,
      gender: nullIfEmpty(gender),
      maritalStatus: nullIfEmpty(maritalStatus),
      address: nullIfEmpty(address),
      city: nullIfEmpty(city),
      jobTitle: nullIfEmpty(jobTitle),
      position: position ?? "employee",
      managerId: resolvedManagerId,
      department: nullIfEmpty(department),
      employmentType: employmentType ?? "full_time",
      startDate:        startDate        ? new Date(startDate)              : undefined,
      endDate:          body.endDate     ? new Date(body.endDate)           : null,
      contractDuration: body.contractDuration ? parseFloat(body.contractDuration) : null,
      noticePeriodDays: body.noticePeriodDays  ? parseInt(body.noticePeriodDays)  : 60,
      basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
      housingAllowance: housingAllowance ? parseFloat(housingAllowance) : 0,
      transportAllowance: transportAllowance ? parseFloat(transportAllowance) : 0,
      otherAllowance: otherAllowance ? parseFloat(otherAllowance) : 0,
      bankName: nullIfEmpty(bankName),
      iban: nullIfEmpty(iban),
      nationality: nationality ?? "saudi",
      iqamaExpiry: iqamaExpiry ? new Date(iqamaExpiry) : null,
      workLocationId: nullIfEmpty(workLocationId),
      userId: user.id,
    },
  });

  // إرسال إيميل الدعوة (لا يوقف الإنشاء لو فشل)
  sendEmployeeInviteEmail(email, firstName, resetToken).catch(() => {});

  return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error("Create employee error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة الموظف" }, { status: 500 });
  }
}
