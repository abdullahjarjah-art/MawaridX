/**
 * Rate Limiter — In-memory (مناسب لـ SQLite / Docker per-company)
 * كل container = process واحد، الـ Map تبقى في الذاكرة طوال عمر السيرفر
 */

type Entry = {
  count: number;
  firstAt: number;
  blockedUntil?: number;
};

const store = new Map<string, Entry>();

// تنظيف دوري كل 10 دقائق — يحذف الإدخالات القديمة (أكثر من ساعة)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    const stale = entry.blockedUntil
      ? now > entry.blockedUntil + 60_000
      : now - entry.firstAt > 60 * 60 * 1000;
    if (stale) store.delete(key);
  }
}, 10 * 60 * 1000);

export type RateLimitConfig = {
  /** نافذة الوقت بالمللي ثانية */
  windowMs: number;
  /** أقصى عدد طلبات في النافذة */
  max: number;
  /** مدة الحظر بعد تجاوز الحد (اختياري — افتراضي: باقي النافذة) */
  blockMs?: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export function checkRateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // ── محظور؟ ──
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }

  // ── نافذة جديدة أو انتهت ──
  if (!entry || now - entry.firstAt > cfg.windowMs) {
    store.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }

  // ── داخل النافذة ──
  entry.count += 1;

  if (entry.count > cfg.max) {
    const blockMs = cfg.blockMs ?? cfg.windowMs - (now - entry.firstAt);
    entry.blockedUntil = now + blockMs;
    return { allowed: false, retryAfterMs: blockMs };
  }

  return { allowed: true };
}

/** رد جاهز 429 مع رسالة عربية وـ headers مناسبة */
export function rateLimitResponse(retryAfterMs: number): Response {
  const secs = Math.ceil(retryAfterMs / 1000);
  const msg =
    secs < 60
      ? `حاول مجدداً بعد ${secs} ثانية`
      : `حاول مجدداً بعد ${Math.ceil(secs / 60)} دقيقة`;

  return new Response(JSON.stringify({ error: `تجاوزت الحد المسموح — ${msg}` }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(secs),
      "X-RateLimit-Reset": String(Date.now() + retryAfterMs),
    },
  });
}

/** استخراج IP من الطلب */
export function getIP(req: Request): string {
  return (
    (req.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ??
    (req.headers as Headers).get("x-real-ip") ??
    "unknown"
  );
}

// ── إعدادات جاهزة للمسارات الحساسة ──
export const LIMITS = {
  /** تسجيل الدخول: 5 محاولات / 15 دقيقة — حظر 30 دقيقة */
  login: { windowMs: 15 * 60_000, max: 5, blockMs: 30 * 60_000 } satisfies RateLimitConfig,

  /** نسيان كلمة المرور: 3 طلبات / ساعة */
  forgotPassword: { windowMs: 60 * 60_000, max: 3, blockMs: 60 * 60_000 } satisfies RateLimitConfig,

  /** API عام: 120 طلب / دقيقة */
  api: { windowMs: 60_000, max: 120 } satisfies RateLimitConfig,
} as const;
