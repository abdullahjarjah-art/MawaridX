"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, MapPin, AlertTriangle, ArrowUpRight, Building2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLang } from "@/components/lang-provider";

const GeofenceMap = dynamic(
  () => import("@/components/geofence-map").then((m) => m.GeofenceMap),
  { ssr: false }
);

type Attendance = {
  id: string; date: string; status: string;
  checkIn?: string; checkOut?: string; workHours?: number;
  lateMins?: number;
};
type Geofence = { lat: number; lng: number; radius: number; name: string };
type UserLocation = { lat: number; lng: number } | null;
type AttSettings = { type: "fixed" | "flexible"; checkInTime: string; checkOutTime: string; requiredHours: number; lateToleranceMinutes: number };
type AssignedLocation = { id: string; name: string; address?: string; latitude?: number; longitude?: number; radius?: number; active: boolean };

// حساب المسافة بين نقطتين بالأمتار (Haversine)
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PortalAttendancePage() {
  const { t } = useLang();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [todayAtt, setTodayAtt] = useState<Attendance | null>(null);
  const [geofence, setGeofence] = useState<Geofence | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "inside" | "outside" | "no_geofence" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [attSettings, setAttSettings] = useState<AttSettings>({ type: "fixed", checkInTime: "08:00", checkOutTime: "17:00", requiredHours: 8, lateToleranceMinutes: 15 });
  // بصمة متعدد الفروع
  const [multiLocation, setMultiLocation] = useState(false);
  const [assignedLocations, setAssignedLocations] = useState<AssignedLocation[]>([]);
  const [allLocations, setAllLocations] = useState<AssignedLocation[]>([]);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [pickerAction, setPickerAction] = useState<"checkIn" | "checkOut">("checkIn");
  const [selectedLocId, setSelectedLocId] = useState<string>("");
  const now = new Date();

  const fetchData = async (empId: string) => {
    const res = await fetch(`/api/attendance?employeeId=${empId}&month=${now.getMonth() + 1}&year=${now.getFullYear()}&all=1`);
    const raw = await res.json();
    const data: Attendance[] = Array.isArray(raw) ? raw : (raw.data ?? []);
    setAttendance(data);
    const today = data.find((a) => new Date(a.date).toDateString() === new Date().toDateString());
    setTodayAtt(today ?? null);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/settings/geofence").then((r) => r.json()),
      fetch("/api/settings/attendance").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]).then(([user, geo, att, locs]) => {
      // جميع الفروع النشطة للشركة
      const activeLocs: AssignedLocation[] = (Array.isArray(locs) ? locs : (locs.data ?? []))
        .filter((l: AssignedLocation) => l.active);
      setAllLocations(activeLocs);

      if (user.employee?.id) {
        setEmployeeId(user.employee.id);
        fetchData(user.employee.id);
        // بصمة متعدد الفروع
        if (user.employee.multiLocation) {
          setMultiLocation(true);
          const assigned = (user.employee.assignedLocations ?? []).map((r: { location: AssignedLocation }) => r.location);
          setAssignedLocations(assigned.filter((l: AssignedLocation) => l.active));
        }
      }
      setGeofence(geo);
      if (!geo && !user.employee?.multiLocation) setLocationStatus("no_geofence");
      if (att) setAttSettings(att);
    });
  }, []);

  const checkLocation = (targetLocation?: { lat: number; lng: number; radius: number; name: string } | null): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      setLocationStatus("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);

          const fence = targetLocation ?? geofence;
          if (!fence) {
            setLocationStatus("no_geofence");
            resolve(loc);
            return;
          }

          const dist = Math.round(getDistance(loc.lat, loc.lng, fence.lat, fence.lng));
          setDistance(dist);

          if (dist <= fence.radius) {
            setLocationStatus("inside");
            resolve(loc);
          } else {
            setLocationStatus("outside");
            reject(new Error(t(`أنت على بُعد ${dist} متر من ${fence.name}`)));
          }
        },
        () => {
          setLocationStatus("error");
          reject(new Error(t("تعذّر الحصول على موقعك، تأكد من تفعيل GPS")));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // الكشف التلقائي عن الفرع الذي يتواجد فيه الموظف من بين جميع فروع الشركة
  const autoDetectLocation = (): Promise<{ userLat: number; userLng: number; matchedLoc: AssignedLocation | null }> => {
    return new Promise((resolve, reject) => {
      setLocationStatus("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setUserLocation({ lat: userLat, lng: userLng });

          // ابحث عن أي فرع يوجد فيه الموظف الآن
          let matchedLoc: AssignedLocation | null = null;
          for (const loc of allLocations) {
            if (!loc.latitude || !loc.longitude) continue;
            const dist = getDistance(userLat, userLng, loc.latitude, loc.longitude);
            if (dist <= (loc.radius ?? 200)) { matchedLoc = loc; break; }
          }

          if (matchedLoc) {
            setLocationStatus("inside");
            setDistance(0);
            resolve({ userLat, userLng, matchedLoc });
          } else {
            setLocationStatus("outside");
            // أقرب فرع لرسالة الخطأ
            let minDist = Infinity;
            let nearest: AssignedLocation | null = null;
            for (const loc of allLocations) {
              if (!loc.latitude || !loc.longitude) continue;
              const d = getDistance(userLat, userLng, loc.latitude, loc.longitude);
              if (d < minDist) { minDist = d; nearest = loc; }
            }
            setDistance(Math.round(minDist));
            const msg = nearest
              ? `أنت لست داخل أي فرع — أقرب فرع: ${nearest.name} (${Math.round(minDist)} متر)`
              : "أنت لست داخل أي فرع من فروع الشركة";
            reject(new Error(msg));
          }
        },
        () => {
          setLocationStatus("error");
          reject(new Error(t("تعذّر الحصول على موقعك، تأكد من تفعيل GPS")));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // تسجيل الحضور (مع دعم متعدد الفروع)
  const doCheckIn = async (locationId?: string) => {
    const selectedLoc = locationId ? assignedLocations.find(l => l.id === locationId) : null;
    const fence = selectedLoc?.latitude ? { lat: selectedLoc.latitude, lng: selectedLoc.longitude!, radius: selectedLoc.radius ?? 200, name: selectedLoc.name } : null;
    try {
      const loc = await checkLocation(fence);
      if (!employeeId) return;
      setLoading(true);
      const now = new Date();
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          date: now.toISOString(),
          checkIn: now.toISOString(),
          checkInLocationId: locationId || null,
          status: (() => {
            if (attSettings.type === "flexible") return "present";
            const [h, m] = attSettings.checkInTime.split(":").map(Number);
            const limit = new Date(now); limit.setHours(h, m + attSettings.lateToleranceMinutes, 0);
            return now > limit ? "late" : "present";
          })(),
          notes: loc ? `${t("موقع")}: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : "",
        }),
      });
      setLoading(false);
      setShowLocPicker(false);
      fetchData(employeeId);
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : t("خطأ في تسجيل الحضور"));
    }
  };

  const doCheckOut = async (locationId?: string) => {
    if (!todayAtt) return;
    const selectedLoc = locationId ? assignedLocations.find(l => l.id === locationId) : null;
    const fence = selectedLoc?.latitude ? { lat: selectedLoc.latitude, lng: selectedLoc.longitude!, radius: selectedLoc.radius ?? 200, name: selectedLoc.name } : null;
    try {
      await checkLocation(fence);
      setLoading(true);
      const now = new Date();
      const checkInTime = todayAtt.checkIn ? new Date(todayAtt.checkIn) : now;
      const workHours = Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 10) / 10;
      await fetch(`/api/attendance/${todayAtt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...todayAtt, checkOut: now.toISOString(), workHours, checkOutLocationId: locationId || null }),
      });
      setLoading(false);
      setShowLocPicker(false);
      fetchData(employeeId!);
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : t("خطأ في تسجيل الانصراف"));
    }
  };

  // نقطة الدخول الموحّدة — إذا multiLocation تعرض picker أو auto-detect وإلا تنفذ مباشرة
  const checkIn = async () => {
    if (multiLocation && assignedLocations.length > 0) {
      // فروع محددة → منتقي الفرع
      setPickerAction("checkIn");
      setSelectedLocId(assignedLocations[0]?.id ?? "");
      setShowLocPicker(true);
    } else if (multiLocation && assignedLocations.length === 0) {
      // متعدد الفروع بدون تخصيص → اكتشاف تلقائي من جميع فروع الشركة
      setLoading(true);
      try {
        const { userLat, userLng, matchedLoc } = await autoDetectLocation();
        if (!employeeId) return;
        const now = new Date();
        await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            date: now.toISOString(),
            checkIn: now.toISOString(),
            checkInLocationId: matchedLoc?.id ?? null,
            status: (() => {
              if (attSettings.type === "flexible") return "present";
              const [h, m] = attSettings.checkInTime.split(":").map(Number);
              const limit = new Date(now); limit.setHours(h, m + attSettings.lateToleranceMinutes, 0);
              return now > limit ? "late" : "present";
            })(),
            notes: `${t("موقع")}: ${userLat.toFixed(5)}, ${userLng.toFixed(5)}`,
          }),
        });
        fetchData(employeeId);
      } catch (err) {
        alert(err instanceof Error ? err.message : t("خطأ في تسجيل الحضور"));
      }
      setLoading(false);
    } else {
      doCheckIn();
    }
  };

  const checkOut = async () => {
    if (multiLocation && assignedLocations.length > 0) {
      // فروع محددة → منتقي الفرع
      setPickerAction("checkOut");
      setSelectedLocId(assignedLocations[0]?.id ?? "");
      setShowLocPicker(true);
    } else if (multiLocation && assignedLocations.length === 0) {
      // متعدد الفروع بدون تخصيص → اكتشاف تلقائي
      if (!todayAtt) return;
      setLoading(true);
      try {
        const { userLat, userLng, matchedLoc } = await autoDetectLocation();
        const now = new Date();
        const checkInTime = todayAtt.checkIn ? new Date(todayAtt.checkIn) : now;
        const workHours = Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 10) / 10;
        await fetch(`/api/attendance/${todayAtt.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...todayAtt,
            checkOut: now.toISOString(),
            workHours,
            checkOutLocationId: matchedLoc?.id ?? null,
            notes: `${t("موقع")}: ${userLat.toFixed(5)}, ${userLng.toFixed(5)}`,
          }),
        });
        fetchData(employeeId!);
      } catch (err) {
        alert(err instanceof Error ? err.message : t("خطأ في تسجيل الانصراف"));
      }
      setLoading(false);
    } else {
      doCheckOut();
    }
  };

  const CHECKIN_LIMIT = (() => {
    if (!attSettings?.checkInTime) return 8 * 60;
    const [h, m] = attSettings.checkInTime.split(":").map(Number);
    return h * 60 + m + (attSettings.lateToleranceMinutes ?? 0);
  })();
  const getLateMins = (a: Attendance) => {
    if (!a.checkIn || a.status === "absent") return 0;
    const d = new Date(a.checkIn);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins > CHECKIN_LIMIT ? mins - CHECKIN_LIMIT : 0;
  };
  const formatMins = (m: number) => {
    if (m === 0) return "—";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h} ${t("س")} ${min} ${t("د")}` : `${min} ${t("د")}`;
  };

  // تنسيق الوقت بصيغة "09:30 صباحاً / مساءً"
  const fmtTime = (iso: string | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const hh = (h % 12 || 12).toString().padStart(2, "0");
    const period = h < 12 ? t("صباحاً") : t("مساءً");
    return { time: `${hh}:${m}`, period };
  };

  // تنسيق ساعات العمل بصيغة "X ساعات و Y دقيقة"
  const fmtWorkHours = (hours: number | undefined) => {
    if (!hours) return null;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} ${t("دقيقة")}`;
    if (m === 0) return `${h} ${t("ساعات")}`;
    return `${h} ${t("ساعات")} ${t("و")} ${m} ${t("دقيقة")}`;
  };

  const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;
  const totalLateMins = attendance.reduce((sum, a) => sum + getLateMins(a), 0);

  const locationBanner = () => {
    if (locationStatus === "locating") return (
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-2 text-sm text-sky-700">
        <Clock className="h-4 w-4 animate-spin" /> {t("جارٍ تحديد موقعك...")}
      </div>
    );
    if (locationStatus === "inside") return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4" /> {t("أنت داخل نطاق")} {geofence?.name} ({distance} {t("متر")})
      </div>
    );
    if (locationStatus === "outside") return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
        <XCircle className="h-4 w-4" /> {t("أنت خارج النطاق")} — {distance} {t("متر من")} {geofence?.name} ({t("المسموح")}: {geofence?.radius}{t("م")})
      </div>
    );
    if (locationStatus === "error") return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 text-sm text-yellow-700">
        <AlertTriangle className="h-4 w-4" /> {t("تعذّر تحديد الموقع — تأكد من تفعيل GPS")}
      </div>
    );
    if (locationStatus === "no_geofence") return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 text-sm text-yellow-700">
        <AlertTriangle className="h-4 w-4" /> {t("لم يُحدَّد موقع المكتب بعد — تواصل مع الإدارة")}
      </div>
    );
    return null;
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("الحضور والانصراف")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {now.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* بطاقة تسجيل اليوم */}
      <Card className="mb-4 border-2 border-sky-100">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500 mb-4 font-medium">{t("تسجيل الحضور والانصراف")}</p>

          <div className="space-y-3 mb-4">{locationBanner()}</div>

          {!todayAtt ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">{t("لم تُسجّل حضورك بعد")}</p>
              <Button
                onClick={checkIn}
                disabled={loading || locationStatus === "locating" || locationStatus === "no_geofence"}
                size="lg"
                className="w-full max-w-xs gap-2"
              >
                <MapPin className="h-5 w-5" />
                {loading ? t("جارٍ التسجيل...") : t("تسجيل الحضور")}
              </Button>
              <p className="text-xs text-gray-400 text-center">{t("سيُطلب منك السماح بالموقع عند الضغط")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* تسجيل الحضور */}
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-green-700 font-medium">{t("تسجيل الحضور")}</p>
                  </div>
                  {(() => {
                    const t = fmtTime(todayAtt.checkIn);
                    return t ? (
                      <>
                        <p className="text-xl font-bold text-green-700">{t.time}</p>
                        <p className="text-xs text-green-500">{t.period}</p>
                      </>
                    ) : <p className="text-xl font-bold text-gray-300">—</p>;
                  })()}
                </div>
                {/* تسجيل الانصراف */}
                <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUpRight className="h-4 w-4 text-orange-500" />
                    <p className="text-xs text-orange-700 font-medium">{t("تسجيل الانصراف")}</p>
                  </div>
                  {(() => {
                    const t = fmtTime(todayAtt.checkOut);
                    return t ? (
                      <>
                        <p className="text-xl font-bold text-orange-700">{t.time}</p>
                        <p className="text-xs text-orange-500">{t.period}</p>
                      </>
                    ) : <p className="text-xl font-bold text-gray-300">—</p>;
                  })()}
                </div>
                {/* ساعات العمل */}
                <div className="bg-sky-50 rounded-xl p-3 text-center border border-sky-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="h-4 w-4 text-sky-500" />
                    <p className="text-xs text-sky-700 font-medium">{t("ساعات العمل")}</p>
                  </div>
                  {(() => {
                    const wh = fmtWorkHours(todayAtt.workHours);
                    return wh ? (
                      <p className="text-sm font-bold text-sky-700 leading-tight">{wh}</p>
                    ) : <p className="text-xl font-bold text-gray-300">—</p>;
                  })()}
                </div>
              </div>

              <div className="flex justify-center">
                <Badge variant={todayAtt.status === "present" ? "default" : "outline"} className="px-4 py-1">
                  {todayAtt.status === "present" ? t("حاضر") : todayAtt.status === "late" ? t("متأخر") : todayAtt.status}
                </Badge>
              </div>

              {!todayAtt.checkOut && (
                <Button
                  onClick={checkOut}
                  disabled={loading || locationStatus === "locating"}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <MapPin className="h-5 w-5" />
                  {loading ? t("جارٍ التسجيل...") : t("تسجيل الانصراف")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* خريطة الموقع */}
      {geofence && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-sky-600" />
              <p className="text-sm font-medium">{geofence.name} — {t("نطاق")} {geofence.radius} {t("متر")}</p>
            </div>
            <GeofenceMap
              lat={geofence.lat}
              lng={geofence.lng}
              radius={geofence.radius}
              userLocation={userLocation}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-7 w-7 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{presentCount}</p>
              <p className="text-xs text-gray-500">{t("أيام حضور هذا الشهر")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-7 w-7 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{absentCount}</p>
              <p className="text-xs text-gray-500">{t("أيام غياب هذا الشهر")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{lateCount}</p>
              <p className="text-xs text-gray-500">{t("أيام تأخر هذا الشهر")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-7 w-7 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{formatMins(totalLateMins)}</p>
              <p className="text-xs text-gray-500">{t("إجمالي دقائق التأخير")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="font-semibold text-gray-800 mb-3">{t("سجل الشهر")}</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t("التاريخ")}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الحالة")}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {t("تسجيل الحضور")}
                </span>
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" /> {t("تسجيل الانصراف")}
                </span>
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t("عدد ساعات العمل")}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t("التأخير")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {attendance.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">{t("لا توجد سجلات هذا الشهر")}</td></tr>
            ) : attendance.map((a) => {
              const cin = fmtTime(a.checkIn);
              const cout = fmtTime(a.checkOut);
              const wh = fmtWorkHours(a.workHours);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(a.date).toLocaleDateString("ar-SA", { weekday: "short", day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : a.status === "leave" ? "secondary" : "outline"}
                      className={a.status === "late" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}>
                      {a.status === "present" ? t("حاضر") : a.status === "absent" ? t("غائب") : a.status === "late" ? t("متأخر") : a.status === "leave" ? t("إجازة") : t("نصف دوام")}
                    </Badge>
                  </td>
                  {/* تسجيل الحضور */}
                  <td className="px-4 py-3">
                    {cin ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="font-medium text-gray-800">{cin.time}</span>
                        <span className="text-xs text-gray-400">{cin.period}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  {/* تسجيل الانصراف */}
                  <td className="px-4 py-3">
                    {cout ? (
                      <span className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="font-medium text-gray-800">{cout.time}</span>
                        <span className="text-xs text-gray-400">{cout.period}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  {/* ساعات العمل */}
                  <td className="px-4 py-3">
                    {wh ? (
                      <span className="text-gray-700">{wh}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {getLateMins(a) > 0 ? (
                      <span className="text-yellow-600 font-medium text-xs">{formatMins(getLateMins(a))}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Location Picker Dialog (بصمة متعدد الفروع) ── */}
      <Dialog open={showLocPicker} onOpenChange={setShowLocPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              {pickerAction === "checkIn" ? t("اختر فرع الحضور") : t("اختر فرع الانصراف")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {assignedLocations.map(loc => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocId(loc.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-right ${
                  selectedLocId === loc.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 bg-white hover:border-indigo-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedLocId === loc.id ? "bg-indigo-500" : "bg-gray-100"}`}>
                  <MapPin className={`h-4 w-4 ${selectedLocId === loc.id ? "text-white" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${selectedLocId === loc.id ? "text-indigo-700" : "text-gray-800"}`}>{loc.name}</p>
                  {loc.address && <p className="text-xs text-gray-400">{loc.address}</p>}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLocPicker(false)}>{t("إلغاء")}</Button>
            <Button
              disabled={!selectedLocId || loading}
              onClick={() => pickerAction === "checkIn" ? doCheckIn(selectedLocId) : doCheckOut(selectedLocId)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? t("جارٍ التسجيل...") : pickerAction === "checkIn" ? t("تسجيل الحضور") : t("تسجيل الانصراف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
