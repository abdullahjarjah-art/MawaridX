import { NextResponse } from "next/server";
import { getSession } from "./auth";

/**
 * قائمة إيميلات السوبر أدمن (ملّاك MawaridX).
 * يمكن تعديلها عبر المتغيّر البيئي SUPER_ADMIN_EMAILS مفصولة بفاصلة.
 */
export function getSuperAdminEmails(): string[] {
  const envList = process.env.SUPER_ADMIN_EMAILS;
  if (envList) {
    return envList.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  }
  // افتراضي: إيميل السوبر أدمن
  return ["abdullah.j.arjah@gmail.com", "superadmin@mawaridx.com"];
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getSuperAdminEmails().includes(email.toLowerCase());
}

/**
 * يتحقق من أن الطلب قادم من سوبر أدمن.
 * يستخدم في API routes: if (!ok) return res;
 */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      session: null,
      res: NextResponse.json({ error: "غير مسجّل الدخول" }, { status: 401 }),
    };
  }

  if (!isSuperAdminEmail(session.email)) {
    return {
      ok: false as const,
      session,
      res: NextResponse.json({ error: "غير مصرّح لك بالوصول" }, { status: 403 }),
    };
  }

  return { ok: true as const, session, res: null };
}
