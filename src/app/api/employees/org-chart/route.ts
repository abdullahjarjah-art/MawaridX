import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        arabicName: true,
        jobTitle: true,
        position: true,
        department: true,
        status: true,
        photo: true,
        managerId: true,
      },
      where: { status: { not: "terminated" } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(employees);
  } catch (err) {
    console.error("Org chart error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
