import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";
import { createNotification, notifyHR } from "@/lib/notifications";

const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة",
  unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  const leaves = await prisma.leave.findMany({
    where,
    include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();

  // ── التحقق من المدخلات ──
  if (!body.employeeId) return NextResponse.json({ error: "الموظف مطلوب" }, { status: 400 });
  if (!body.type)       return NextResponse.json({ error: "نوع الإجازة مطلوب" }, { status: 400 });
  if (!body.startDate)  return NextResponse.json({ error: "تاريخ البداية مطلوب" }, { status: 400 });
  if (!body.endDate)    return NextResponse.json({ error: "تاريخ النهاية مطلوب" }, { status: 400 });

  const start = new Date(body.startDate);
  const end   = new Date(body.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: "التواريخ غير صحيحة" }, { status: 400 });
  if (end < start) return NextResponse.json({ error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" }, { status: 400 });

  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // فحص التداخل مع إجازة معتمدة أو معلقة
  const overlap = await prisma.leave.findFirst({
    where: {
      employeeId: body.employeeId,
      status: { in: ["pending", "manager_approved", "approved"] },
      startDate: { lte: end },
      endDate:   { gte: start },
    },
  });
  if (overlap) return NextResponse.json({ error: "يوجد طلب إجازة متداخل في نفس الفترة" }, { status: 409 });

  // فحص الرصيد للإجازات المحددة بالرصيد
  const balanceTypes: Record<string, "usedAnnual" | "usedSick" | "usedEmergency"> = {
    annual: "usedAnnual", sick: "usedSick", emergency: "usedEmergency",
  };
  const maxTypes: Record<string, "annual" | "sick" | "emergency"> = {
    annual: "annual", sick: "sick", emergency: "emergency",
  };
  // الإجازة المرضية مع عذر طبي مرفق لا تُخصم من الرصيد لذلك يُتجاوز فحص الرصيد
  const hasMedicalAttachment = body.type === "sick" && typeof body.attachmentUrl === "string" && body.attachmentUrl.trim() !== "";
  if (balanceTypes[body.type] && !hasMedicalAttachment) {
    const year = start.getFullYear();
    const balance = await prisma.leaveBalance.findFirst({ where: { employeeId: body.employeeId, year } });
    if (balance) {
      const used = balance[balanceTypes[body.type]];
      const max  = balance[maxTypes[body.type]];
      const remaining = max - used;
      if (days > remaining) return NextResponse.json({ error: `الرصيد المتبقي (${remaining} يوم) غير كافٍ لهذه الإجازة (${days} يوم)` }, { status: 400 });
    }
  }

  // الإجازة المرضية: المرفق الطبي اختياري لكن لو موجود يُعتبر "بعذر" ولا يُخصم من الرصيد
  const attachmentUrl = typeof body.attachmentUrl === "string" && body.attachmentUrl.trim() !== ""
    ? body.attachmentUrl.trim()
    : null;

  const leave = await prisma.leave.create({
    data: {
      employeeId: body.employeeId,
      type: body.type,
      startDate: start,
      endDate: end,
      days,
      reason: body.reason,
      attachmentUrl,
      status: "pending",
      notes: body.notes,
    },
  });

  // جلب بيانات الموظف ومديره
  const employee = await prisma.employee.findUnique({
    where: { id: body.employeeId },
    select: { firstName: true, lastName: true, email: true, managerId: true },
  });

  const typeName = leaveTypeMap[body.type] ?? body.type;
  const empName = `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`;

  // إشعار المدير المباشر بطلب إجازة جديد (DB + Push)
  if (employee?.managerId) {
    const msg = `قدّم ${empName} طلب إجازة ${typeName} لمدة ${days} يوم`;
    await createNotification({
      recipientId: employee.managerId,
      title: "طلب إجازة جديد",
      message: msg,
      type: "leave",
      relatedId: leave.id,
      pushUrl: "/requests",
    });

    // بريد إلكتروني للمدير
    const smtpEnabled = await prisma.setting.findUnique({ where: { key: "smtp_enabled" } });
    if (smtpEnabled?.value === "true") {
      const manager = await prisma.employee.findUnique({ where: { id: employee.managerId }, select: { email: true } });
      if (manager?.email) {
        sendNotificationEmail(manager.email, "طلب إجازة جديد", msg).catch(() => {});
      }
    }
  } else {
    // بدون مدير → إشعار HR
    const msg = `قدّم ${empName} طلب إجازة ${typeName} لمدة ${days} يوم`;
    await notifyHR({
      title: "طلب إجازة جديد",
      message: msg,
      type: "leave",
      relatedId: leave.id,
      pushUrl: "/requests",
    });
  }

  return NextResponse.json(leave, { status: 201 });
}
