import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const app = await prisma.application.create({
    data: {
      recruitmentId: id,
      applicantName: body.applicantName,
      email: body.email,
      phone: body.phone,
      status: "new",
      notes: body.notes,
      interviewDate: body.interviewDate ? new Date(body.interviewDate) : undefined,
    },
  });
  return NextResponse.json(app, { status: 201 });
}
