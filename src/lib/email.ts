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

export async function sendNotificationEmail(employeeEmail: string, title: string, message: string) {
  return sendEmail({
    to: employeeEmail,
    subject: `نظام الموارد البشرية — ${title}`,
    html: `
      <div style="max-width:500px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#1e40af;color:white;padding:15px 20px;text-align:center">
          <h2 style="margin:0;font-size:16px">نظام الموارد البشرية</h2>
        </div>
        <div style="padding:25px 20px">
          <h3 style="margin:0 0 10px;color:#1e40af">${title}</h3>
          <p style="color:#374151;line-height:1.6;margin:0">${message}</p>
        </div>
        <div style="background:#f9fafb;padding:12px 20px;text-align:center;font-size:12px;color:#9ca3af">
          هذه رسالة آلية من نظام الموارد البشرية
        </div>
      </div>
    `,
  });
}
