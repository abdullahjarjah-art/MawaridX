import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { createNotification, notifyHR } from "@/lib/notifications";

const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة",
  unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin", "manager"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();
  const action = body.status; // "manager_approved" | "approved" | "rejected"

  // جلب الإجازة الحالية
  const current = await prisma.leave.findUnique({
    where: { id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, email: true, managerId: true } } },
  });
  if (!current) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const typeName = leaveTypeMap[current.type] ?? current.type;
  const empName = `${current.employee.firstName} ${current.employee.lastName}`;

  // رفض - يمكن للمدير أو الأدمن
  if (action === "rejected") {
    const record = await prisma.leave.update({
      where: { id },
      data: { status: "rejected", notes: body.notes },
    });

    // إشعار الموظف بالرفض (DB + Push)
    const msg = `تم رفض طلب إجازتك ${typeName} (${current.days} يوم)${body.notes ? ` — السبب: ${body.notes}` : ""}`;
    await createNotification({
      recipientId: current.employee.id,
      title: "تم رفض طلب إجازتك",
      message: msg,
      type: "rejection",
      relatedId: id,
      pushUrl: "/portal",
    });

    // سجل تدقيق
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userName: session.email,
        action: "reject",
        entity: "leave",
        entityId: id,
        details: `رفض إجازة ${empName} (${typeName})`,
      },
    });

    // بريد إلكتروني للموظف
    const smtpEnabled = await prisma.setting.findUnique({ where: { key: "smtp_enabled" } });
    if (smtpEnabled?.value === "true" && current.employee.email) {
      sendNotificationEmail(current.employee.email, "تم رفض طلب إجازتك", msg).catch(() => {});
    }

    return NextResponse.json(record);
  }

  // موافقة المدير المباشر (المرحلة الأولى)
  if (action === "manager_approved") {
    if (current.status !== "pending") {
      return NextResponse.json({ error: "الطلب ليس في حالة انتظار موافقة المدير" }, { status: 400 });
    }

    const record = await prisma.leave.update({
      where: { id },
      data: {
        status: "manager_approved",
        managerApprovedBy: session.userId,
        managerApprovedAt: new Date(),
        notes: body.notes,
      },
    });

    // إشعار الموظف بموافقة المدير (DB + Push)
    await createNotification({
      recipientId: current.employee.id,
      title: "وافق المدير على إجازتك",
      message: `وافق المدير على طلب إجازتك ${typeName} — بانتظار موافقة الإدارة`,
      type: "approval",
      relatedId: id,
      pushUrl: "/portal",
    });

    // إشعار HR + Push
    await notifyHR({
      title: "إجازة بانتظار الموافقة النهائية",
      message: `وافق المدير على إجازة ${empName} (${typeName} - ${current.days} يوم) — تنتظر موافقتك`,
      type: "leave",
      relatedId: id,
      pushUrl: "/requests",
    });

    // سجل تدقيق
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userName: session.email,
        action: "approve",
        entity: "leave",
        entityId: id,
        details: `موافقة المدير على إجازة ${empName} (${typeName})`,
      },
    });

    return NextResponse.json(record);
  }

  // موافقة الأدمن النهائية (المرحلة الثانية)
  if (action === "approved") {
    if (current.status !== "manager_approved") {
      return NextResponse.json({ error: "الطلب يحتاج موافقة المدير أولاً" }, { status: 400 });
    }

    const record = await prisma.leave.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: session.userId,
        approvedAt: new Date(),
        notes: body.notes,
      },
    });

    // تحديث جميع سجلات الحضور في فترة الإجازة إلى "إجازة"
    // نستخدم التوقيت المحلي (نفس طريقة تخزين سجلات الحضور) لتجنب مشاكل timezone
    try {
      const s = new Date(current.startDate);
      const e = new Date(current.endDate);
      const localStart = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      const localEnd   = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);

      await prisma.attendance.updateMany({
        where: {
          employeeId: current.employee.id,
          date: { gte: localStart, lte: localEnd },
        },
        data: {
          status: "leave",
          notes: `تعديل تلقائي — إجازة ${typeName} معتمدة`,
        },
      });
    } catch {
      // لا نوقف العملية إذا فشل التحديث التلقائي
    }

    // إشعار الموظف بالموافقة النهائية (DB + Push)
    const msg = `تمت الموافقة النهائية على إجازتك ${typeName} (${current.days} يوم)`;
    await createNotification({
      recipientId: current.employee.id,
      title: "تمت الموافقة على إجازتك",
      message: msg,
      type: "approval",
      relatedId: id,
      pushUrl: "/portal",
    });

    // سجل تدقيق
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userName: session.email,
        action: "approve",
        entity: "leave",
        entityId: id,
        details: `موافقة نهائية على إجازة ${empName} (${typeName})`,
      },
    });

    // بريد إلكتروني للموظف
    const smtpEnabled = await prisma.setting.findUnique({ where: { key: "smtp_enabled" } });
    if (smtpEnabled?.value === "true" && current.employee.email) {
      sendNotificationEmail(current.employee.email, "تمت الموافقة على إجازتك", msg).catch(() => {});
    }

    return NextResponse.json(record);
  }

  return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.leave.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
