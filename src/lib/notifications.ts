import { prisma } from "./prisma";
import { sendPushToEmployee, sendPushToHR, type PushPayload } from "./push";
import { randomBytes } from "crypto";

function genId() {
  return randomBytes(12).toString("base64url");
}

interface CreateNotificationInput {
  recipientId: string;         // Employee ID
  title: string;
  message: string;
  type?: string;
  relatedId?: string;
  pushUrl?: string;            // رابط للضغط على الإشعار
}

/**
 * ينشئ إشعاراً في قاعدة البيانات ويرسله Push
 */
export async function createNotification(input: CreateNotificationInput) {
  const { recipientId, title, message, type = "info", relatedId, pushUrl } = input;

  // حفظ في قاعدة البيانات
  const notification = await prisma.notification.create({
    data: {
      id: genId(),
      recipientId,
      title,
      message,
      type,
      relatedId: relatedId ?? null,
    },
  });

  // إرسال Push Notification
  const payload: PushPayload = {
    title,
    body: message,
    icon: "/icon-192.png",
    url: pushUrl ?? getDefaultUrl(type),
    tag: relatedId ? `${type}-${relatedId}` : type,
  };

  sendPushToEmployee(recipientId, payload).catch(() => {});

  return notification;
}

/**
 * إنشاء إشعارات لكل موظفي HR وإرسال Push لهم
 */
export async function notifyHR(input: Omit<CreateNotificationInput, "recipientId">) {
  const hrUsers = await prisma.user.findMany({
    where: { role: { in: ["hr", "admin"] } },
    select: {
      id: true,
      employee: { select: { id: true } },
    },
  });

  // حفظ في DB لكل HR عنده حساب موظف
  const hrEmployeeIds = hrUsers
    .map((u) => u.employee?.id)
    .filter(Boolean) as string[];

  await Promise.allSettled(
    hrEmployeeIds.map((id) =>
      createNotification({ ...input, recipientId: id })
    )
  );

  // أيضاً push للـ HR users مباشرة (بدون حساب موظف)
  const payload: PushPayload = {
    title: input.title,
    body: input.message,
    icon: "/icon-192.png",
    url: input.pushUrl ?? getDefaultUrl(input.type ?? "info"),
    tag: input.relatedId ? `${input.type}-${input.relatedId}` : input.type,
  };

  sendPushToHR(payload).catch(() => {});
}

function getDefaultUrl(type: string): string {
  switch (type) {
    case "request":
    case "leave":
      return "/requests";
    case "approval":
    case "rejection":
      return "/portal";
    case "salary":
      return "/portal";
    default:
      return "/";
  }
}
