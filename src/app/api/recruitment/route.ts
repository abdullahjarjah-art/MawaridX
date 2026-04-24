import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const jobs = await prisma.recruitment.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const job = await prisma.recruitment.create({
    data: {
      jobTitle: body.jobTitle,
      department: body.department,
      description: body.description,
      requirements: body.requirements,
      status: "open",
      closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
    },
  });
  return NextResponse.json(job, { status: 201 });
}
