import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !session.employeeId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const custodies = await prisma.custody.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(custodies);
}
