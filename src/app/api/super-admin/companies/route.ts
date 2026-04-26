import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";
import { sendCompanyWelcomeEmail } from "@/lib/email";

// GET /api/super-admin/companies - جلب كل الشركات
export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.res;

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(companies);
}

// POST /api/super-admin/companies - إضافة شركة جديدة
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const {
      name,
      adminEmail,
      adminName,
      adminPassword,
      phone,
      commercialReg,
      plan = "trial",
      maxEmployees = 10,
      notes,
    } = body;

    if (!name || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "اسم الشركة وإيميل المدير وكلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    // تحقق من عدم تكرار الإيميل
    const existingCompany = await prisma.company.findUnique({
      where: { adminEmail: adminEmail.toLowerCase() },
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "إيميل المدير مستخدم لشركة أخرى" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "يوجد حساب بهذا الإيميل مسبقاً" },
        { status: 400 }
      );
    }

    // إنشاء الشركة
    const company = await prisma.company.create({
      data: {
        name,
        adminEmail: adminEmail.toLowerCase(),
        adminName: adminName || null,
        phone: phone || null,
        commercialReg: commercialReg || null,
        plan,
        maxEmployees: Number(maxEmployees) || 10,
        status: "active",
        notes: notes || null,
        expiresAt: plan === "trial"
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 يوم تجربة
          : null,
      },
    });

    // إنشاء حساب الأدمن للشركة
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: "admin",
      },
    });

    // إرسال إيميل ترحيب للأدمن (لا نوقف الإنشاء لو فشل الإيميل)
    sendCompanyWelcomeEmail(
      adminEmail.toLowerCase(),
      adminName || "مدير النظام",
      name,
      adminPassword,
    ).catch(() => {});

    return NextResponse.json({ success: true, company });
  } catch (err) {
    console.error("Create company error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الشركة" },
      { status: 500 }
    );
  }
}
