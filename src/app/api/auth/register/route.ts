import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { isValidEmail, validatePassword } from "@/lib/validate";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rate-limit";
import { isSuperAdminEmail } from "@/lib/super-admin";

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations / 15 min per IP
  const ip = getIP(req);
  const rl = checkRateLimit(`register:${ip}`, { windowMs: 15 * 60_000, max: 5, blockMs: 30 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body = await req.json();
    const { firstName, lastName, email, password, phone, department, jobTitle } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة يجب تعبئتها" }, { status: 400 });
    }
    if (!isValidEmail(email)) return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل مسبقاً" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const count = await prisma.employee.count();
    const employeeNumber = `EMP${String(count + 1).padStart(4, "0")}`;

    // Bootstrap: the first user to register on a fresh tenant becomes
    // an admin if their email is on the SUPER_ADMIN_EMAILS list. Without
    // this, the proxy redirects them to /portal and they can never reach
    // the admin tools needed to invite the rest of the team.
    const userCount = await prisma.user.count();
    const role = userCount === 0 && isSuperAdminEmail(email) ? "admin" : "employee";

    // إنشاء المستخدم أولاً
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role },
    });

    // إنشاء سجل الموظف مرتبط بالمستخدم
    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        firstName,
        lastName,
        email,
        phone: phone || null,
        department: department || null,
        jobTitle: jobTitle || null,
        status: "active",
        userId: user.id,
      },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee.id,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee.id,
    }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء التسجيل، حاول مجدداً" }, { status: 500 });
  }
}
