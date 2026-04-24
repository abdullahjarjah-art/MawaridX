import type { CapacitorConfig } from "@capacitor/cli";

// ══════════════════════════════════════════════════════
// هذا الملف يُعدَّل لكل شركة قبل البناء
// ══════════════════════════════════════════════════════

const config: CapacitorConfig = {
  // ── معرّف التطبيق الفريد (يختلف لكل شركة) ──
  appId: "com.mawaridx.hr",           // غيّره لكل شركة: com.alnoor.hr / com.company.hr
  appName: "بوابة الموظف",              // اسم التطبيق في المتجر

  // ── يشير للسيرفر الحي — لا يحتاج بناء static ──
  server: {
    url: "https://hr.your-company.com/portal", // رابط بوابة الموظف للشركة
    cleartext: false,    // true فقط للتطوير المحلي
    androidScheme: "https",
  },

  // ── Android ──
  android: {
    buildOptions: {
      keystoreAlias: "mawaridx",
    },
    backgroundColor: "#f0f9ff",
    allowMixedContent: false,
  },

  // ── iOS ──
  ios: {
    backgroundColor: "#f0f9ff",
    contentInset: "always",
    scheme: "بوابة الموظف",
  },

  // ── إضافات ──
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#0284c7",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
