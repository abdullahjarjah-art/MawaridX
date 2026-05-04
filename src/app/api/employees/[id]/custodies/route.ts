import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const custodies = await prisma.custody.findMany({
    where: { employeeId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(custodies);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { type, title, description, quantity, unit } = body;
  if (!type || !title) return NextResponse.json({ error: "النوع والعنوان مطلوبان" }, { status: 400 });
  const custody = await prisma.custody.create({
    data: {
      employeeId: id,
      type,
      title,
      description: description || null,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null,
      createdBy: session.email,
    },
  });
  return NextResponse.json(custody);
}
