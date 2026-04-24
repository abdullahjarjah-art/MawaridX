import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "أدخل البريد الإلكتروني" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ message: "إذا كان الإيميل مسجلاً، سيظهر رابط الإعادة" });
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // ساعة واحدة

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // في بيئة الإنتاج يُرسل بالإيميل، هنا نرجعه مباشرة للنظام الداخلي
    const resetUrl = `/reset-password?token=${token}`;

    return NextResponse.json({ resetUrl });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجدداً" }, { status: 500 });
  }
}
