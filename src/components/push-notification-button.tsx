"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState } from "react";

interface Props {
  className?: string;
  showLabel?: boolean;
}

export function PushNotificationButton({ className = "", showLabel = false }: Props) {
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [feedback, setFeedback] = useState<string | null>(null);

  if (permission === "unsupported") return null;

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
      setFeedback("تم إيقاف الإشعارات");
    } else {
      const ok = await subscribe();
      if (ok) {
        setFeedback("✅ تم تفعيل الإشعارات!");
      } else if (permission === "denied") {
        setFeedback("الإشعارات محظورة في إعدادات المتصفح");
      } else {
        setFeedback("تعذّر تفعيل الإشعارات");
      }
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        disabled={loading || permission === "denied"}
        title={
          permission === "denied"
            ? "الإشعارات محظورة في المتصفح"
            : isSubscribed
            ? "إيقاف إشعارات المتصفح"
            : "تفعيل إشعارات المتصفح"
        }
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${
            permission === "denied"
              ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400"
              : isSubscribed
              ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="w-4 h-4" />
        ) : permission === "denied" ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {showLabel && (
          <span>
            {isSubscribed ? "إشعارات مفعّلة" : "تفعيل الإشعارات"}
          </span>
        )}
      </button>

      {/* رسالة التأكيد */}
      {feedback && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 z-50 shadow-lg">
          {feedback}
        </div>
      )}
    </div>
  );
}
