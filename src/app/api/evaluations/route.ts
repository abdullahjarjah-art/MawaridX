import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeIdParam = searchParams.get("employeeId"); // بوابة الموظف — تقييماتي
  const managerIdParam  = searchParams.get("managerId");  // بوابة المدير — تقييمات فريقه
  const statusParam     = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (employeeIdParam) {
    // الموظف يرى فقط تقييماته المعتمدة
    where.employeeId = employeeIdParam;
    where.status     = "approved";
  } else if (managerIdParam) {
    // المدير يرى فقط تقييمات فريقه التي أنشأها هو
    where.evaluatorId = managerIdParam;
    if (statusParam) where.status = statusParam;
  } else {
    // HR / Admin يرى الكل
    if (statusParam) where.status = statusParam;
  }

  const evals = await prisma.evaluation.findMany({
    where,
    include: {
      employee: {
        select: { firstName: true, lastName: true, employeeNumber: true, department: true, photo: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(evals);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const ev = await prisma.evaluation.create({
    data: {
      employeeId:    body.employeeId,
      period:        body.period,
      year:          Number(body.year),
      score:         body.score != null ? parseFloat(body.score) : undefined,
      grade:         body.grade,
      answers:       body.answers
                       ? (typeof body.answers === "string" ? body.answers : JSON.stringify(body.answers))
                       : undefined,
      strengths:     body.strengths,
      improvements:  body.improvements,
      goals:         body.goals,
      evaluatorId:   body.evaluatorId,
      evaluatorName: body.evaluatorName,
      status:        body.status ?? "draft",
    },
  });
  return NextResponse.json(ev, { status: 201 });
}
