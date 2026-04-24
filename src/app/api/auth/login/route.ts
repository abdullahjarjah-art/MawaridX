import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";

export async function POST(req: NextRequest) {
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
      isSuperAdmin: isSuperAdminEmail(user.email),
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
