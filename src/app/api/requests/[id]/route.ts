import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { getAttendanceSettings, timeToMins } from "@/lib/attendance-settings";
import { createNotification, notifyHR } from "@/lib/notifications";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { id } = await params;
    const { status, managerNote, hrNote, role } = await req.json();

    // جلب الطلب الحالي مع بيانات الموظف
    const existing = await prisma.request.findUnique({
      where: { id },
      include: { employee: { select: { firstName: true, lastName: true, managerId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    const data: Record<string, unknown> = {};

    // ─── منطق الموافقة حسب الدور ───
    if (role === "manager") {
      data.managerNote = managerNote || null;
      data.managerAt = new Date();

      if (status === "approved") {
        // المدير يوافق → الحالة تصبح "manager_approved" → تنتقل للـ HR
        data.status = "manager_approved";
      } else if (status === "rejected") {
        // المدير يرفض → الطلب مرفوض نهائياً
        data.status = "rejected";
      }
    } else if (role === "hr") {
      data.hrNote = hrNote || null;
      data.hrAt = new Date();

      if (status === "approved") {
        // الـ HR يوافق → الطلب معتمد نهائياً
        data.status = "approved";
      } else if (status === "rejected") {
        // الـ HR يرفض → الطلب مرفوض نهائياً
        data.status = "rejected";
      }
    }

    const request = await prisma.request.update({
      where: { id },
      data,
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    const finalStatus = data.status as string;

    // ─── تصحيح الحضور تلقائياً عند الموافقة النهائية (HR) ───
    if (finalStatus === "approved" && request.type === "attendance_fix" && request.startDate && request.exitTime && request.checkType) {
      const dayStart = new Date(request.startDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(request.startDate);
      dayEnd.setHours(23, 59, 59, 999);

      let attendance = await prisma.attendance.findFirst({
        where: { employeeId: request.employeeId, date: { gte: dayStart, lte: dayEnd } },
      });

      const correctedTime = new Date(request.exitTime);
      const attSettings = await getAttendanceSettings();
      const WORK_START_MINS = timeToMins(attSettings.checkInTime) + attSettings.lateToleranceMinutes;

      if (attendance) {
        const newCheckIn  = request.checkType === "in"  ? correctedTime : attendance.checkIn;
        const newCheckOut = request.checkType === "out" ? correctedTime : attendance.checkOut;

        const workHours = newCheckIn && newCheckOut
          ? Math.round(((newCheckOut.getTime() - newCheckIn.getTime()) / 3600000) * 100) / 100
          : null;

        let newStatus = attendance.status;
        if (request.checkType === "in" && newCheckIn) {
          const mins = newCheckIn.getHours() * 60 + newCheckIn.getMinutes();
          newStatus = mins > WORK_START_MINS ? "late" : "present";
        }

        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            checkIn:   request.checkType === "in"  ? correctedTime : undefined,
            checkOut:  request.checkType === "out" ? correctedTime : undefined,
            workHours: workHours !== null ? workHours : undefined,
            status:    newStatus,
          },
        });
      } else {
        const checkInMins = request.checkType === "in"
          ? correctedTime.getHours() * 60 + correctedTime.getMinutes()
          : null;
        const newStatus = checkInMins !== null
          ? (checkInMins > WORK_START_MINS ? "late" : "present")
          : "present";

        await prisma.attendance.create({
          data: {
            employeeId: request.employeeId,
            date: new Date(request.startDate),
            checkIn:  request.checkType === "in"  ? correctedTime : null,
            checkOut: request.checkType === "out" ? correctedTime : null,
            status:   newStatus,
          },
        });
      }
    }

    // ─── تطبيق الأوفرتايم عند الموافقة النهائية (HR) ───
    if (finalStatus === "approved" && request.type === "overtime" && request.startDate && request.amount) {
      const overtimeMinutes = Math.round(request.amount);
      const dayStart = new Date(request.startDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(request.startDate);
      dayEnd.setHours(23, 59, 59, 999);

      const attRecord = await prisma.attendance.findFirst({
        where: { employeeId: request.employeeId, date: { gte: dayStart, lte: dayEnd } },
      });

      if (attRecord) {
        await prisma.attendance.update({
          where: { id: attRecord.id },
          data: { overtimeMinutes },
        });
      } else {
        // إنشاء سجل حضور جديد بالأوفرتايم
        await prisma.attendance.create({
          data: {
            employeeId: request.employeeId,
            date: new Date(request.startDate),
            status: "present",
            overtimeMinutes,
          },
        });
      }
    }

    // ─── الإشعارات ───
    if (finalStatus === "manager_approved") {
      // المدير وافق → إشعار الموظف + Push
      await createNotification({
        recipientId: request.employeeId,
        title: "تمت موافقة المدير على طلبك",
        message: `وافق المدير المباشر على طلب: ${request.title} — بانتظار موافقة الإدارة${managerNote ? ` — ملاحظة: ${managerNote}` : ""}`,
        type: "approval",
        relatedId: request.id,
        pushUrl: "/portal",
      });

      // إشعار كل الـ HR + Push
      const empName = `${request.employee.firstName} ${request.employee.lastName}`;
      await notifyHR({
        title: "طلب بانتظار موافقة الإدارة",
        message: `وافق المدير المباشر على طلب ${empName}: ${request.title}`,
        type: "request",
        relatedId: request.id,
        pushUrl: "/requests",
      });
    } else if (finalStatus === "approved" || finalStatus === "rejected") {
      const isApproved = finalStatus === "approved";
      const notifTitle = isApproved ? "تمت الموافقة النهائية على طلبك" : "تم رفض طلبك";
      const note = hrNote || managerNote || "";
      const notifMsg = `${isApproved ? "تمت الموافقة النهائية على" : "تم رفض"} طلب: ${request.title}${note ? ` — ${note}` : ""}`;

      // إشعار الموظف + Push
      await createNotification({
        recipientId: request.employeeId,
        title: notifTitle,
        message: notifMsg,
        type: isApproved ? "approval" : "rejection",
        relatedId: request.id,
        pushUrl: "/portal",
      });

      // بريد إلكتروني للموظف
      const smtpEnabled = await prisma.setting.findUnique({ where: { key: "smtp_enabled" } });
      if (smtpEnabled?.value === "true") {
        const emp = await prisma.employee.findUnique({ where: { id: request.employeeId }, select: { email: true } });
        if (emp?.email) {
          sendNotificationEmail(emp.email, notifTitle, notifMsg).catch(() => {});
        }
      }
    }

    // سجل تدقيق
    if (finalStatus && finalStatus !== "pending") {
      const actionMap: Record<string, string> = {
        manager_approved: "موافقة المدير على",
        approved: "الموافقة النهائية على",
        rejected: "رفض",
      };
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          userName: session.email,
          action: finalStatus === "rejected" ? "reject" : "approve",
          entity: "request",
          entityId: id,
          details: `${actionMap[finalStatus] ?? finalStatus} طلب: ${request.title}`,
        },
      });
    }

    return NextResponse.json(request);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

// PATCH: موافقة الموظف أو رفضه لطلب تجديد العقد
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json() as { status: "approved" | "rejected" };
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.request.findUnique({
      where: { id },
      select: { employeeId: true, type: true, amount: true, endDate: true, status: true, title: true },
    });
    if (!existing) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    if (!["contract_renewal", "contract_non_renewal"].includes(existing.type)) {
      return NextResponse.json({ error: "نوع الطلب غير صالح" }, { status: 400 });
    }
    if (existing.status !== "pending") return NextResponse.json({ error: "الطلب تم البت فيه مسبقاً" }, { status: 409 });

    // التحقق أن الطلب للموظف الحالي (الموظف يوافق على طلبه فقط)
    const employee = await prisma.employee.findFirst({
      where: { userId: session.userId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee || employee.id !== existing.employeeId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // تحديث حالة الطلب
    await prisma.request.update({
      where: { id },
      data: { status, hrAt: new Date() },
    });

    // تنفيذ الإجراء حسب نوع الطلب
    if (existing.type === "contract_renewal" && status === "approved" && existing.amount && existing.endDate) {
      // تجديد العقد فعلياً عند موافقة الموظف
      await prisma.employee.update({
        where: { id: existing.employeeId },
        data: {
          endDate: existing.endDate,
          contractDuration: existing.amount,
        },
      });
    }
    // contract_non_renewal: تأكيد الاستلام فقط، لا تعديل على بيانات العقد

    // إشعار الـ HR بنتيجة القرار
    const empName = `${employee.firstName} ${employee.lastName}`;
    const isRenewal = existing.type === "contract_renewal";
    await notifyHR({
      title: isRenewal
        ? (status === "approved" ? "وافق الموظف على تجديد العقد" : "رفض الموظف تجديد العقد")
        : "أكّد الموظف استلام إشعار عدم التجديد",
      message: isRenewal
        ? `${empName} ${status === "approved" ? "وافق على" : "رفض"} طلب تجديد العقد`
        : `${empName} أكّد استلام إشعار عدم تجديد العقد`,
      type: status === "approved" ? "approval" : "rejection",
      relatedId: id,
      pushUrl: "/contracts",
    });

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { id } = await params;
    await prisma.request.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
