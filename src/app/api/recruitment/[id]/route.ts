import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const job = await prisma.recruitment.findUnique({
    where: { id },
    include: { applications: { orderBy: { createdAt: "desc" } } },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const job = await prisma.recruitment.update({
    where: { id },
    data: {
      jobTitle: body.jobTitle,
      department: body.department,
      description: body.description,
      requirements: body.requirements,
      status: body.status,
      closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
    },
  });
  return NextResponse.json(job);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.recruitment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
