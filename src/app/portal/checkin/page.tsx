"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin, Navigation, Clock, CheckCircle2, XCircle, Loader2,
  LogIn, LogOut, AlertTriangle, Palmtree,
} from "lucide-react";

const GeofenceMap = dynamic(
  () => import("@/components/geofence-map").then((m) => m.GeofenceMap),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-gray-100 animate-pulse" /> }
);

type Attendance = {
  id: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  workLocation?: { name: string } | null;
};

type ActiveLeave = {
  type: string;
  startDate: string;
  endDate: string;
};

type WorkLocation = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  radius: number;
};

type State = "idle" | "locating" | "success" | "error" | "outside";

function fmt(dt?: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة",
  unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};

export default function CheckinPage() {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [workLocation, setWorkLocation] = useState<WorkLocation | null>(null);
  const [activeLeave, setActiveLeave] = useState<ActiveLeave | null>(null);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadStatus();
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const res = await fetch("/api/portal/checkin");
    if (res.ok) {
      const data = await res.json();
      setAttendance(data.attendance);
      setWorkLocation(data.workLocation);
      setActiveLeave(data.activeLeave ?? null);
    }
    setLoading(false);
  };

  const doCheckin = (action: "checkin" | "checkout") => {
    setState("locating");
    setMessage("");
    setDistance(null);

    if (!navigator.geolocation) {
      setState("error");
      setMessage("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        const res = await fetch("/api/portal/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, action }),
        });
        const data = await res.json();
        if (res.ok) {
          setState("success");
          setMessage(action === "checkin" ? "تم تسجيل دخولك بنجاح ✓" : "تم تسجيل خروجك بنجاح ✓");
          setDistance(data.distance);
          setAttendance(data.attendance);
        } else if (res.status === 403) {
          setState("outside");
          setDistance(data.distance);
          setMessage(`أنت على بُعد ${data.distance} متر من ${data.locationName || "موقع العمل"} (النطاق المسموح: ${data.radius} متر)`);
        } else {
          setState("error");
          setMessage(data.error ?? "حدث خطأ");
        }
      },
      (err) => {
        setState("error");
        setMessage(
          err.code === 1 ? "يرجى السماح للتطبيق باستخدام موقعك من إعدادات المتصفح" :
          err.code === 2 ? "تعذّر تحديد موقعك — تأكد من تفعيل GPS" :
          "انتهت مهلة تحديد الموقع، حاول مجدداً"
        );
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  const checkedIn = !!attendance?.checkIn;
  const checkedOut = !!attendance?.checkOut;
  const hasLocation = !!workLocation?.latitude;
  const onLeave = !!activeLeave;

  const remainingLeaveDays = activeLeave
    ? Math.ceil((new Date(activeLeave.endDate).getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24 flex flex-col gap-4 max-w-md mx-auto">
      {/* الوقت الحالي */}
      <div className="text-center pt-4">
        <p className="text-5xl font-bold text-gray-900 tabular-nums tracking-tight">
          {now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="text-gray-500 mt-1 text-sm">
          {now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* بانر الإجازة */}
      {onLeave && activeLeave && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-200 rounded-2xl flex items-center justify-center shrink-0">
                <Palmtree className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="font-bold text-purple-900 text-base">أنت الآن في إجازة</p>
                <p className="text-xs text-purple-600">
                  إجازة {leaveTypeMap[activeLeave.type] ?? activeLeave.type}
                </p>
              </div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-0.5">تاريخ العودة</p>
                <p className="font-bold text-gray-800 text-sm">
                  {new Date(activeLeave.endDate).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
                </p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-0.5">الأيام المتبقية</p>
                <p className="text-3xl font-black text-purple-700 leading-none">{remainingLeaveDays}</p>
                <p className="text-xs text-purple-500">
                  {remainingLeaveDays === 1 ? "يوم" : "أيام"}
                </p>
              </div>
            </div>
            <p className="text-xs text-purple-500 text-center mt-3">لا يمكن تسجيل البصمة خلال فترة الإجازة</p>
          </CardContent>
        </Card>
      )}

      {/* موقع العمل */}
      <Card className={`border-2 ${hasLocation ? "border-sky-100 bg-sky-50/50" : "border-amber-100 bg-amber-50/50"}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasLocation ? "bg-sky-100" : "bg-amber-100"}`}>
            {hasLocation ? <MapPin className="h-5 w-5 text-sky-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
          </div>
          <div>
            {workLocation ? (
              <>
                <p className="font-semibold text-gray-900">{workLocation.name}</p>
                {hasLocation
                  ? <p className="text-xs text-sky-600">نطاق البصمة: {workLocation.radius} متر</p>
                  : <p className="text-xs text-amber-600">لم يُحدد نطاق جغرافي بعد</p>}
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-900">لا يوجد موقع عمل محدد</p>
                <p className="text-xs text-amber-600">تواصل مع الموارد البشرية لتحديد موقعك</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* خريطة الدائرة */}
      {workLocation?.latitude && workLocation?.longitude && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <GeofenceMap
              lat={workLocation.latitude}
              lng={workLocation.longitude}
              radius={workLocation.radius}
              userLocation={userPos}
              height={220}
            />
          </CardContent>
          <div className="px-4 py-2 bg-gray-50 border-t flex items-center gap-2 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shrink-0" />
            موقع المكتب ونطاق البصمة
            {userPos && <><span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0 mr-2" />موقعك الحالي</>}
          </div>
        </Card>
      )}

      {/* حالة الحضور اليوم */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-gray-500 mb-3">حضورك اليوم</p>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 text-center ${checkedIn ? "bg-green-50" : "bg-gray-50"}`}>
              <LogIn className={`h-5 w-5 mx-auto mb-1 ${checkedIn ? "text-green-600" : "text-gray-300"}`} />
              <p className="text-xs text-gray-500">وقت الدخول</p>
              <p className={`text-lg font-bold tabular-nums ${checkedIn ? "text-green-700" : "text-gray-300"}`}>{fmt(attendance?.checkIn)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${checkedOut ? "bg-red-50" : "bg-gray-50"}`}>
              <LogOut className={`h-5 w-5 mx-auto mb-1 ${checkedOut ? "text-red-500" : "text-gray-300"}`} />
              <p className="text-xs text-gray-500">وقت الخروج</p>
              <p className={`text-lg font-bold tabular-nums ${checkedOut ? "text-red-600" : "text-gray-300"}`}>{fmt(attendance?.checkOut)}</p>
            </div>
          </div>
          {checkedIn && !checkedOut && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              أنت داخل الدوام
            </div>
          )}
          {checkedOut && (
            <div className="mt-3 text-center text-sm text-gray-500">انتهى دوامك اليوم</div>
          )}
        </CardContent>
      </Card>

      {/* رسالة الحالة */}
      {state !== "idle" && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          state === "success" ? "bg-green-50 border border-green-200" :
          state === "outside" ? "bg-red-50 border border-red-200" :
          state === "locating" ? "bg-blue-50 border border-blue-200" :
          "bg-red-50 border border-red-200"
        }`}>
          {state === "locating" && <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0 mt-0.5" />}
          {state === "success" && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
          {state === "outside" && <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          {state === "error" && <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-medium ${
              state === "success" ? "text-green-700" :
              state === "locating" ? "text-blue-700" : "text-red-700"
            }`}>
              {state === "locating" ? "جارٍ تحديد موقعك..." : message}
            </p>
            {distance !== null && state === "success" && (
              <p className="text-xs text-green-600 mt-0.5">بُعدك عن المكتب: {distance} متر</p>
            )}
          </div>
        </div>
      )}

      {/* أزرار البصمة */}
      <div className="grid gap-3">
        {onLeave ? (
          <div className="h-16 rounded-2xl bg-purple-50 border-2 border-purple-200 flex items-center justify-center gap-2 text-purple-500">
            <Palmtree className="h-5 w-5" />
            <span className="font-medium">البصمة متوقفة خلال الإجازة</span>
          </div>
        ) : !checkedIn ? (
          <Button
            size="lg"
            className="h-16 text-lg gap-3 rounded-2xl bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-200"
            disabled={state === "locating"}
            onClick={() => doCheckin("checkin")}
          >
            {state === "locating" ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogIn className="h-6 w-6" />}
            تسجيل الدخول
          </Button>
        ) : !checkedOut ? (
          <>
            <Button
              size="lg"
              variant="outline"
              className="h-16 text-lg gap-3 rounded-2xl border-2 border-red-200 text-red-600 hover:bg-red-50"
              disabled={state === "locating"}
              onClick={() => doCheckin("checkout")}
            >
              {state === "locating" ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogOut className="h-6 w-6" />}
              تسجيل الخروج
            </Button>
          </>
        ) : (
          <div className="h-16 rounded-2xl bg-gray-100 flex items-center justify-center gap-2 text-gray-400">
            <CheckCircle2 className="h-5 w-5" />
            <span>اكتملت بصمتك اليوم</span>
          </div>
        )}
      </div>

      {/* تنبيه GPS */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Navigation className="h-3.5 w-3.5" />
        <span>تأكد من تفعيل الموقع الجغرافي (GPS) على جهازك</span>
      </div>
    </div>
  );
}
