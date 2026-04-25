import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createEmployeeChecklist } from "@/lib/checklist";

// GET /api/checklists?type=onboarding|offboarding&employeeId=...
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (employeeId) where.employeeId = employeeId;

  const checklists = await prisma.employeeChecklist.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, department: true, photo: true } },
      items: { orderBy: { order: "asc" } },
    },
  });
  return NextResponse.json(checklists);
}

// POST /api/checklists — إنشاء checklist لموظف
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { employeeId, type } = await req.json();
  if (!employeeId || !type) return NextResponse.json({ error: "employeeId و type مطلوبان" }, { status: 400 });
  if (!["onboarding", "offboarding"].includes(type)) return NextResponse.json({ error: "type غير صالح" }, { status: 400 });

  const checklist = await createEmployeeChecklist(employeeId, type);
  if (!checklist) return NextResponse.json({ error: "لا يوجد قالب" }, { status: 404 });

  return NextResponse.json(checklist, { status: 201 });
}
