import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// يُستدعى من dashboard أو cron لإرسال إشعارات انتهاء الصلاحية
export async function POST() {
  const session = await getSession();
  if (!session || (session.role !== "hr" && session.role !== "admin")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const now   = new Date();
  const docs  = await prisma.companyDocument.findMany({
    where: {
      isActive:   true,
      expiryDate: { not: null },
    },
    select: { id: true, title: true, expiryDate: true, notifyDaysBefore: true, notifiedAt: true },
  });

  const notified: string[] = [];

  for (const doc of docs) {
    if (!doc.expiryDate) continue;
    const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / 86400000);
    const shouldNotify = daysLeft >= 0 && daysLeft <= (doc.notifyDaysBefore ?? 30);

    // لا نرسل إشعار إذا أُرسل خلال آخر 24 ساعة
    if (!shouldNotify) continue;
    if (doc.notifiedAt) {
      const lastNotify = new Date(doc.notifiedAt);
      const hoursSinceLast = (now.getTime() - lastNotify.getTime()) / 3600000;
      if (hoursSinceLast < 24) continue;
    }

    // جلب المديرين وHR لإرسال إشعار لهم
    const hrUsers = await prisma.employee.findMany({
      where: {
        user: { role: { in: ["hr", "admin"] } },
        status: "active",
      },
      select: { id: true },
    });

    const message = daysLeft === 0
      ? `مستند "${doc.title}" ينتهي اليوم!`
      : `مستند "${doc.title}" ينتهي خلال ${daysLeft} يوم`;

    await Promise.all(
      hrUsers.map(u =>
        prisma.notification.create({
          data: {
            recipientId: u.id,
            title:       "تذكير: انتهاء صلاحية مستند",
            message,
            type:        daysLeft <= 7 ? "rejection" : "info",
            relatedId:   doc.id,
          },
        })
      )
    );

    await prisma.companyDocument.update({
      where: { id: doc.id },
      data:  { notifiedAt: now },
    });

    notified.push(doc.title);
  }

  return NextResponse.json({ notified, count: notified.length });
}

// GET: جلب المستندات القاربة على الانتهاء (للـ dashboard)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const now  = new Date();
  const docs = await prisma.companyDocument.findMany({
    where: { isActive: true, expiryDate: { not: null } },
    select: { id: true, title: true, expiryDate: true, notifyDaysBefore: true, category: true },
    orderBy: { expiryDate: "asc" },
  });

  const alerts = docs
    .map(d => {
      const daysLeft = Math.ceil((new Date(d.expiryDate!).getTime() - now.getTime()) / 86400000);
      return { ...d, daysLeft };
    })
    .filter(d => d.daysLeft <= (d.notifyDaysBefore ?? 30))
    .slice(0, 10);

  return NextResponse.json(alerts);
}
