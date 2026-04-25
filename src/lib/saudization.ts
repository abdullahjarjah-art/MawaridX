import { prisma } from "@/lib/prisma";

/**
 * نطاقات السعودة (Nitaqat) — تصنيف منشآت القطاع الخاص
 * النسب تختلف حسب القطاع وعدد الموظفين، لكن هذي القيم
 * الأقرب لمتوسط القطاعات السعودية. القيم قابلة للتعديل
 * من إعدادات النظام.
 */
export const NITAQAT_BANDS = [
  { id: "platinum",   name: "بلاتيني",  minPercent: 40, color: "#0ea5e9" },
  { id: "high_green", name: "أخضر مرتفع", minPercent: 20, color: "#16a34a" },
  { id: "med_green",  name: "أخضر متوسط", minPercent: 12, color: "#65a30d" },
  { id: "low_green",  name: "أخضر منخفض", minPercent: 6,  color: "#84cc16" },
  { id: "yellow",     name: "أصفر",     minPercent: 4,  color: "#eab308" },
  { id: "red",        name: "أحمر",     minPercent: 0,  color: "#dc2626" },
] as const;

export type BandId = typeof NITAQAT_BANDS[number]["id"];

/** يحدد النطاق الحالي حسب النسبة */
export function getBand(percent: number) {
  return NITAQAT_BANDS.find(b => percent >= b.minPercent) ?? NITAQAT_BANDS[NITAQAT_BANDS.length - 1];
}

/** حساب الإحصائيات الحالية */
export async function calculateSaudization() {
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { nationality: true },
  });

  const total = employees.length;
  const saudis = employees.filter(e => e.nationality === "saudi").length;
  const nonSaudis = total - saudis;
  const percent = total === 0 ? 0 : Math.round((saudis / total) * 1000) / 10; // دقة عشرية واحدة

  // النطاق المستهدف من الإعدادات
  const targetSetting = await prisma.setting.findUnique({ where: { key: "saudization_target" } });
  const targetBand = (targetSetting?.value as BandId) ?? "med_green";
  const targetCfg = NITAQAT_BANDS.find(b => b.id === targetBand) ?? NITAQAT_BANDS[2];

  const currentBand = getBand(percent);
  const isAtTarget = percent >= targetCfg.minPercent;

  // كم سعودي ناقص للوصول للنطاق المستهدف؟
  // النسبة المستهدفة = saudisNeeded / (saudisNeeded + nonSaudis)
  // saudisNeeded = (target * nonSaudis) / (1 - target)
  let saudisNeeded = 0;
  if (!isAtTarget && targetCfg.minPercent < 100) {
    const target = targetCfg.minPercent / 100;
    const needed = Math.ceil((target * nonSaudis) / (1 - target));
    saudisNeeded = Math.max(0, needed - saudis);
  }

  return {
    total,
    saudis,
    nonSaudis,
    percent,
    currentBand,
    targetBand: targetCfg,
    isAtTarget,
    saudisNeeded,
  };
}
