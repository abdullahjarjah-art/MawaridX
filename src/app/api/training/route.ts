import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const trainings = await prisma.training.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trainings);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const training = await prisma.training.create({
    data: {
      title: body.title,
      description: body.description,
      instructor: body.instructor,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      duration: body.duration ? Number(body.duration) : undefined,
      location: body.location,
      type: body.type ?? "internal",
      status: body.status ?? "planned",
    },
  });
  return NextResponse.json(training, { status: 201 });
}
