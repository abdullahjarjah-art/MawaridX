/**
 * OTP store — In-memory (مناسب لـ single-process Docker)
 * رمز مؤقت صالح 10 دقائق يُرسل للسوبر أدمن عند تسجيل الدخول
 */

type OtpEntry = {
  code: string;
  expiry: number;
  // بيانات الجلسة المؤجلة حتى التحقق
  userId: string;
  email: string;
  role: string;
  employeeId?: string;
};

const store = new Map<string, OtpEntry>();

// تنظيف دوري كل 5 دقائق
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiry) store.delete(key);
  }
}, 5 * 60_000);

/** توليد رمز 6 أرقام */
function generateCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/** إنشاء OTP وتخزينه — يُعيد الرمز والمفتاح */
export function createOtp(userId: string, email: string, role: string, employeeId?: string) {
  const code = generateCode();
  const key = `otp:${userId}`;
  store.set(key, {
    code,
    expiry: Date.now() + 10 * 60_000, // 10 دقائق
    userId,
    email,
    role,
    employeeId,
  });
  return { code, key };
}

/** التحقق من OTP — يُعيد بيانات الجلسة أو null */
export function verifyOtp(userId: string, code: string): OtpEntry | null {
  const key = `otp:${userId}`;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) { store.delete(key); return null; }
  if (entry.code !== code.trim()) return null;
  store.delete(key); // استخدام مرة واحدة
  return entry;
}
