// ──────────────────────────────────────────────────────────
// MawaridX — Feature Flags + Plan Tiers
// ──────────────────────────────────────────────────────────
// Each tenant container gets its own COMPANY_PLAN env var
// (set in docker-compose.yml). This file maps the plan to a
// boolean feature map so UI/API can branch on it.
//
// To add a new feature:
//   1. Add it to FeatureMap below
//   2. Add it to each plan in PLAN_FEATURES
//   3. Use `features.<name>` anywhere — no env access scattered around
// ──────────────────────────────────────────────────────────

export type FeatureMap = {
  // ميزات الحضور
  gpsAttendance: boolean;        // تتبع الحضور بـ GPS / geofence
  shiftScheduling: boolean;      // جداول الدوام المتقدمة

  // ميزات الرواتب
  advancedPayroll: boolean;      // اشتقاقات معقدة، WPS، تقارير
  customLetters: boolean;        // قوالب خطابات مخصصة

  // ميزات HR
  performanceReviews: boolean;   // تقييم الأداء
  trainingTracking: boolean;     // تتبع التدريب
  recruitment: boolean;          // وحدة التوظيف

  // ميزات تنفيذية
  aiInsights: boolean;           // مساعد ذكي (لاحقاً)
  customBranding: boolean;       // شعار + ألوان مخصصة
  apiAccess: boolean;            // API خارجي

  // حدود
  maxEmployees: number;          // الحد الأقصى للموظفين
  maxStorageGB: number;          // الحد الأقصى للتخزين
  backupRetentionDays: number;   // مدة الاحتفاظ بالنسخ الاحتياطية
};

export type Plan = "trial" | "basic" | "growth" | "business" | "enterprise";

// ──────────────────────────────────────────────────────────
// خريطة الخطط — كل خطة تفعّل/تعطّل ميزات معينة
// ──────────────────────────────────────────────────────────
const PLAN_FEATURES: Record<Plan, FeatureMap> = {
  trial: {
    gpsAttendance:       false,
    shiftScheduling:     true,
    advancedPayroll:     false,
    customLetters:       false,
    performanceReviews:  true,
    trainingTracking:    false,
    recruitment:         false,
    aiInsights:          false,
    customBranding:      false,
    apiAccess:           false,
    maxEmployees:        10,
    maxStorageGB:        1,
    backupRetentionDays: 7,
  },
  basic: {
    gpsAttendance:       false,
    shiftScheduling:     true,
    advancedPayroll:     false,
    customLetters:       true,
    performanceReviews:  true,
    trainingTracking:    true,
    recruitment:         false,
    aiInsights:          false,
    customBranding:      true,    // ← حسب طلب الـ branding يكون متاح من basic
    apiAccess:           false,
    maxEmployees:        50,
    maxStorageGB:        5,
    backupRetentionDays: 14,
  },
  growth: {
    gpsAttendance:       true,
    shiftScheduling:     true,
    advancedPayroll:     true,
    customLetters:       true,
    performanceReviews:  true,
    trainingTracking:    true,
    recruitment:         true,
    aiInsights:          false,
    customBranding:      true,
    apiAccess:           false,
    maxEmployees:        200,
    maxStorageGB:        20,
    backupRetentionDays: 30,
  },
  business: {
    gpsAttendance:       true,
    shiftScheduling:     true,
    advancedPayroll:     true,
    customLetters:       true,
    performanceReviews:  true,
    trainingTracking:    true,
    recruitment:         true,
    aiInsights:          true,
    customBranding:      true,
    apiAccess:           true,
    maxEmployees:        1000,
    maxStorageGB:        100,
    backupRetentionDays: 60,
  },
  enterprise: {
    gpsAttendance:       true,
    shiftScheduling:     true,
    advancedPayroll:     true,
    customLetters:       true,
    performanceReviews:  true,
    trainingTracking:    true,
    recruitment:         true,
    aiInsights:          true,
    customBranding:      true,
    apiAccess:           true,
    maxEmployees:        99999,
    maxStorageGB:        500,
    backupRetentionDays: 365,
  },
};

// ──────────────────────────────────────────────────────────
// Helpers — استخدمها في API و UI
// ──────────────────────────────────────────────────────────

/** قراءة الخطة الحالية من env (مع fallback آمن) */
export function getCurrentPlan(): Plan {
  const raw = (process.env.COMPANY_PLAN ?? "trial").toLowerCase();
  if (raw in PLAN_FEATURES) return raw as Plan;
  return "trial";
}

/** خريطة الميزات الحالية — حسب الخطة */
export function getFeatures(): FeatureMap {
  return PLAN_FEATURES[getCurrentPlan()];
}

/** تحقق سريع من ميزة واحدة */
export function hasFeature<K extends keyof FeatureMap>(name: K): FeatureMap[K] {
  return getFeatures()[name];
}

/**
 * شيكر للـ API routes — يرد 404 لو الميزة معطّلة
 *
 * @example
 *   const r = featureGuard("gpsAttendance");
 *   if (r) return r;
 */
export function featureGuard(name: keyof FeatureMap) {
  const enabled = hasFeature(name);
  if (typeof enabled === "boolean" && !enabled) {
    // Not importing NextResponse here to avoid circular deps in non-API code
    return new Response(JSON.stringify({ error: "الميزة غير متاحة في خطتك الحالية" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

/** للاستخدام في صفحات SSR / route handlers */
export const features = new Proxy({} as FeatureMap, {
  get(_target, prop: string) {
    return getFeatures()[prop as keyof FeatureMap];
  },
});

/** بيانات الخطة الحالية للعرض في UI */
export function getPlanInfo() {
  const plan = getCurrentPlan();
  return {
    plan,
    features: PLAN_FEATURES[plan],
    label: {
      trial:      "النسخة التجريبية",
      basic:      "الخطة الأساسية",
      growth:     "خطة النمو",
      business:   "خطة الأعمال",
      enterprise: "خطة المؤسسات",
    }[plan],
  };
}
