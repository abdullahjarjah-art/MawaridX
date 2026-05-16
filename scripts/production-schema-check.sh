#!/bin/sh
# يتأكد من تطابق Schema الإنتاج مع schema.prisma بعد كل rebuild.
# يُشغَّل داخل الحاوية بعد docker-entrypoint.sh.
#
# Usage (host side):
#   docker exec mawaridx-company-a sh /app/scripts/production-schema-check.sh
#
# أو أضفه لـ docker-entrypoint.sh ليعمل أوتوماتيكياً.

set -e
cd /app

echo "── فحص توافق Schema مع DB ──"

# قائمة الجداول والأعمدة الحرجة التي رصدنا غيابها سابقاً
# (يمكن توسيعها مع توسع المخطط)
node -e "
const Database = require('better-sqlite3');
const fs = require('fs');
const dbPath = process.env.DATABASE_URL?.replace('file:', '').replace('./','') || 'data/hr.db';
if (!fs.existsSync(dbPath)) { console.log('DB not found at', dbPath); process.exit(1); }
const db = new Database(dbPath, { readonly: true });

const required = {
  Attendance: ['source'],
  FingerprintDevice: ['*table*'],
  Folder: ['*table*'],
  CompanyDocumentFile: ['*table*'],
};

let missing = 0;
for (const [tbl, cols] of Object.entries(required)) {
  const exists = db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').get('table', tbl);
  if (!exists) { console.log('❌ جدول مفقود:', tbl); missing++; continue; }
  if (cols[0] === '*table*') { console.log('✅ جدول موجود:', tbl); continue; }
  const tcols = db.prepare('PRAGMA table_info(' + tbl + ')').all().map(c => c.name);
  for (const c of cols) {
    if (!tcols.includes(c)) { console.log('❌ عمود مفقود:', tbl + '.' + c); missing++; }
    else console.log('✅', tbl + '.' + c, 'موجود');
  }
}
process.exit(missing > 0 ? 2 : 0);
"

# لو فيه أعمدة/جداول ناقصة، شغّل db push لمحاذاة الـ schema
if [ \$? -ne 0 ]; then
  echo ""
  echo "⚠️  Schema drift detected — running prisma db push to align"
  npx prisma db push --accept-data-loss --skip-generate
  echo "✅ Schema aligned"
fi
