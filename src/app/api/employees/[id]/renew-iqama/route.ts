import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const { iqamaExpiry } = await req.json();
  if (!iqamaExpiry) return NextResponse.json({ error: "تاريخ الانتهاء مطلوب" }, { status: 400 });
  const employee = await prisma.employee.update({
    where: { id },
    data: { iqamaExpiry: new Date(iqamaExpiry) },
  });
  return NextResponse.json(employee);
}
