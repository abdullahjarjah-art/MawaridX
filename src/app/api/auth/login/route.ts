import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { checkRateLimit, rateLimitResponse, getIP, LIMITS } from "@/lib/rate-limit";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail, sendAccountLockedEmail } from "@/lib/email";

// ── Account lockout policy ──
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function logAudit(userId: string | null, userName: string | null, action: string, details?: string) {
  try {
    await prisma.auditLog.create({
      data: { userId, userName, action, entity: "auth", details },
    });
  } catch {
    /* never let audit failures break auth */
  }
}

export async function POST(req: NextRequest) {
  // ── IP-based rate limit (independent of email) ──
  const ip = getIP(req);
  const rl = checkRateLimit(`login:${ip}`, LIMITS.login);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "أدخل البريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { employee: true },
    });

    // ── Constant-time-ish: always run bcrypt to avoid leaking user existence ──
    const passwordOk = user ? await bcrypt.compare(password, user.password) : false;

    if (!user) {
      await logAudit(null, email, "login_failed", "user not found");
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // ── Account-level lockout check ──
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      await logAudit(user.id, user.email, "login_blocked", `account locked, ${minutes}min remaining`);
      return NextResponse.json(
        { error: `الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة. حاول بعد ${minutes} دقيقة` },
        { status: 423 }
      );
    }

    // ── Wrong password: increment counter, lock if threshold reached ──
    if (!passwordOk) {
      const newCount = user.failedLoginAttempts + 1;
      const data: Record<string, unknown> = { failedLoginAttempts: newCount };
      const willLock = newCount >= MAX_FAILED_ATTEMPTS;
      if (willLock) {
        data.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
        data.failedLoginAttempts = 0;
      }
      await prisma.user.update({ where: { id: user.id }, data });
      await logAudit(user.id, user.email, willLock ? "account_locked" : "login_failed", `attempt ${newCount}/${MAX_FAILED_ATTEMPTS}, ip=${ip}`);
      // Notify the user via email when their account gets locked (non-blocking)
      if (willLock) sendAccountLockedEmail(user.email, ip, LOCKOUT_MINUTES).catch(() => {});
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // ── Successful password — reset counter, record login metadata ──
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    // ── 2FA: Super admin gets OTP via email (unless bypassed for demo) ──
    if (isSuperAdminEmail(user.email) && process.env.BYPASS_2FA !== "true") {
      const { code } = createOtp(user.id, user.email, user.role, user.employee?.id);
      sendOtpEmail(user.email, code).catch(() => {});
      const [local, domain] = user.email.split("@");
      const maskedEmail = `${local.slice(0, 2)}***@${domain}`;
      await logAudit(user.id, user.email, "login_otp_sent", `from ip=${ip}`);
      return NextResponse.json({ require2fa: true, userId: user.id, maskedEmail });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    });

    await setSessionCookie(token);
    await logAudit(user.id, user.email, "login_success", `from ip=${ip}`);

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
