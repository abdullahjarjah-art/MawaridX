import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasFeature } from "@/lib/features";

// ──────────────────────────────────────────────────────────
// Branding settings — اسم الشركة الظاهر، الشعار، اللون
// مخزّنة في جدول Setting داخل DB الكونتينر — لكل شركة قيمها
// ──────────────────────────────────────────────────────────

const KEY = "branding";

export type Branding = {
  /** الاسم الظاهر للشركة (يطغى على COMPANY_NAME من env إن وُجد) */
  displayName: string;
  /** مسار الشعار داخل /uploads/branding/ */
  logoUrl: string | null;
  /** اللون الأساسي للبراند (hex) */
  primaryColor: string;
  /** السجل التجاري — يظهر في الخطابات */
  commercialReg: string;
  /** الرقم الضريبي — يظهر في الخطابات */
  taxNumber: string;
  /** عنوان الشركة — يظهر في الخطابات */
  address: string;
  /** هاتف الشركة */
  phone: string;
  /** بريد الشركة */
  email: string;
};

const DEFAULT_BRANDING: Branding = {
  displayName:   process.env.COMPANY_NAME ?? "MawaridX",
  logoUrl:       null,
  primaryColor:  "#0284C7",
  commercialReg: "",
  taxNumber:     "",
  address:       "",
  phone:         "",
  email:         "",
};

export async function GET() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: KEY } });
    if (!s) return NextResponse.json(DEFAULT_BRANDING);
    return NextResponse.json({ ...DEFAULT_BRANDING, ...JSON.parse(s.value) });
  } catch {
    return NextResponse.json(DEFAULT_BRANDING);
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل هذه الإعدادات" }, { status: 403 });
  }

  // ميزة Branding مرتبطة بالخطة
  if (!hasFeature("customBranding")) {
    return NextResponse.json(
      { error: "تخصيص الهوية البصرية غير متاح في الخطة الحالية" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const merged: Branding = { ...DEFAULT_BRANDING, ...body };

    // تنظيف وتحقق
    if (typeof merged.displayName !== "string" || merged.displayName.length > 100) {
      return NextResponse.json({ error: "اسم الشركة غير صالح" }, { status: 400 });
    }
    if (merged.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(merged.primaryColor)) {
      return NextResponse.json({ error: "لون البراند يجب أن يكون hex صالح (#RRGGBB)" }, { status: 400 });
    }

    await prisma.setting.upsert({
      where:  { key: KEY },
      update: { value: JSON.stringify(merged) },
      create: { key: KEY, value: JSON.stringify(merged) },
    });

    return NextResponse.json({ success: true, branding: merged });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
