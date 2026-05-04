"use client";

import { useEffect, useState } from "react";
import { Megaphone, MapPin, Fingerprint, CalendarPlus, Briefcase, ChevronLeft, CheckCircle2, Loader2, Umbrella, ClipboardList, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { useLang } from "@/components/lang-provider";

type User = {
  employee?: { id: string; firstName: string; lastName: string; jobTitle?: string; department?: string; employeeNumber: string; position?: string; startDate?: string; photo?: string | null };
};
type Leave = { id: string; type: string; startDate: string; endDate: string; days: number; status: string };
type Attendance = { id: string; date: string; status: string; checkIn?: string; checkOut?: string; workHours?: number };
type Announcement = { id: string; title: string; content: string; priority: string; authorName: string; createdAt: string };
type LeaveBalance = { annual: number; usedAnnual: number };

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcAccruedLeave(startDate: string) {
  const months = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  return Math.floor(months * 2.5 * 10) / 10;
}

export default function PortalHomePage() {
  const router = useRouter();
  const { t } = useLang();

  const leaveStatusMap: Record<string, { label: string; color: string }> = {
    pending: { label: t("بانتظار الموافقة"), color: "text-amber-600 bg-amber-50" },
    manager_approved: { label: t("بانتظار الإدارة"), color: "text-blue-600 bg-blue-50" },
    approved: { label: t("مؤكدة"), color: "text-green-600 bg-green-50" },
    rejected: { label: t("مرفوضة"), color: "text-red-600 bg-red-50" },
  };
  const leaveTypeMap: Record<string, string> = { annual: t("سنوية"), sick: t("مرضية"), emergency: t("طارئة"), unpaid: t("بدون راتب") };

  const [user, setUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [geofence, setGeofence] = useState<{ lat: number; lng: number; radius: number; name: string } | null>(null);
  const [attSettings, setAttSettings] = useState<{ type: string; checkInTime: string; lateToleranceMinutes: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(new Date());
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = () => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/settings/geofence").then(r => r.json()).catch(() => null),
      fetch("/api/settings/attendance").then(r => r.json()).catch(() => null),
    ]).then(([data, geo, att]) => {
      setUser(data);
      if (geo && !geo.error) setGeofence(geo);
      if (att && !att.error) setAttSettings(att);
      const dept = data.employee?.department ?? "";
      const annUrl = dept ? `/api/announcements?active=1&department=${encodeURIComponent(dept)}` : "/api/announcements?active=1";
      fetch(annUrl).then(r => r.json()).then(ann => setAnnouncements(Array.isArray(ann) ? ann : [])).catch(() => {});
      if (data.employee?.id) {
        const n = new Date();
        Promise.all([
          fetch(`/api/leaves?employeeId=${data.employee.id}`).then(r => r.json()),
          fetch(`/api/attendance?employeeId=${data.employee.id}&month=${n.getMonth() + 1}&year=${n.getFullYear()}`).then(r => r.json()),
          fetch(`/api/leave-balance?employeeId=${data.employee.id}&year=${n.getFullYear()}`).then(r => r.json()),
        ]).then(([l, a, b]) => {
          setLeaves(Array.isArray(l) ? l : []);
          setAttendance(Array.isArray(a) ? a : []);
          if (b && !b.error) setLeaveBalance(b);
          setReady(true);
        });
      } else { setReady(true); }
    });
  };

  useEffect(() => {
    loadData();
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadData(); });
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const todayAtt = attendance.find(a => new Date(a.date).toDateString() === new Date().toDateString());
  const checkedIn = !!todayAtt?.checkIn;
  const checkedOut = !!todayAtt?.checkOut;
  const done = checkedIn && checkedOut;
  const incompleteCount = attendance.filter(a => a.checkIn && !a.checkOut && new Date(a.date).toDateString() !== new Date().toDateString()).length;
  const accrued = user?.employee?.startDate ? calcAccruedLeave(user.employee.startDate) : 0;
  const remaining = Math.max(0, accrued - (leaveBalance?.usedAnnual ?? 0));
  const pendingLeaves = leaves.filter(l => l.status === "pending" || l.status === "manager_approved");

  const handleCheckin = async () => {
    if (done || checkinLoading || !user?.employee?.id) return;
    setCheckinLoading(true);
    setCheckinMsg(null);
    try {
      const pos = await new Promise<GeolocationCoordinates>((res, rej) =>
        navigator.geolocation.getCurrentPosition(p => res(p.coords), () => rej(new Error(t("تعذّر الحصول على موقعك"))), { enableHighAccuracy: true, timeout: 10000 })
      );
      if (geofence) {
        const dist = Math.round(haversine(pos.latitude, pos.longitude, geofence.lat, geofence.lng));
        if (dist > geofence.radius) { setCheckinMsg({ text: t(`أنت خارج النطاق (${dist}م)`), ok: false }); setCheckinLoading(false); return; }
      }
      const now = new Date();
      if (!checkedIn) {
        const res = await fetch("/api/attendance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: user.employee.id, date: now.toISOString(), checkIn: now.toISOString(), status: "present" }),
        });
        if (!res.ok) throw new Error(t("فشل التسجيل"));
        setCheckinMsg({ text: t("تم تسجيل الحضور ✓"), ok: true });
      } else {
        const now = new Date();
        const workHours = todayAtt?.checkIn ? Math.round(((now.getTime() - new Date(todayAtt.checkIn).getTime()) / 3600000) * 10) / 10 : 0;
        const res = await fetch(`/api/attendance/${todayAtt!.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...todayAtt, checkOut: now.toISOString(), workHours }),
        });
        if (!res.ok) throw new Error(t("فشل التسجيل"));
        setCheckinMsg({ text: t("تم تسجيل الانصراف ✓"), ok: true });
      }
      loadData();
    } catch (e) { setCheckinMsg({ text: e instanceof Error ? e.message : t("حدث خطأ"), ok: false }); }
    setCheckinLoading(false);
  };

  const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top bar */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/portal/profile")} className="rounded-full">
            <EmployeeAvatar photo={user?.employee?.photo} firstName={user?.employee?.firstName ?? "م"} lastName={user?.employee?.lastName} size="md" />
          </button>
          <Megaphone className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{now.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}</span>
          <Calendar className="h-4 w-4" />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* تحية */}
        <div className="text-right">
          <p className="text-gray-500 text-sm">{t(greetingKey())}</p>
          <p className="text-2xl font-bold text-gray-900">{user?.employee?.firstName} {user?.employee?.lastName}</p>
        </div>

        {/* بطاقة البصمة الداكنة */}
        <div className="bg-[#1e2340] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {geofence?.name && (
              <span className="bg-white/15 text-white/90 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {geofence.name}
              </span>
            )}
            {attSettings?.checkInTime && (
              <span className="bg-white/15 text-white/90 text-xs px-3 py-1.5 rounded-full">
                {attSettings.checkInTime}
              </span>
            )}
          </div>

          <div className="text-right mb-5">
            <span className="text-5xl font-bold tracking-tight">{timeStr}</span>
            {attSettings?.checkInTime && (
              <span className="text-xl text-white/40">/{attSettings.checkInTime}</span>
            )}
          </div>

          {checkinMsg && (
            <div className={`mb-3 text-xs px-3 py-2 rounded-xl ${checkinMsg.ok ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"}`}>
              {checkinMsg.text}
            </div>
          )}

          <button
            onClick={handleCheckin}
            disabled={done || checkinLoading || !ready}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
              ${done ? "bg-white/10 text-white/40 cursor-default" : "bg-white/20 hover:bg-white/30 active:scale-98 text-white"}`}
          >
            {checkinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {done
              ? `✓ ${t("الدوام مكتمل")} · ${new Date(todayAtt!.checkIn!).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })} — ${new Date(todayAtt!.checkOut!).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`
              : checkedIn
              ? `${t("تسجيل الانصراف")} · ${t("دخول")} ${new Date(todayAtt!.checkIn!).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`
              : t("تسجيل الحضور / تسجيل الانصراف")}
          </button>
        </div>

        {/* اختصارات سريعة */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Fingerprint, label: t("تصحيح البصمة"), href: "/portal/requests?type=attendance_fix" },
            { icon: CalendarPlus, label: t("طلب إجازة"), href: "/portal/leaves" },
            { icon: Briefcase, label: t("طلب عمل"), href: "/portal/requests?type=other" },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm border border-gray-100 hover:border-sky-200 active:scale-95 transition-all">
              <Icon className="h-6 w-6 text-gray-600" strokeWidth={1.5} />
              <span className="text-xs text-gray-600 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* طلباتك */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Link href="/portal/requests" className="flex items-center gap-1 text-sm text-gray-400">
              <span>{t("عرض الكل")}</span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-base font-bold text-gray-900">{t("طلباتك")}</h2>
          </div>
          {pendingLeaves.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 border border-gray-100">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-blue-300" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-gray-400">{t("تم مراجعة جميع الطلبات")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.slice(0, 3).map(l => (
                <div key={l.id} className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-gray-100">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${leaveStatusMap[l.status]?.color ?? "text-gray-500 bg-gray-100"}`}>
                    {leaveStatusMap[l.status]?.label}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">{leaveTypeMap[l.type] ?? l.type}</p>
                    <p className="text-xs text-gray-400">{new Date(l.startDate).toLocaleDateString("ar-SA")} · {l.days} {t("يوم")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الإعلانات */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Link href="/portal/announcements" className="flex items-center gap-1 text-sm text-gray-400">
              <span>{t("عرض الكل")}</span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-base font-bold text-gray-900">{t("الإعلانات")}</h2>
          </div>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 border border-gray-100">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm text-gray-400">{t("لا يوجد جديد اليوم")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.slice(0, 3).map(a => (
                <div key={a.id} className={`bg-white rounded-2xl px-4 py-3 border-r-4 border border-gray-100
                  ${a.priority === "urgent" ? "border-r-red-500" : a.priority === "important" ? "border-r-amber-400" : "border-r-blue-400"}`}>
                  <div className="flex items-start gap-2">
                    {a.priority === "urgent" && <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 text-right">
                      <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{a.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الرصيد المتبقي */}
        <div>
          <h2 className="text-base font-bold text-gray-900 text-right mb-3">{t("الرصيد المتبقي")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <Umbrella className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{t("الرصيد المستحق")}</p>
                <p className="text-xl font-bold text-gray-800">{remaining}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-teal-500" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{t("سجلات غير مكتملة")}</p>
                <p className="text-xl font-bold text-gray-800">{incompleteCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
