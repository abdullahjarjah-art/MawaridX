import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  // الموظف يشوف سجلاته فقط
  if (session.role === "employee" && session.employeeId) {
    where.employeeId = session.employeeId;
  }

  const records = await prisma.disciplinary.findMany({
    where,
    include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();
  const { employeeId, type, reason, description, date, penalty, days, notes } = body;

  if (!employeeId || !type || !reason || !date) {
    return NextResponse.json({ error: "الحقول المطلوبة: الموظف، النوع، السبب، التاريخ" }, { status: 400 });
  }

  const record = await prisma.disciplinary.create({
    data: {
      employeeId,
      type,
      reason,
      description: description || null,
      date: new Date(date),
      issuedBy: session.email,
      penalty: penalty ? parseFloat(penalty) : null,
      days: days ? parseInt(days) : null,
      notes: notes || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      userName: session.email,
      action: "create",
      entity: "disciplinary",
      entityId: record.id,
      details: `إضافة ${type} للموظف ${employeeId}`,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
