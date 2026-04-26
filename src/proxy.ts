import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/verify-otp"];
const HR_ONLY_PATHS = ["/dashboard", "/employees", "/attendance", "/salaries", "/recruitment", "/evaluations", "/training"];
const EMPLOYEE_PATHS = ["/portal"];

/** Apply security headers to every response (Next.js Edge runtime). */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return withSecurityHeaders(NextResponse.next());
  if (pathname.startsWith("/api/auth/logout")) return withSecurityHeaders(NextResponse.next());

  const token = req.cookies.get("hr_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // الموظف لا يدخل لوحة الـ HR
  if (HR_ONLY_PATHS.some(p => pathname.startsWith(p)) && session.role === "employee") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // HR/Admin لا يدخل بوابة الموظف
  if (EMPLOYEE_PATHS.some(p => pathname.startsWith(p)) && session.role !== "employee") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
