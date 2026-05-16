// ──────────────────────────────────────────────────────────
// MawaridX — Feature Flags (Plan Tiers Removed)
// ──────────────────────────────────────────────────────────
// تم إلغاء نظام الخطط — كل الميزات مفعّلة لجميع الحسابات.
// تم إبقاء نفس الـ exports حتى لا ينكسر أي استدعاء قائم.
// ──────────────────────────────────────────────────────────

export type FeatureMap = {
  // ميزات الحضور
  gpsAttendance: boolean;
  shiftScheduling: boolean;

  // ميزات الرواتب
  advancedPayroll: boolean;
  customLetters: boolean;

  // ميزات HR
  performanceReviews: boolean;
  trainingTracking: boolean;
  recruitment: boolean;

  // ميزات تنفيذية
  aiInsights: boolean;
  customBranding: boolean;
  apiAccess: boolean;

  // حدود (عُليا — بلا قيود فعلية)
  maxEmployees: number;
  maxStorageGB: number;
  backupRetentionDays: number;
};

export type Plan = "unified";

const ALL_ON: FeatureMap = {
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
  maxEmployees:        999999,
  maxStorageGB:        999999,
  backupRetentionDays: 3650,
};

/** خطة موحّدة واحدة لجميع الحسابات */
export function getCurrentPlan(): Plan {
  return "unified";
}

/** كل الميزات مفعّلة دائماً */
export function getFeatures(): FeatureMap {
  return ALL_ON;
}

/** تحقق من ميزة — يرجع دائماً true / الحد الأعلى */
export function hasFeature<K extends keyof FeatureMap>(name: K): FeatureMap[K] {
  return ALL_ON[name];
}

/**
 * شيكر للـ API routes — لم يعد يحجب شيئاً بعد إلغاء الخطط.
 * يبقى موجوداً للتوافق مع نقاط الاستدعاء الحالية.
 */
export function featureGuard(_name: keyof FeatureMap) {
  return null;
}

/** Proxy متاح للقراءة من أي مكان */
export const features = new Proxy({} as FeatureMap, {
  get(_t, prop: string) {
    return ALL_ON[prop as keyof FeatureMap];
  },
});

/** بيانات الخطة — تُعرض كـ "النسخة الكاملة" في UI */
export function getPlanInfo() {
  return {
    plan: "unified" as Plan,
    features: ALL_ON,
    label: "النسخة الكاملة",
  };
}
