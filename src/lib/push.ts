import webpush from "web-push";
import { prisma } from "./prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@hr-system.local";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * إرسال إشعار Push لمستخدم معين عبر userId
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) return;

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? "/icon-192.png",
      url: payload.url ?? "/",
      tag: payload.tag,
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification
        )
      )
    );

    // حذف الاشتراكات المنتهية أو غير الصالحة
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: subscriptions[i].endpoint } })
            .catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

/**
 * إرسال إشعار Push لموظف عبر employeeId
 */
export async function sendPushToEmployee(employeeId: string, payload: PushPayload) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });
    if (!employee?.userId) return;
    await sendPushToUser(employee.userId, payload);
  } catch (error) {
    console.error("Push to employee error:", error);
  }
}

/**
 * إرسال إشعار Push لكل مستخدمي الـ HR
 */
export async function sendPushToHR(payload: PushPayload) {
  try {
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["hr", "admin"] } },
      select: { id: true },
    });
    await Promise.allSettled(hrUsers.map((u) => sendPushToUser(u.id, payload)));
  } catch (error) {
    console.error("Push to HR error:", error);
  }
}
