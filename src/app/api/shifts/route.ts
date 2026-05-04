import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/shifts — قائمة الشيفتات مع عدد الموظفين
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const shifts = await prisma.shift.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      employees: {
        where: { endDate: null },          // الحاليون فقط
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true, photo: true, department: true },
          },
        },
      },
    },
  });
  return NextResponse.json(shifts);
}

// POST /api/shifts — إنشاء شيفت
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.checkInTime || !body.checkOutTime)
    return NextResponse.json({ error: "الاسم ووقت الدخول والخروج مطلوبة" }, { status: 400 });

  const shift = await prisma.shift.create({
    data: {
      name: body.name,
      checkInTime: body.checkInTime,
      checkOutTime: body.checkOutTime,
      breakMinutes: Number(body.breakMinutes ?? 60),
      workDays: body.workDays ?? "0,1,2,3,4",
      color: body.color ?? "#0284c7",
      isActive: true,
    },
  });
  return NextResponse.json(shift, { status: 201 });
}
