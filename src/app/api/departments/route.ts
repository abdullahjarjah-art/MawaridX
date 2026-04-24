import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    // عدد الموظفين لكل قسم
    const employees = await prisma.employee.findMany({
      select: { department: true, status: true },
      where: { status: { not: "terminated" } },
    });
    const countMap: Record<string, number> = {};
    employees.forEach(e => {
      if (e.department) countMap[e.department] = (countMap[e.department] ?? 0) + 1;
    });
    return NextResponse.json(departments.map(d => ({ ...d, employeeCount: countMap[d.name] ?? 0 })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { name, description, managerId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
    const dept = await prisma.department.create({
      data: { name: name.trim(), description: description?.trim() || null, managerId: managerId || null },
    });
    return NextResponse.json(dept, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "اسم القسم موجود مسبقاً" }, { status: 400 });
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
