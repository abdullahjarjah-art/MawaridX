import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { createNotification, notifyHR } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const managerId = searchParams.get("managerId");
    const all = searchParams.get("all"); // للـ HR

    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (managerId) where.managerId = managerId;
    if (status === "pending") where.status = { in: ["pending", "manager_approved"] };
    else if (status && status !== "all") where.status = status;

    const finalWhere = all === "1" ? {} : where;
    const page = parseInt(searchParams.get("page") ?? "0");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "0");

    if (page > 0 && pageSize > 0) {
      const [requests, total] = await Promise.all([
        prisma.request.findMany({
          where: finalWhere,
          include: {
            employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, jobTitle: true, managerId: true, photo: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.request.count({ where: finalWhere }),
      ]);
      return NextResponse.json({ requests, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }

    const requests = await prisma.request.findMany({
      where: finalWhere,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, jobTitle: true, managerId: true, photo: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = await req.json();
    const { employeeId, type, title, details, startDate, endDate, amount, returnDate, exitTime, returnTime, checkType } = body;

    if (!employeeId || !type || !title) {
      return NextResponse.json({ error: "البيانات الأساسية مطلوبة" }, { status: 400 });
    }

    // نجلب المدير المباشر للموظف
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true, firstName: true, lastName: true },
    });

    const hasDirectManager = !!employee?.managerId;

    const request = await prisma.request.create({
      data: {
        employeeId,
        type,
        title,
        details: details || null,
        managerId: employee?.managerId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        amount: amount ? parseFloat(amount) : null,
        returnDate: returnDate ? new Date(returnDate) : null,
        exitTime: exitTime ? new Date(exitTime) : null,
        returnTime: returnTime ? new Date(returnTime) : null,
        checkType: checkType || null,
      },
    });

    // سجل تدقيق
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userName: session.email,
        action: "create",
        entity: "request",
        entityId: request.id,
        details: `طلب جديد: ${title} (${type})`,
      },
    });

    const empName = `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`;

    if (hasDirectManager && employee?.managerId) {
      // عنده مدير مباشر → إشعار المدير (DB + Push)
      await createNotification({
        recipientId: employee.managerId,
        title: "طلب جديد يحتاج موافقتك",
        message: `قدّم ${empName} طلب: ${title}`,
        type: "request",
        relatedId: request.id,
        pushUrl: "/requests",
      });

      // بريد إلكتروني للمدير
      const smtpEnabled = await prisma.setting.findUnique({ where: { key: "smtp_enabled" } });
      if (smtpEnabled?.value === "true") {
        const manager = await prisma.employee.findUnique({ where: { id: employee.managerId }, select: { email: true } });
        if (manager?.email) {
          sendNotificationEmail(manager.email, "طلب جديد يحتاج موافقتك", `قدّم ${empName} طلب: ${title}`).catch(() => {});
        }
      }
    } else {
      // بدون مدير مباشر → إشعار جميع الـ HR/Admin (DB + Push)
      await notifyHR({
        title: "طلب جديد يحتاج موافقتك",
        message: `قدّم ${empName} طلب: ${title} — الموظف ليس لديه مدير مباشر`,
        type: "request",
        relatedId: request.id,
        pushUrl: "/requests",
      });
    }

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
