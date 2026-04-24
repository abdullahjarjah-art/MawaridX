"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedId?: string;
  createdAt: string;
};

const typeIcon: Record<string, string> = {
  approval: "✅",
  rejection: "❌",
  request: "📋",
  leave: "🌴",
  info: "ℹ️",
};

export function NotificationBell({ employeeId }: { employeeId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  const fetchNotifications = () => {
    if (!employeeId) return;
    fetch(`/api/notifications?recipientId=${employeeId}`)
      .then((r) => r.json())
      .then((d) => setNotifications(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [employeeId]);

  // إغلاق عند الضغط خارج اللوحة
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const panel = document.getElementById("notif-panel");
      const bell  = document.getElementById("notif-bell-btn");
      if (panel && !panel.contains(e.target as Node) && bell && !bell.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: employeeId }),
    }).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  return (
    <>
      {/* زر الجرس */}
      <button
        id="notif-bell-btn"
        onClick={() => {
          setOpen((v) => !v);
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unread > 0 && (
          <span className="absolute top-1 left-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </button>

      {/* لوحة الإشعارات — fixed تجنباً لمشكلة stacking context */}
      {open && (
        <>
          {/* خلفية شفافة على الموبايل */}
          <div
            className="fixed inset-0 z-[998] lg:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            id="notif-panel"
            className="fixed top-14 left-4 right-4 lg:top-4 lg:left-auto lg:right-72 lg:w-96 z-[999] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
            style={{ maxHeight: "80vh" }}
          >
            {/* رأس اللوحة */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-sky-600" />
                <p className="font-bold text-sm text-gray-900 dark:text-white">الإشعارات</p>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 dark:text-sky-400 transition-colors"
                    title="تعيين الكل كمقروء"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    قراءة الكل
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* قائمة الإشعارات */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>لا توجد إشعارات</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                        !n.read && "bg-red-50/40 dark:bg-red-900/10"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* نقطة حمراء للغير مقروء */}
                        <div className="shrink-0 mt-1.5">
                          {!n.read ? (
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full block" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full block bg-transparent" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{typeIcon[n.type] ?? "🔔"}</span>
                            <p className={cn(
                              "text-sm font-semibold truncate",
                              !n.read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                            )}>
                              {n.title}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                        </div>

                        {!n.read && (
                          <Check className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
