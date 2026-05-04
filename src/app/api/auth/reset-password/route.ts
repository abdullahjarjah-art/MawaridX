import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validate";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts / 15 min per IP
  const ip = getIP(req);
  const rl = checkRateLimit(`reset:${ip}`, { windowMs: 15 * 60_000, max: 5, blockMs: 30 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "الرابط غير صالح أو منتهي الصلاحية" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        passwordChangedAt: new Date(),
        // Clear any existing lockout — owner regained control via email
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: { userId: user.id, userName: user.email, action: "password_reset", entity: "auth", details: `from ip=${ip}` },
    }).catch(() => {});

    return NextResponse.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجدداً" }, { status: 500 });
  }
}
