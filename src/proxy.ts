import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password"];
const HR_ONLY_PATHS = ["/dashboard", "/employees", "/attendance", "/salaries", "/recruitment", "/evaluations", "/training"];
const EMPLOYEE_PATHS = ["/portal"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/api/auth/logout")) return NextResponse.next();

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
