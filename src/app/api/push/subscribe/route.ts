import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

function genId() {
  return randomBytes(12).toString("base64url");
}

// POST /api/push/subscribe — حفظ اشتراك Push
export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        id: genId(),
        userId: user.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — إلغاء الاشتراك
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
      await prisma.pushSubscription
        .delete({ where: { endpoint } })
        .catch(() => {});
    } else {
      // حذف كل اشتراكات المستخدم
      await prisma.pushSubscription.deleteMany({ where: { userId: user.userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
