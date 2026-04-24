#!/bin/bash
# ══════════════════════════════════════════════
# build-app.sh — بناء تطبيق لشركة محددة
# الاستخدام: bash build-app.sh "اسم الشركة" "com.company.hr" "https://hr.company.com"
# مثال:     bash build-app.sh "شركة النور" "com.alnoor.hr" "https://hr.alnoor.com"
# ══════════════════════════════════════════════

APP_NAME=${1:-"بوابة الموظف"}
APP_ID=${2:-"com.mawaridx.hr"}
SERVER_URL=${3:-"https://hr.your-company.com/portal"}

echo "📱 بناء تطبيق: $APP_NAME"
echo "🔑 Bundle ID: $APP_ID"
echo "🌐 الخادم: $SERVER_URL"
echo ""

# 1. تعديل capacitor.config.ts
cat > capacitor.config.ts << EOF
import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "$APP_ID",
  appName: "$APP_NAME",
  server: {
    url: "$SERVER_URL",
    cleartext: false,
    androidScheme: "https",
  },
  android: { backgroundColor: "#f0f9ff" },
  ios: { backgroundColor: "#f0f9ff", contentInset: "always" },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 2000, backgroundColor: "#0284c7" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};
export default config;
EOF

# 2. مزامنة مع Android / iOS
echo "🔄 مزامنة Capacitor..."
npx cap sync

echo ""
echo "════════════════════════════════════"
echo "✅ جاهز! الخطوة التالية:"
echo ""
echo "📱 Android:"
echo "   npx cap open android"
echo "   ← يفتح Android Studio، ثم Build → Generate Signed APK"
echo ""
echo "🍎 iOS (يحتاج Mac + Xcode):"
echo "   npx cap open ios"
echo "   ← يفتح Xcode، ثم Archive → Distribute"
echo "════════════════════════════════════"
