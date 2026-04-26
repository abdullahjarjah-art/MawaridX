import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { signToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // 5 attempts / 15 min per IP
  const ip = getIP(req);
  const rl = checkRateLimit(`otp:${ip}`, { windowMs: 15 * 60_000, max: 5, blockMs: 30 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { userId, code } = await req.json();
  if (!userId || !code) return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });

  const entry = verifyOtp(userId, code);
  if (!entry) {
    await prisma.auditLog.create({
      data: { userId, action: "otp_failed", entity: "auth", details: `from ip=${ip}` },
    }).catch(() => {});
    return NextResponse.json({ error: "الرمز غير صحيح أو انتهت صلاحيته" }, { status: 401 });
  }

  const token = await signToken({
    userId: entry.userId,
    email: entry.email,
    role: entry.role,
    employeeId: entry.employeeId,
  });
  await setSessionCookie(token);

  await prisma.user.update({
    where: { id: entry.userId },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  }).catch(() => {});

  await prisma.auditLog.create({
    data: { userId: entry.userId, userName: entry.email, action: "login_success_2fa", entity: "auth", details: `from ip=${ip}` },
  }).catch(() => {});

  return NextResponse.json({ isSuperAdmin: true });
}
