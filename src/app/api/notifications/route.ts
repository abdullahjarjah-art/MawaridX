import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const recipientId = searchParams.get("recipientId");
  if (!recipientId) return NextResponse.json([]);

  // التحقق من أن المستخدم يطلب إشعاراته فقط، أو أنه hr/admin
  if (session.employeeId !== recipientId && !["hr", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const notification = await prisma.notification.create({
    data: {
      recipientId: body.recipientId,
      title: body.title,
      message: body.message,
      type: body.type ?? "info",
      relatedId: body.relatedId ?? null,
    },
  });
  return NextResponse.json(notification, { status: 201 });
}
