import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { checkRateLimit, rateLimitResponse, getIP, LIMITS } from "@/lib/rate-limit";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // ── Rate limiting: 5 محاولات / 15 دق لكل IP ──
  const ip = getIP(req);
  const rl = checkRateLimit(`login:${ip}`, LIMITS.login);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "أدخل البريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // ── 2FA: السوبر أدمن يستلم OTP على إيميله ──
    if (isSuperAdminEmail(user.email)) {
      const { code } = createOtp(user.id, user.email, user.role, user.employee?.id);
      sendOtpEmail(user.email, code).catch(() => {}); // non-blocking
      // إخفاء الإيميل جزئياً: ab***@gmail.com
      const [local, domain] = user.email.split("@");
      const maskedEmail = `${local.slice(0, 2)}***@${domain}`;
      return NextResponse.json({ require2fa: true, userId: user.id, maskedEmail });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
      isSuperAdmin: false,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
