import { prisma } from "@/lib/prisma";

// ── المهام الافتراضية ──
const DEFAULT_ONBOARDING = [
  { title: "استلام عقد العمل الموقع",            assignedTo: "hr",       order: 1 },
  { title: "رفع بيانات الموظف في نظام GOSI",     assignedTo: "hr",       order: 2 },
  { title: "إعداد بريد العمل وكلمة المرور",       assignedTo: "it",       order: 3 },
  { title: "تسليم الجهاز والأدوات",               assignedTo: "it",       order: 4 },
  { title: "تسليم بطاقة الهوية والدخول",          assignedTo: "hr",       order: 5 },
  { title: "التعريف بالفريق والإدارة",             assignedTo: "manager",  order: 6 },
  { title: "شرح سياسات الشركة ولوائح العمل",      assignedTo: "hr",       order: 7 },
  { title: "فتح حساب بنكي لصرف الراتب",           assignedTo: "employee", order: 8 },
  { title: "إكمال الملف الشخصي في النظام",         assignedTo: "employee", order: 9 },
];

const DEFAULT_OFFBOARDING = [
  { title: "تسليم جهاز العمل والأدوات",            assignedTo: "it",       order: 1 },
  { title: "إلغاء صلاحيات النظام والبريد",          assignedTo: "it",       order: 2 },
  { title: "تسوية الراتب والمستحقات النهائية",      assignedTo: "hr",       order: 3 },
  { title: "تسوية أيام الإجازة المتبقية",           assignedTo: "hr",       order: 4 },
  { title: "استلام بطاقة الهوية والدخول",           assignedTo: "hr",       order: 5 },
  { title: "تحديث بيانات المغادر في GOSI",          assignedTo: "hr",       order: 6 },
  { title: "إصدار شهادة الخبرة",                   assignedTo: "hr",       order: 7 },
  { title: "مقابلة الخروج مع المدير المباشر",       assignedTo: "manager",  order: 8 },
  { title: "إغلاق ملف الموظف وأرشفته",              assignedTo: "hr",       order: 9 },
];

/** تأكد وجود القوالب الافتراضية — ينشئها لو ما كانت موجودة */
export async function ensureDefaultTemplates() {
  const existing = await prisma.checklistTemplate.findMany();
  if (existing.some(t => t.type === "onboarding") && existing.some(t => t.type === "offboarding"))
    return;

  if (!existing.some(t => t.type === "onboarding")) {
    await prisma.checklistTemplate.create({
      data: { type: "onboarding", items: { create: DEFAULT_ONBOARDING } },
    });
  }
  if (!existing.some(t => t.type === "offboarding")) {
    await prisma.checklistTemplate.create({
      data: { type: "offboarding", items: { create: DEFAULT_OFFBOARDING } },
    });
  }
}

/** إنشاء checklist لموظف من القالب الافتراضي */
export async function createEmployeeChecklist(employeeId: string, type: "onboarding" | "offboarding") {
  // لا تنشئ مكرراً
  const exists = await prisma.employeeChecklist.findUnique({ where: { employeeId_type: { employeeId, type } } });
  if (exists) return exists;

  await ensureDefaultTemplates();
  const template = await prisma.checklistTemplate.findFirst({
    where: { type },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!template) return null;

  return prisma.employeeChecklist.create({
    data: {
      employeeId,
      type,
      items: {
        create: template.items.map(i => ({
          title: i.title,
          assignedTo: i.assignedTo,
          order: i.order,
        })),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
}
