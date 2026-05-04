#!/bin/bash
# ═══════════════════════════════════════════════════
# new-tenant.sh — إنشاء نسخة جديدة لشركة جديدة
# الاستخدام: bash new-tenant.sh <اسم_الشركة> <المنفذ>
# مثال:     bash new-tenant.sh al-noor 3001
# ═══════════════════════════════════════════════════

COMPANY=${1:-"company"}
PORT=${2:-3001}
TARGET_DIR="../hr-$COMPANY"

echo "🏢 إنشاء نسخة جديدة للشركة: $COMPANY على المنفذ $PORT"

# 1. نسخ المشروع
echo "📁 نسخ الملفات..."
cp -r . "$TARGET_DIR"
cd "$TARGET_DIR"

# 2. إنشاء قاعدة بيانات جديدة فارغة
echo "🗄️  إنشاء قاعدة بيانات جديدة..."
rm -f prisma/hr.db
npx prisma db push --skip-generate

# 3. إنشاء مستخدم HR
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./prisma/hr.db');
const hash = bcrypt.hashSync('Admin@123', 10);
const id = 'hr_' + Date.now();
db.prepare(\`
  INSERT INTO User (id, email, password, role, createdAt, updatedAt)
  VALUES (?, 'hr@$COMPANY.com', ?, 'hr', datetime('now'), datetime('now'))
\`).run(id, hash);
console.log('✅ تم إنشاء مستخدم HR: hr@$COMPANY.com / Admin@123');
db.close();
"

# 4. ضبط متغيرات البيئة
cat > .env.local << EOF
COMPANY_NAME=$COMPANY
PORT=$PORT
NEXT_PUBLIC_APP_URL=http://localhost:$PORT
EOF

echo ""
echo "════════════════════════════════════"
echo "✅ تم إنشاء نسخة شركة: $COMPANY"
echo "📂 المجلد: $TARGET_DIR"
echo "🔑 تسجيل الدخول:"
echo "   الإيميل: hr@$COMPANY.com"
echo "   كلمة المرور: Admin@123"
echo ""
echo "▶️  لتشغيل النسخة:"
echo "   cd $TARGET_DIR && PORT=$PORT npm run start"
echo "════════════════════════════════════"
