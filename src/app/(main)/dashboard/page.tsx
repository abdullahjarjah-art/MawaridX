"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/lang-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users, CalendarCheck, Clock, ClipboardList, DollarSign,
  Megaphone, Globe, Building2, AlertTriangle, ShieldAlert, RefreshCw,
  AlarmClock, CheckCircle, XCircle, FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { EmployeeAvatar } from "@/components/employee-avatar";

type LateRecord = {
  id: string; checkIn?: string;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
};
type PendingRequest = {
  id: string; type: string; title: string; status: string; createdAt: string;
  employee: { firstName: string; lastName: string; photo?: string | null };
};
type SalaryInfo = {
  paidCount: number; paidTotal: number;
  pendingCount: number; pendingTotal: number;
  month: number; year: number;
};
type WeekDay = { date: string; present: number; late: number; absent: number };

type DashboardData = {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendance: number;
  pendingLeaves: number;
  pendingRequests: number;
  recentEmployees: { id: string; firstName: string; lastName: string; jobTitle?: string; department?: string; createdAt: string; employeeNumber: string; photo?: string | null }[];
  pendingRequestsList: PendingRequest[];
  iqamaRenewals: { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string; iqamaExpiry: string }[];
  weekChart: WeekDay[];
  lateToday: LateRecord[];
  salaryInfo: SalaryInfo;
};

const requestTypeMap: Record<string, string> = {
  leave: "إجازة", attendance_fix: "تصحيح بصمة", loan: "سلفة",
  custody: "عهدة", exit_return: "خروج وعودة", resignation: "استقالة", letter: "خطاب",
};

const dayNames = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

type Announcement = { id: string; title: string; content: string; scope: string; department?: string; authorName: string; priority: string; createdAt: string };

