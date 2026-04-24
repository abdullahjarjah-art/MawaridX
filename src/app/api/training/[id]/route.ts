import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const training = await prisma.training.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      instructor: body.instructor,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      duration: body.duration ? Number(body.duration) : undefined,
      location: body.location,
      type: body.type,
      status: body.status,
    },
  });
  return NextResponse.json(training);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.training.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
