import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (session) {
    await prisma.auditLog.create({
      data: { userId: session.userId, userName: session.email, action: "logout", entity: "auth" },
    }).catch(() => {});
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
