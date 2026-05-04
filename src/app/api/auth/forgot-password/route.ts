import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse, getIP, LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // ── Rate limiting: 3 طلبات / ساعة لكل IP ──
  const ip = getIP(req);
  const rl = checkRateLimit(`forgot:${ip}`, LIMITS.forgotPassword);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

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
