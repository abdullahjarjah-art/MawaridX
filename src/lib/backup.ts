// Server-only module — uses Node.js built-ins (fs, path)
// Lazy require() instead of top-level import so webpack can apply
// resolve.fallback: { fs: false } without throwing "Module not found"
/* eslint-disable @typescript-eslint/no-require-imports */

type NodeFS   = typeof import("fs");
type NodePath = typeof import("path");
const _fs   = (): NodeFS   => require("fs");
const _path = (): NodePath => require("path");

// يتزامن مع lib/prisma.ts — يقرأ من DATABASE_URL أو fallback إلى data/hr.db
function resolveDbPath(): string {
  const p = _path();
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) {
    const rel = url.slice("file:".length);
    return p.isAbsolute(rel) ? rel : p.join(process.cwd(), rel);
  }
  return p.join(process.cwd(), "data", "hr.db");
}
const DB_PATH    = resolveDbPath();
const BACKUP_DIR = _path().join(process.cwd(), "backups");
const MAX_BACKUPS = 14; // احتفظ بآخر 14 نسخة

export type BackupMeta = {
  name: string;
  sizeBytes: number;
  createdAt: Date;
};

function ensureDir() {
  const fs = _fs();
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** إنشاء نسخة احتياطية — يعيد اسم الملف */
export function createBackup(): string {
  const fs   = _fs();
  const path = _path();
  ensureDir();
  if (!fs.existsSync(DB_PATH)) throw new Error("ملف قاعدة البيانات غير موجود");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name  = `backup-${stamp}.db`;
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, name));

  // تدوير: احذف الأقدم إذا تجاوز الحد
  const all = listBackups().slice(MAX_BACKUPS);
  for (const b of all) fs.unlinkSync(path.join(BACKUP_DIR, b.name));

  return name;
}

/** قائمة النسخ الاحتياطية مرتبة من الأحدث */
export function listBackups(): BackupMeta[] {
  const fs   = _fs();
  const path = _path();
  ensureDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f: string) => f.startsWith("backup-") && f.endsWith(".db"))
    .map((name: string) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, sizeBytes: stat.size, createdAt: stat.mtime };
    })
    .sort((a: BackupMeta, b: BackupMeta) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** حذف نسخة احتياطية */
export function deleteBackup(name: string): boolean {
  if (!name.match(/^backup-[\d\-T]+\.db$/) || name.includes("/") || name.includes("\\")) return false;
  const fs   = _fs();
  const path = _path();
  const filePath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** قراءة ملف نسخة للتحميل */
export function readBackup(name: string): Buffer | null {
  if (!name.match(/^backup-[\d\-T]+\.db$/) || name.includes("/") || name.includes("\\")) return null;
  const fs   = _fs();
  const path = _path();
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