export default function DashboardPage() {
  const { t } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [docAlerts, setDocAlerts]         = useState<{ id: string; title: string; daysLeft: number; category: string }[]>([]);
  const [renewEmp, setRenewEmp] = useState<DashboardData["iqamaRenewals"][0] | null>(null);
  const [newExpiry, setNewExpiry] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);

  const loadData = () => {
    fetch("/api/dashboard").then(r => r.json()).then(setData);
    fetch("/api/announcements?active=1").then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/company-docs/notify").then(r => r.json()).then(d => setDocAlerts(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleRenew = async () => {
    if (!renewEmp || !newExpiry) return;
    setRenewLoading(true);
    await fetch(`/api/employees/${renewEmp.id}/renew-iqama`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iqamaExpiry: newExpiry }),
    });
    setRenewLoading(false);
    setRenewEmp(null);
    setNewExpiry("");
    loadData();
  };

  if (!data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: t("إجمالي الموظفين"), value: data.totalEmployees,
      sub: `${data.activeEmployees} ${t("نشط")}`, icon: Users,
      iconBg: "bg-brand-gradient", iconColor: "text-white",
      accent: "from-brand-primary/10 to-brand-primary/5",
      href: "/employees",
    },
    {
      title: t("حضور اليوم"), value: data.todayAttendance,
      sub: `${t("من")} ${data.activeEmployees} ${t("موظف")}`, icon: CalendarCheck,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600", iconColor: "text-white",
      accent: "from-emerald-500/10 to-emerald-500/5",
      href: "/attendance",
    },
    {
      title: t("طلبات معلقة"), value: data.pendingRequests,
      sub: t("تنتظر إجراءك"), icon: ClipboardList,
      iconBg: "bg-gold-gradient", iconColor: "text-white",
      accent: "from-brand-gold/10 to-brand-gold/5",
      href: "/requests",
    },
    {
      title: t("رواتب الشهر"),
      value: data.salaryInfo.paidCount + data.salaryInfo.pendingCount,
      sub: data.salaryInfo.pendingCount > 0
        ? `${data.salaryInfo.pendingCount} ${t("معلق")}`
        : data.salaryInfo.paidCount > 0 ? t("تم الصرف") : t("لم تُولَّد بعد"),
      icon: DollarSign,
      iconBg: "bg-gradient-to-br from-emerald-600 to-green-700", iconColor: "text-white",
      accent: "from-emerald-600/10 to-emerald-600/5",
      href: "/salaries",
    },
  ];

  // أعلى قيمة في الرسم البياني
  const chartMax = Math.max(...data.weekChart.map(d => d.present + d.late + d.absent), 1);

  return (
    <div className="p-3 sm:p-6 relative">
      {/* ─── Hero Header موقّع ─── */}
      <div className="relative mb-5 sm:mb-7 rounded-2xl overflow-hidden border border-brand-border shadow-soft">
        <div className="absolute inset-0 bg-brand-gradient" />
        <div className="absolute inset-0 pattern-islamic opacity-[0.18]" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-12 w-56 h-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative px-5 sm:px-7 py-5 sm:py-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs sm:text-sm text-white/75 font-medium">{t("أهلاً بك في")}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">
              {t("لوحة التحكم")} <span className="text-gold-gradient">MawaridX</span>
            </h1>
            <p className="text-white/80 text-xs sm:text-sm mt-2">{t("نظرة شاملة على موارد منشأتك")}</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="glass rounded-xl px-4 py-2.5 text-white">
              <p className="text-[10px] uppercase tracking-wider opacity-70">{t("اليوم")}</p>
              <p className="text-sm font-bold mt-0.5">{new Date().toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* الكروت الأربعة — stagger animation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8 stagger">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href} className="group">
              <div className="relative card-brand overflow-hidden cursor-pointer h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative p-3 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-brand-muted uppercase tracking-wider">{stat.title}</p>
                      <p className="text-2xl sm:text-3xl font-black text-brand-ink mt-1 tabular-nums">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs text-brand-muted mt-0.5 truncate">{stat.sub}</p>
                    </div>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-brand ${stat.iconBg} ${stat.iconColor} group-hover:scale-110 transition-transform shrink-0`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* رسم بياني — حضور الأسبوع */}
      <Card className="mb-6 sm:mb-8 card-brand">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-brand-ink">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-soft">
                <CalendarCheck className="h-4 w-4 text-white" />
              </div>
              {t("حضور آخر 7 أيام")}
            </CardTitle>
            <Link href="/attendance" className="text-xs text-brand-primary hover:underline font-medium">{t("التفاصيل")}</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-1 sm:gap-3 h-32 sm:h-40">
            {data.weekChart.map((day) => {
              const total = day.present + day.late + day.absent;
              const pctPresent = total > 0 ? (day.present / chartMax) * 100 : 0;
              const pctLate = total > 0 ? (day.late / chartMax) * 100 : 0;
              const pctAbsent = total > 0 ? (day.absent / chartMax) * 100 : 0;
              const d = new Date(day.date);
              const dayName = dayNames[d.getDay()];
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">{total}</span>
                  <div className="w-full flex flex-col justify-end rounded-lg overflow-hidden bg-gray-100" style={{ height: "100%" }}>
                    {pctAbsent > 0 && <div className="bg-red-400 transition-all" style={{ height: `${pctAbsent}%` }} />}
                    {pctLate > 0 && <div className="bg-amber-400 transition-all" style={{ height: `${pctLate}%` }} />}
                    {pctPresent > 0 && <div className="bg-green-500 transition-all" style={{ height: `${pctPresent}%` }} />}
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-medium ${isToday ? "text-brand-primary font-bold" : "text-brand-muted"}`}>
                    {dayName}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] sm:text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> {t("حاضر")}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> {t("متأخر")}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> {t("غائب")}</span>
          </div>
        </CardContent>
      </Card>

      {/* تنبيهات انتهاء صلاحية المستندات */}
      {docAlerts.length > 0 && (
        <div className="mb-6">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-amber-600" />
                  <h2 className="font-bold text-gray-900">مستندات تنتهي صلاحيتها قريبًا</h2>
                  <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{docAlerts.length}</span>
                </div>
                <Link href="/company-docs" className="text-sm text-sky-600 hover:underline">إدارة المستندات</Link>
              </div>
              <div className="space-y-2">
                {docAlerts.slice(0, 5).map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-3 py-2">
                    <span className="text-sm font-medium text-gray-800">{d.title}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      d.daysLeft <= 0   ? "bg-red-100 text-red-700" :
                      d.daysLeft <= 7   ? "bg-red-100 text-red-600" :
                                          "bg-amber-100 text-amber-700"
                    }`}>
                      {d.daysLeft <= 0 ? "منتهي" : `${d.daysLeft} يوم`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* الإعلانات */}
      {announcements.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-500" />
              <h2 className="font-bold text-gray-900">{t("آخر الإعلانات")}</h2>
            </div>
            <Link href="/announcements" className="text-sm text-sky-600 hover:underline">{t("عرض الكل")}</Link>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map(a => {
              const isUrgent = a.priority === "urgent";
              const isImportant = a.priority === "important";
              return (
                <Card key={a.id} className={`border-r-4 ${isUrgent ? "border-r-red-500 bg-red-50/50" : isImportant ? "border-r-yellow-500 bg-yellow-50/30" : "border-r-blue-400"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      {isUrgent && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm text-gray-900">{a.title}</h3>
                          {a.scope === "department" ? (
                            <span className="text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Building2 className="h-2.5 w-2.5" /> {a.department}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Globe className="h-2.5 w-2.5" /> {t("عام")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-2">{a.content}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{a.authorName} · {new Date(a.createdAt).toLocaleDateString("ar-SA")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* تجديد الإقامات */}
      {data.iqamaRenewals.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-base text-orange-700">{t("تجديد الإقامات")}</CardTitle>
                <span className="mr-auto bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {data.iqamaRenewals.length} {t("موظف")}
                </span>
              </div>
              <p className="text-xs text-orange-500 mt-1">{t("الموظفون غير السعوديين الذين تنتهي إقامتهم خلال شهرين")}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {data.iqamaRenewals.map(emp => {
                  const expiry = new Date(emp.iqamaExpiry);
                  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
                  const isUrgent = daysLeft <= 30;
                  return (
                    <div key={emp.id} className={`flex items-center justify-between rounded-xl p-3 ${isUrgent ? "bg-red-50 border border-red-200" : "bg-white border border-orange-100"}`}>
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar firstName={emp.firstName} lastName={emp.lastName} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-gray-500">{emp.employeeNumber}{emp.department ? ` · ${emp.department}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-left">
                          <p className="text-xs font-medium text-gray-700">{expiry.toLocaleDateString("ar-SA")}</p>
                          <p className={`text-[10px] font-bold ${isUrgent ? "text-red-600" : "text-orange-500"}`}>
                            {daysLeft <= 0 ? t("منتهية!") : `${daysLeft} ${t("يوم")}`}
                          </p>
                        </div>
                        <Button size="sm" variant="outline"
                          className="h-7 text-[11px] gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => { setRenewEmp(emp); setNewExpiry(""); }}>
                          <RefreshCw className="h-3 w-3" /> {t("تجديد")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* المتأخرون اليوم + طلبات تنتظر إجراءك */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المتأخرون اليوم */}
        <Card className="card-brand">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-brand-ink">
                <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center shadow-soft">
                  <AlarmClock className="h-4 w-4 text-white" />
                </div>
                {t("المتأخرون اليوم")}
              </CardTitle>
              <Link href="/attendance" className="text-sm text-brand-primary hover:underline font-medium">{t("عرض الكل")}</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.lateToday.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t("لا يوجد متأخرون اليوم")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.lateToday.map((rec) => {
                  const checkTime = rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—";
                  return (
                    <div key={rec.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar photo={rec.employee.photo} firstName={rec.employee.firstName} lastName={rec.employee.lastName} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{rec.employee.firstName} {rec.employee.lastName}</p>
                          <p className="text-xs text-gray-500">{rec.employee.department ?? rec.employee.employeeNumber}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                        {checkTime}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* طلبات تنتظر إجراءك */}
        <Card className="card-brand">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-brand-ink">
                <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shadow-brand">
                  <ClipboardList className="h-4 w-4 text-white" />
                </div>
                {t("طلبات تنتظر إجراءك")}
              </CardTitle>
              <Link href="/requests" className="text-sm text-brand-primary hover:underline font-medium">{t("عرض الكل")}</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.pendingRequestsList.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t("لا توجد طلبات معلقة")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.pendingRequestsList.map((req) => (
                  <div key={req.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{req.employee.firstName} {req.employee.lastName}</p>
                        <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full shrink-0">
                          {requestTypeMap[req.type] ?? req.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{req.title}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs mr-2 ${req.status === "manager_approved" ? "text-sky-600 border-sky-300 bg-sky-50" : "text-yellow-600 border-yellow-300 bg-yellow-50"}`}
                    >
                      {req.status === "manager_approved" ? t("بانتظارك") : t("بانتظار المدير")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ملخص الرواتب — لمسة ذهبية فاخرة */}
      {(data.salaryInfo.paidCount > 0 || data.salaryInfo.pendingCount > 0) && (
        <Card className="mt-6 relative overflow-hidden border-gradient shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-50/70 via-amber-50/40 to-transparent dark:from-emerald-950/30 dark:via-amber-950/20" />
          <CardContent className="relative p-4 sm:p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gold-gradient rounded-xl flex items-center justify-center shadow-gold">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t("رواتب")} {monthNames[data.salaryInfo.month - 1]} {data.salaryInfo.year}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("إجمالي الصافي")}: {(data.salaryInfo.paidTotal + data.salaryInfo.pendingTotal).toLocaleString("ar-SA")} {t("ر.س")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {data.salaryInfo.paidCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {data.salaryInfo.paidCount} {t("مصروف")}
                    <span className="text-gray-400">({data.salaryInfo.paidTotal.toLocaleString("ar-SA")} {t("ر.س")})</span>
                  </span>
                )}
                {data.salaryInfo.pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    {data.salaryInfo.pendingCount} {t("معلق")}
                    <span className="text-gray-400">({data.salaryInfo.pendingTotal.toLocaleString("ar-SA")} {t("ر.س")})</span>
                  </span>
                )}
                <Link href="/salaries">
                  <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    {t("التفاصيل")}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog تجديد الإقامة */}
      <Dialog open={!!renewEmp} onOpenChange={() => setRenewEmp(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-500" /> {t("تجديد إقامة")}
            </DialogTitle>
          </DialogHeader>
          {renewEmp && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-semibold text-gray-900">{renewEmp.firstName} {renewEmp.lastName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{renewEmp.employeeNumber}</p>
                <p className="text-xs text-orange-500 mt-1">
                  {t("تاريخ الانتهاء الحالي")}: {new Date(renewEmp.iqamaExpiry).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t("تاريخ الانتهاء الجديد")}</label>
                <Input
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewEmp(null)}>{t("إلغاء")}</Button>
            <Button
              onClick={handleRenew}
              disabled={renewLoading || !newExpiry}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {renewLoading ? t("جارٍ الحفظ...") : t("حفظ التجديد")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
