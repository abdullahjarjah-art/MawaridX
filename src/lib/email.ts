import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

type EmailParams = {
  to: string;
  subject: string;
  html: string;
};

async function getSmtpSettings() {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: "smtp_" } },
  });
  const map: Record<string, string> = {};
  settings.forEach((s) => (map[s.key] = s.value));
  return map;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings();
    if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_pass) return false;

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: Number(smtp.smtp_port ?? 587),
      secure: smtp.smtp_secure === "true",
      auth: {
        user: smtp.smtp_user,
        pass: smtp.smtp_pass,
      },
    });

    await transporter.sendMail({
      from: smtp.smtp_from ?? smtp.smtp_user,
      to,
      subject,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px">${html}</div>`,
    });

    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

function baseTemplate(content: string) {
  return `
    <div style="max-width:540px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;direction:rtl">
      <div style="background:linear-gradient(135deg,#0284c7,#0ea5e9);padding:28px 24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px">MawaridX</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px">نظام إدارة الموارد البشرية</p>
      </div>
      <div style="background:#ffffff;padding:32px 28px;border:1px solid #e5e7eb;border-top:none">
        ${content}
      </div>
      <div style="background:#f8fafc;padding:14px 24px;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0;font-size:11px;color:#94a3b8">هذه رسالة آلية من MawaridX — يُرجى عدم الرد عليها</p>
      </div>
    </div>
  `;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/** إيميل دعوة موظف جديد لضبط كلمة مروره */
export async function sendEmployeeInviteEmail(
  to: string,
  name: string,
  resetToken: string,
) {
  const link = `${appUrl()}/reset-password?token=${resetToken}`;
  return sendEmail({
    to,
    subject: "مرحباً بك في MawaridX — فعّل حسابك",
    html: baseTemplate(`
      <p style="margin:0 0 6px;font-size:15px;color:#0f172a;font-weight:700">مرحباً ${name}،</p>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7">
        تمت إضافتك إلى نظام MawaridX لإدارة الموارد البشرية.<br>
        اضغط على الزر أدناه لتفعيل حسابك وضبط كلمة مرورك.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:700">
          تفعيل الحساب وضبط كلمة المرور
        </a>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        الرابط صالح لمدة 48 ساعة · إذا لم تطلب هذا الحساب تجاهل هذه الرسالة
      </p>
    `),
  });
}

/** إيميل ترحيب لأدمن الشركة الجديدة */
export async function sendCompanyWelcomeEmail(
  to: string,
  adminName: string,
  companyName: string,
  password: string,
) {
  const loginUrl = `${appUrl()}/login`;
  return sendEmail({
    to,
    subject: `مرحباً بـ ${companyName} في MawaridX`,
    html: baseTemplate(`
      <p style="margin:0 0 6px;font-size:15px;color:#0f172a;font-weight:700">مرحباً ${adminName}،</p>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7">
        تم إنشاء حساب شركتك <strong>${companyName}</strong> بنجاح على منصة MawaridX.<br>
        يمكنك الدخول مباشرةً باستخدام البيانات التالية:
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">بيانات الدخول</p>
        <p style="margin:0 0 4px;font-size:14px;color:#0f172a"><strong>البريد الإلكتروني:</strong> ${to}</p>
        <p style="margin:0;font-size:14px;color:#0f172a"><strong>كلمة المرور:</strong> ${password}</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:700">
          الدخول إلى النظام
        </a>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        يُنصح بتغيير كلمة المرور بعد أول دخول
      </p>
    `),
  });
}

export async function sendNotificationEmail(employeeEmail: string, title: string, message: string) {
  return sendEmail({
    to: employeeEmail,
    subject: `MawaridX — ${title}`,
    html: baseTemplate(`
      <h3 style="margin:0 0 12px;color:#0284c7;font-size:16px">${title}</h3>
      <p style="color:#374151;line-height:1.7;margin:0;font-size:14px">${message}</p>
    `),
  });
}
