import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: تعيين عقود جماعية
// body: { rows: [{ id, contractDuration, endDate, noticePeriodDays }] }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { rows } = await req.json() as {
    rows: { id: string; contractDuration: number | null; endDate: string | null; noticePeriodDays: number }[]
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات" }, { status: 400 });
  }

  // تحديث كل موظف بشكل منفصل (SQLite لا يدعم updateMany مع بيانات مختلفة)
  await prisma.$transaction(
    rows.map(r =>
      prisma.employee.update({
        where: { id: r.id },
        data: {
          contractDuration: r.contractDuration ?? null,
          endDate:          r.endDate ? new Date(r.endDate) : null,
          noticePeriodDays: r.noticePeriodDays,
        },
      })
    )
  );

  return NextResponse.json({ updated: rows.length });
}
