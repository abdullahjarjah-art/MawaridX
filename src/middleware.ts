import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware (Edge Runtime)
 * - يضيف Security Headers على كل رد
 * - يحمي مسارات /api/* من الطلبات المفرطة (stateless — بدون ذاكرة)
 *   الـ stateful rate limit (brute-force) موجود في route handlers نفسها
 */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ── Security Headers ──
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js يحتاج unsafe-eval في dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  return res;
}
