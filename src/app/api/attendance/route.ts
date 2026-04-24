import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const locationId = searchParams.get("locationId");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (locationId) where.workLocationId = locationId;
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    where.date = { gte: start, lt: end };
  }

  const page     = Math.max(1, Number(searchParams.get("page")     || 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 25)));
  const noPagination = searchParams.get("all") === "1";

  const locationSelect = { select: { id: true, name: true, address: true } };
  const includeAll = {
    employee: { select: { firstName: true, lastName: true, employeeNumber: true, department: true, photo: true } },
    workLocation: locationSelect,
    checkInLocation: locationSelect,
    checkOutLocation: locationSelect,
  };

  if (noPagination) {
    const records = await prisma.attendance.findMany({ where, include: includeAll, orderBy: { date: "desc" } });
    return NextResponse.json(records);
  }

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({ where, include: includeAll, orderBy: { date: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  return NextResponse.json({ data: records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const employeeId = body.employeeId;

  // منع البصمة لأي موظف في إجازة رسمية معتمدة
  if (employeeId && body.checkIn) {
    const recordDate = body.date ? new Date(body.date) : new Date();
    recordDate.setHours(0, 0, 0, 0);

    const activeLeave = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: "approved",
        startDate: { lte: recordDate },
        endDate: { gte: recordDate },
      },
      select: { type: true, endDate: true },
    });

    if (activeLeave) {
      const leaveTypeMap: Record<string, string> = {
        annual: "سنوية", sick: "مرضية", emergency: "طارئة",
        unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
      };
      const typeName = leaveTypeMap[activeLeave.type] ?? activeLeave.type;
      const endStr = new Date(activeLeave.endDate).toLocaleDateString("ar-SA");
      return NextResponse.json(
        { error: `الموظف في إجازة ${typeName} حتى ${endStr} — لا يمكن تسجيل البصمة` },
        { status: 403 }
      );
    }
  }

  const record = await prisma.attendance.create({
    data: {
      employeeId: body.employeeId,
      date: new Date(body.date),
      checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
      checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
      status: body.status ?? "present",
      notes: body.notes,
      workHours: body.workHours ? parseFloat(body.workHours) : undefined,
      workLocationId: body.workLocationId || null,
      checkInLocationId: body.checkInLocationId || null,
      checkOutLocationId: body.checkOutLocationId || null,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
