import fs from "fs";
import path from "path";

const DB_PATH   = path.join(process.cwd(), "prisma", "hr.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUPS = 14; // احتفظ بآخر 14 نسخة

export type BackupMeta = {
  name: string;
  sizeBytes: number;
  createdAt: Date;
};

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** إنشاء نسخة احتياطية — يعيد اسم الملف */
export function createBackup(): string {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) throw new Error("ملف قاعدة البيانات غير موجود");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2025-04-25T14-30-00
  const name  = `backup-${stamp}.db`;
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, name));

  // تدوير: احذف الأقدم إذا تجاوز الحد
  const all = listBackups().slice(MAX_BACKUPS);
  for (const b of all) fs.unlinkSync(path.join(BACKUP_DIR, b.name));

  return name;
}

/** قائمة النسخ الاحتياطية مرتبة من الأحدث */
export function listBackups(): BackupMeta[] {
  ensureDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith("backup-") && f.endsWith(".db"))
    .map(name => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, sizeBytes: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** حذف نسخة احتياطية */
export function deleteBackup(name: string): boolean {
  // أمان: منع path traversal
  if (!name.match(/^backup-[\d\-T]+\.db$/) || name.includes("/") || name.includes("\\")) return false;
  const filePath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** قراءة ملف نسخة للتحميل */
export function readBackup(name: string): Buffer | null {
  if (!name.match(/^backup-[\d\-T]+\.db$/) || name.includes("/") || name.includes("\\")) return null;
  const filePath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

// ── جدولة تلقائية ──
let _timer: ReturnType<typeof setInterval> | null = null;

export function startAutoBackup(intervalHours: number) {
  if (_timer) { clearInterval(_timer); _timer = null; }
  if (intervalHours <= 0) return;
  const ms = intervalHours * 60 * 60 * 1000;
  _timer = setInterval(() => {
    try { createBackup(); console.log("[backup] نسخة تلقائية تمت"); }
    catch (e) { console.error("[backup] فشلت النسخة التلقائية:", e); }
  }, ms);
  console.log(`[backup] جدولة تلقائية كل ${intervalHours} ساعة`);
}

export function stopAutoBackup() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
