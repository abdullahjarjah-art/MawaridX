// يُشغَّل مرة واحدة عند بدء Next.js server
export async function register() {
  // تشغيل فقط في Node.js runtime (وليس في Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // ── Production env validation: fail-fast on missing critical vars ──
  if (process.env.NODE_ENV === "production") {
    const required = ["JWT_SECRET"];
    const missing = required.filter(v => !process.env[v]);
    if (missing.length > 0) {
      const msg = `[security] FATAL: missing required env vars: ${missing.join(", ")}. Refusing to start.`;
      console.error(msg);
      throw new Error(msg);
    }
    if ((process.env.JWT_SECRET ?? "").length < 32) {
      const msg = "[security] FATAL: JWT_SECRET must be at least 32 characters. Generate with: openssl rand -base64 64";
      console.error(msg);
      throw new Error(msg);
    }
  }

  const { startAutoBackup, createBackup } = await import("./lib/backup");

  // نسخة احتياطية عند الإقلاع
  try {
    createBackup();
    console.log("[backup] نسخة عند الإقلاع تمت");
  } catch (e) {
    console.error("[backup] فشلت نسخة الإقلاع:", e);
  }

  // جدولة تلقائية كل 24 ساعة (قابل للتعديل)
  const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS ?? 24);
  startAutoBackup(intervalHours);
}
