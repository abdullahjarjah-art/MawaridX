import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH — تبديل حالة المهمة (done / undone)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { itemId } = await params;
  const { done } = await req.json();

  const item = await prisma.employeeChecklistItem.update({
    where: { id: itemId },
    data: {
      done: Boolean(done),
      doneAt: done ? new Date() : null,
      doneBy: done ? (session as { email?: string }).email ?? "hr" : null,
    },
  });
  return NextResponse.json(item);
}
