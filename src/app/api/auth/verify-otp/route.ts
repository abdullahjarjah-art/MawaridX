import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { signToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // 5 محاولات / 15 دقيقة لكل IP
  const ip = getIP(req);
  const rl = checkRateLimit(`otp:${ip}`, { windowMs: 15 * 60_000, max: 5, blockMs: 30 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { userId, code } = await req.json();
  if (!userId || !code) return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });

  const entry = verifyOtp(userId, code);
  if (!entry) return NextResponse.json({ error: "الرمز غير صحيح أو انتهت صلاحيته" }, { status: 401 });

  const token = await signToken({
    userId: entry.userId,
    email: entry.email,
    role: entry.role,
    employeeId: entry.employeeId,
  });
  await setSessionCookie(token);

  return NextResponse.json({ isSuperAdmin: true });
}
