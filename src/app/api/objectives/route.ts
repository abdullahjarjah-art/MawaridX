import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/objectives?period=...&employeeId=...
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  const employeeId = searchParams.get("employeeId");
  const scope = searchParams.get("scope"); // "company" = الشركة فقط (employeeId=null)

  const where: Record<string, unknown> = {};
  if (period) where.period = period;
  if (scope === "company") where.employeeId = null;
  else if (employeeId) where.employeeId = employeeId;

  const objectives = await prisma.objective.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, photo: true, department: true } },
      keyResults: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(objectives);
}

// POST /api/objectives — إنشاء هدف جديد
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim() || !body.period?.trim())
    return NextResponse.json({ error: "العنوان والفترة مطلوبان" }, { status: 400 });

  const obj = await prisma.objective.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      period: body.period,
      employeeId: body.employeeId || null,
      keyResults: body.keyResults?.length
        ? {
            create: body.keyResults.map((kr: { title: string; unit?: string; startValue?: number; targetValue: number; currentValue?: number }) => ({
              title: kr.title,
              unit: kr.unit || null,
              startValue: Number(kr.startValue ?? 0),
              targetValue: Number(kr.targetValue),
              currentValue: Number(kr.currentValue ?? 0),
            })),
          }
        : undefined,
    },
    include: { keyResults: true },
  });
  return NextResponse.json(obj, { status: 201 });
}
