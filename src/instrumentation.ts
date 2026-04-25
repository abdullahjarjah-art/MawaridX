// يُشغَّل مرة واحدة عند بدء Next.js server
export async function register() {
  // تشغيل فقط في Node.js runtime (وليس في Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

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
