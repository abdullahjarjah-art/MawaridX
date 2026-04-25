import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendEmployeeInviteEmail } from "@/lib/email";

const COL_MAP: Record<string, string> = {
  "الاسم الأول": "firstName",
  "الاسم الأخير": "lastName",
  "الاسم بالعربي": "arabicName",
  "البريد الإلكتروني": "email",
  "الجوال": "phone",
  "رقم الهوية": "nationalId",
  "تاريخ الميلاد": "birthDate",
  "الجنس": "gender",
  "الحالة الاجتماعية": "maritalStatus",
  "المدينة": "city",
  "المسمى الوظيفي": "jobTitle",
  "الدور": "position",
  "القسم": "department",
  "نوع التوظيف": "employmentType",
  "تاريخ الالتحاق": "startDate",
  "الراتب الأساسي": "basicSalary",
  "بدل سكن": "housingAllowance",
  "بدل نقل": "transportAllowance",
  "بدلات أخرى": "otherAllowance",
  "البنك": "bankName",
  "IBAN": "iban",
  "الجنسية": "nationality",
  "تاريخ انتهاء الإقامة": "iqamaExpiry",
};

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial number
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date;
  }
  if (typeof val === "string" && val.trim()) {
    const d = new Date(val.trim());
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function nullIfEmpty(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rows.length === 0) return NextResponse.json({ error: "الملف فارغ" }, { status: 400 });
  if (rows.length > 500) return NextResponse.json({ error: "الحد الأقصى 500 موظف في كل مرة" }, { status: 400 });

  // تحويل الأعمدة العربية إلى أسماء الحقول
  const normalized = rows.map(row => {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      const field = COL_MAP[key.trim()] ?? key.trim();
      out[field] = val;
    }
    return out;
  });

  // فحص مسبق للتكرار في قاعدة البيانات
  const emails = normalized.map(r => String(r.email ?? "").trim().toLowerCase()).filter(Boolean);
  const nationalIds = normalized.map(r => String(r.nationalId ?? "").trim()).filter(Boolean);

  const existing = await prisma.employee.findMany({
    where: {
      OR: [
        ...(emails.length ? [{ email: { in: emails } }] : []),
        ...(nationalIds.length ? [{ nationalId: { in: nationalIds } }] : []),
      ],
    },
    select: { email: true, nationalId: true },
  });

  const dbEmails = new Set(existing.map(e => e.email.toLowerCase()));
  const dbNationalIds = new Set(existing.map(e => e.nationalId).filter(Boolean) as string[]);

  let baseCount = await prisma.employee.count();
  const seenEmails = new Set<string>();
  const seenNationalIds = new Set<string>();

  const succeeded: string[] = [];
  const failed: { row: number; name: string; error: string }[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    const rowNum = i + 2;
    const firstName = String(r.firstName ?? "").trim();
    const lastName = String(r.lastName ?? "").trim();
    const name = `${firstName} ${lastName}`.trim() || `الصف ${rowNum}`;
    const email = String(r.email ?? "").trim().toLowerCase();

    try {
      if (!firstName) throw new Error("الاسم الأول مطلوب");
      if (!lastName) throw new Error("الاسم الأخير مطلوب");
      if (!email) throw new Error("البريد الإلكتروني مطلوب");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("صيغة البريد الإلكتروني غير صحيحة");
      if (seenEmails.has(email)) throw new Error("البريد الإلكتروني مكرر في الملف");
      if (dbEmails.has(email)) throw new Error("البريد الإلكتروني مستخدم مسبقاً");

      const nationalId = nullIfEmpty(r.nationalId);
      if (nationalId) {
        if (seenNationalIds.has(nationalId)) throw new Error("رقم الهوية مكرر في الملف");
        if (dbNationalIds.has(nationalId)) throw new Error("رقم الهوية مستخدم مسبقاً");
        seenNationalIds.add(nationalId);
      }

      seenEmails.add(email);
      baseCount++;

      // إنشاء حساب مستخدم مع token دعوة (48 ساعة)
      const resetToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const tempHash = await bcrypt.hash(crypto.randomUUID(), 10); // كلمة مرور مؤقتة عشوائية
      const user = await prisma.user.create({
        data: {
          email,
          password: tempHash,
          role: "employee",
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      await prisma.employee.create({
        data: {
          employeeNumber: `EMP${String(baseCount).padStart(4, "0")}`,
          firstName,
          lastName,
          arabicName: nullIfEmpty(r.arabicName),
          email,
          phone: nullIfEmpty(r.phone),
          nationalId,
          birthDate: parseDate(r.birthDate),
          gender: nullIfEmpty(r.gender),
          maritalStatus: nullIfEmpty(r.maritalStatus),
          city: nullIfEmpty(r.city),
          jobTitle: nullIfEmpty(r.jobTitle),
          position: nullIfEmpty(r.position) ?? "employee",
          department: nullIfEmpty(r.department),
          employmentType: nullIfEmpty(r.employmentType) ?? "full_time",
          startDate: parseDate(r.startDate) ?? new Date(),
          basicSalary: parseFloat(String(r.basicSalary || 0)) || 0,
          housingAllowance: parseFloat(String(r.housingAllowance || 0)) || 0,
          transportAllowance: parseFloat(String(r.transportAllowance || 0)) || 0,
          otherAllowance: parseFloat(String(r.otherAllowance || 0)) || 0,
          bankName: nullIfEmpty(r.bankName),
          iban: nullIfEmpty(r.iban),
          nationality: nullIfEmpty(r.nationality) ?? "saudi",
          iqamaExpiry: parseDate(r.iqamaExpiry),
          userId: user.id,
        },
      });

      // إرسال إيميل الدعوة (لا نوقف الاستيراد لو فشل الإيميل)
      sendEmployeeInviteEmail(email, firstName, resetToken).catch(() => {});

      succeeded.push(name);
    } catch (err) {
      failed.push({
        row: rowNum,
        name,
        error: err instanceof Error ? err.message : "خطأ غير معروف",
      });
    }
  }

  return NextResponse.json({
    success: succeeded.length,
    failed: failed.length,
    failedRows: failed,
  });
}
