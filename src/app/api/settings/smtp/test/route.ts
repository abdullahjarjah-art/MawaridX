import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const userSetting = await prisma.setting.findUnique({ where: { key: "smtp_user" } });
    if (!userSetting?.value) {
      return NextResponse.json({ success: false, error: "لم يتم تكوين إعدادات SMTP" });
    }

    const ok = await sendEmail({
      to: userSetting.value,
      subject: "رسالة تجريبية — نظام الموارد البشرية",
      html: `
        <h2 style="color:#1e40af">رسالة تجريبية</h2>
        <p>هذه رسالة تجريبية من نظام الموارد البشرية للتحقق من إعدادات البريد الإلكتروني.</p>
        <p style="color:#16a34a;font-weight:bold">✓ الإعدادات تعمل بشكل صحيح!</p>
      `,
    });

    return NextResponse.json({ success: ok, error: ok ? null : "فشل الإرسال — تحقق من الإعدادات" });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
