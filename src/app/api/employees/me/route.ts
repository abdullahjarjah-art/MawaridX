import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isValidPhone, isValidIBAN } from "@/lib/validate";

// جلب بيانات الموظف الحالي مع تفاصيل كاملة
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      employee: {
        include: {
          workLocation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        },
      },
    },
  });
  if (!user?.employee) return NextResponse.json({ error: "لا يوجد موظف مرتبط" }, { status: 404 });
  return NextResponse.json(user.employee);
}

// تعديل البيانات الشخصية (الموظف يعدّل بياناته فقط)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: { select: { id: true } } },
  });
  if (!user?.employee) return NextResponse.json({ error: "لا يوجد موظف مرتبط" }, { status: 404 });

  const body = await req.json();
  const nullIfEmpty = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);

  // ── التحقق من المدخلات ──
  if (body.phone && !isValidPhone(body.phone)) return NextResponse.json({ error: "رقم الجوال غير صحيح" }, { status: 400 });
  if (body.iban && !isValidIBAN(body.iban))    return NextResponse.json({ error: "رقم الآيبان غير صحيح" }, { status: 400 });

  const updated = await prisma.employee.update({
    where: { id: user.employee.id },
    data: {
      phone: nullIfEmpty(body.phone),
      maritalStatus: nullIfEmpty(body.maritalStatus),
      address: nullIfEmpty(body.address),
      city: nullIfEmpty(body.city),
      buildingNumber: nullIfEmpty(body.buildingNumber),
      streetName: nullIfEmpty(body.streetName),
      region: nullIfEmpty(body.region),
      postalCode: nullIfEmpty(body.postalCode),
      religion: nullIfEmpty(body.religion),
      idType: nullIfEmpty(body.idType),
      bankName: nullIfEmpty(body.bankName),
      iban: nullIfEmpty(body.iban),
      ...(typeof body.photo === "string" ? { photo: nullIfEmpty(body.photo) } : {}),
    },
  });

  // سجل تدقيق
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      userName: user.email,
      action: "update",
      entity: "employee",
      entityId: user.employee.id,
      details: "تعديل البيانات الشخصية من البوابة",
    },
  });

  return NextResponse.json(updated);
}
