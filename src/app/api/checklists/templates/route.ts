import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureDefaultTemplates } from "@/lib/checklist";

// GET /api/checklists/templates — القوالب + مهامها
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  await ensureDefaultTemplates();
  const templates = await prisma.checklistTemplate.findMany({
    include: { items: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(templates);
}
