import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const ev = await prisma.evaluation.update({
    where: { id },
    data: {
      score: body.score ? parseFloat(body.score) : undefined,
      grade: body.grade,
      answers: body.answers ? (typeof body.answers === "string" ? body.answers : JSON.stringify(body.answers)) : undefined,
      strengths: body.strengths,
      improvements: body.improvements,
      goals: body.goals,
      evaluatorId: body.evaluatorId,
      evaluatorName: body.evaluatorName,
      status: body.status,
    },
  });
  return NextResponse.json(ev);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.evaluation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
