import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// POST: إنشاء طلب تجديد عقد أو إشعار عدم تجديد يُرسل للموظف
// body: { employeeId, years?, action: "renewal" | "non_renewal" }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { employeeId, years, action = "renewal" } = await req.json() as {
    employeeId: string;
    years?: number;
    action?: "renewal" | "non_renewal";
  };

  if (!employeeId) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (action === "renewal" && !years) return NextResponse.json({ error: "مدة التجديد مطلوبة" }, { status: 400 });

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { endDate: true, noticePeriodDays: true, contractDuration: true, firstName: true, lastName: true },
  });
  if (!emp) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });

  const requestType = action === "non_renewal" ? "contract_non_renewal" : "contract_renewal";

  // تحقق من عدم وجود طلب معلق من نفس النوع
  const existingPending = await prisma.request.findFirst({
    where: { employeeId, type: requestType, status: "pending" },
  });
  if (existingPending) {
    const label = action === "non_renewal" ? "إشعار عدم تجديد" : "طلب تجديد";
    return NextResponse.json({ error: `يوجد ${label} معلق بالفعل — بانتظار الموظف` }, { status: 409 });
  }

  if (action === "non_renewal") {
    // ── إشعار عدم التجديد ──
    const request = await prisma.request.create({
      data: {
        employeeId,
        type: "contract_non_renewal",
        title: "إشعار بعدم تجديد العقد",
        details: `أفادت الإدارة بأن العقد لن يُجدَّد عند انتهائه في ${emp.endDate ? new Date(emp.endDate).toLocaleDateString("ar-SA") : "—"}. يرجى التأكيد بالاستلام.`,
        status: "pending",
      },
    });

    await createNotification({
      recipientId: employeeId,
      title: "إشعار بعدم تجديد العقد",
      message: `أفادت الإدارة بأن عقدك لن يُجدَّد. يرجى مراجعة طلباتك وتأكيد الاستلام.`,
      type: "request",
      relatedId: request.id,
      pushUrl: "/portal/requests",
    });

    return NextResponse.json(request, { status: 201 });
  }

  // ── طلب تجديد العقد ──
  const base = emp.endDate && new Date(emp.endDate) > new Date()
    ? new Date(emp.endDate)
    : new Date();
  const newEnd = new Date(base);
  newEnd.setFullYear(newEnd.getFullYear() + years!);

  const yearsLabel = years === 1 ? "سنة واحدة" : years === 2 ? "سنتان" : `${years} سنوات`;

  const request = await prisma.request.create({
    data: {
      employeeId,
      type: "contract_renewal",
      title: `طلب تجديد عقد — ${yearsLabel}`,
      details: `تقدمت الإدارة بطلب تجديد عقدك لمدة ${yearsLabel}. تاريخ الانتهاء الجديد المقترح: ${newEnd.toLocaleDateString("ar-SA")}`,
      amount: years,
      endDate: newEnd,
      status: "pending",
    },
  });

  await createNotification({
    recipientId: employeeId,
    title: "طلب تجديد عقد",
    message: `تقدمت الإدارة بطلب تجديد عقدك لمدة ${yearsLabel}. يرجى مراجعة طلباتك للموافقة أو الرفض.`,
    type: "request",
    relatedId: request.id,
    pushUrl: "/portal/requests",
  });

  return NextResponse.json(request, { status: 201 });
}
