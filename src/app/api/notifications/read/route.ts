import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { recipientId, notificationId } = await req.json();

  if (notificationId) {
    await prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
  } else if (recipientId) {
    await prisma.notification.updateMany({ where: { recipientId, read: false }, data: { read: true } });
  }

  return NextResponse.json({ success: true });
}
