import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from", "smtp_enabled"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const settings = await prisma.setting.findMany({
    where: { key: { in: SMTP_KEYS } },
  });
  const result: Record<string, string> = {};
  settings.forEach((s) => (result[s.key] = s.value));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();

  for (const key of SMTP_KEYS) {
    if (body[key] !== undefined) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(body[key]) },
        create: { key, value: String(body[key]) },
      });
    }
  }

  return NextResponse.json({ success: true });
}
