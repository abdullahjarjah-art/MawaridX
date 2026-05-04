"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, AlertTriangle, CheckCircle, XCircle,
  Calendar, Clock, Search, Users, ListChecks, RefreshCw, Send, BanIcon,
} from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

type ContractEmployee = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  photo?: string | null; jobTitle?: string; department?: string; position: string;
  startDate: string; endDate: string;
  contractDuration?: number | null; noticePeriodDays: number;
  daysLeft: number; contractStatus: "active" | "notice" | "expired";
  noticeDate: string;
  pendingRenewal: boolean;
  pendingNonRenewal: boolean;
};

const filters = [
  { key: "all",      label: "الكل",           icon: Users         },
  { key: "expiring", label: "فترة الإشعار",  icon: AlertTriangle },
  { key: "expired",  label: "منتهية",         icon: XCircle       },
  { key: "active",   label: "نشطة",           icon: CheckCircle   },
];

const statusConfig = {
  active:  { label: "نشط",           bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500"  },
  notice:  { label: "فترة الإشعار", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500"  },
  expired: { label: "منتهي",         bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500"    },
};

export default function ContractsPage() {
  const router = useRouter();
  const [employees, setEmployees]   = useState<ContractEmployee[]>([]);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState<string | null>(null); // "empId-renewal" | "empId-nonrenewal"
  const [renewPopup, setRenewPopup] = useState<string | null>(null); // employeeId
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/contracts?filter=${filter}`)
      .then(r => r.json())
      .then(d => { setEmployees(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, [filter]);

  const sendAction = async (employeeId: string, action: "renewal" | "non_renewal", years?: 1 | 2) => {
    setSending(employeeId + "-" + action);
    setRenewPopup(null);
    setActionError(null);
    const res = await fetch("/api/contracts/renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, action, years }),
    });
    setSending(null);
    if (res.ok) {
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setActionError({ id: employeeId, msg: d.error ?? "حدث خطأ" });
      if (action === "renewal") setRenewPopup(employeeId);
    }
  };

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.employeeNumber} ${e.department ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all:      employees.length,
    expiring: employees.filter(e => e.contractStatus === "notice").length,
    expired:  employees.filter(e => e.contractStatus === "expired").length,
    active:   employees.filter(e => e.contractStatus === "active").length,
  };

  return (
    <div className="p-4 sm:p-6" onClick={() => { setRenewPopup(null); setActionError(null); }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة العقود</h1>
            <p className="text-sm text-gray-500">متابعة عقود الموظفين وتواريخ انتهائها</p>
          </div>
        </div>
        <Button onClick={() => router.push("/contracts/bulk")} className="gap-2 h-9" variant="outline">
          <ListChecks className="h-4 w-4" />
          تعيين جماعي
        </Button>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "إجمالي العقود", value: counts.all,      color: "bg-blue-50 text-blue-700",   icon: Users         },
          { label: "فترة الإشعار",  value: counts.expiring, color: "bg-amber-50 text-amber-700", icon: AlertTriangle },
          { label: "منتهية",        value: counts.expired,  color: "bg-red-50 text-red-700",     icon: XCircle       },
          { label: "نشطة",          value: counts.active,   color: "bg-green-50 text-green-700", icon: CheckCircle   },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="border-0 shadow-sm cursor-pointer"
            onClick={() => setFilter(label === "إجمالي العقود" ? "all" : label === "فترة الإشعار" ? "expiring" : label === "منتهية" ? "expired" : "active")}>
            <CardContent className={`p-4 ${color} rounded-xl`}>
              <Icon className="h-5 w-5 mb-2 opacity-70" />
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* فلاتر + بحث */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white dark:bg-gray-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-gray-400"
              }`}>
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
              {counts[f.key as keyof typeof counts] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === f.key ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700"}`}>
                  {counts[f.key as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="بحث بالاسم أو القسم..." value={search}
            onChange={e => setSearch(e.target.value)} className="pr-9 h-9 text-sm" />
        </div>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد عقود {filter !== "all" ? "في هذه الفئة" : ""}</p>
            <p className="text-xs mt-1">العقود تظهر هنا عند تحديد تاريخ انتهاء في ملف الموظف</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(emp => {
            const cfg        = statusConfig[emp.contractStatus];
            const endDate    = new Date(emp.endDate);
            const startDate  = new Date(emp.startDate);
            const noticeDate = new Date(emp.noticeDate);
            const isNotice   = emp.contractStatus === "notice";
            const isExpired  = emp.contractStatus === "expired";
            const isSending  = sending?.startsWith(emp.id);
            const popupOpen  = renewPopup === emp.id;
            const empError   = actionError?.id === emp.id ? actionError.msg : null;

            return (
              <div key={emp.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border ${cfg.border} dark:border-gray-700 p-4 transition-all hover:shadow-md`}>
                <div className="flex items-start gap-3">
                  <div className="cursor-pointer" onClick={() => router.push(`/employees/${emp.id}`)}>
                    <EmployeeAvatar photo={emp.photo} firstName={emp.firstName} lastName={emp.lastName} size="md" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* الاسم + الحالة */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="cursor-pointer" onClick={() => router.push(`/employees/${emp.id}`)}>
                        <p className="font-bold text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-gray-400">{emp.jobTitle ?? ""}{emp.department ? ` · ${emp.department}` : ""}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} flex items-center gap-1.5 shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* تفاصيل العقد */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>بداية: {startDate.toLocaleDateString("ar-SA")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>نهاية: {endDate.toLocaleDateString("ar-SA")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>إشعار: {noticeDate.toLocaleDateString("ar-SA")}</span>
                      </div>
                    </div>

                    {/* شريط / تنبيه */}
                    <div className="mt-3">
                      {isExpired ? (
                        <p className={`text-xs font-bold ${cfg.text}`}>
                          ⛔ انتهى منذ {Math.abs(emp.daysLeft)} يوم
                        </p>
                      ) : isNotice ? (
                        <div className={`${cfg.bg} ${cfg.border} border rounded-xl px-3 py-2 flex items-center gap-2`}>
                          <AlertTriangle className={`h-4 w-4 ${cfg.text} shrink-0`} />
                          <p className={`text-xs font-bold ${cfg.text}`}>
                            ⚠️ يجب إرسال إشعار الإفساخ — يتبقى {emp.daysLeft} يوم
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            {(() => {
                              const total  = endDate.getTime() - startDate.getTime();
                              const passed = Date.now() - startDate.getTime();
                              const pct    = Math.min(100, Math.max(0, (passed / total) * 100));
                              return <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />;
                            })()}
                          </div>
                          <p className="text-xs text-gray-400 whitespace-nowrap">{emp.daysLeft} يوم متبقي</p>
                        </div>
                      )}
                    </div>

                    {/* ── أزرار الإجراءات ── */}
                    {(isNotice || isExpired) && (
                      <div className="mt-3" onClick={e => e.stopPropagation()}>

                        {/* فترة الإشعار: زرّان */}
                        {isNotice && (
                          <>
                            {emp.pendingRenewal ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                بانتظار موافقة الموظف على التجديد
                              </div>
                            ) : emp.pendingNonRenewal ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                تم إرسال إشعار عدم التجديد — بانتظار تأكيد الموظف
                              </div>
                            ) : (
                              <div className="flex gap-2 flex-wrap relative">
                                {/* زر التجديد */}
                                <div className="relative">
                                  <button
                                    onClick={() => { setRenewPopup(popupOpen ? null : emp.id); setActionError(null); }}
                                    disabled={!!isSending}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                                  >
                                    {sending === emp.id + "-renewal"
                                      ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                      : <Send className="h-3.5 w-3.5" />}
                                    إرسال طلب تجديد
                                  </button>

                                  {/* Popup مدة التجديد */}
                                  {popupOpen && (
                                    <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl p-3 w-56">
                                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 text-center">اختر مدة التجديد</p>
                                      <p className="text-[10px] text-gray-400 text-center mb-2">سيُرسل للموظف للموافقة أو الرفض</p>
                                      {empError && <p className="text-[10px] text-red-500 text-center mb-2">{empError}</p>}
                                      <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => sendAction(emp.id, "renewal", 1)}
                                          className="flex flex-col items-center gap-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                                          <span className="text-2xl font-black text-blue-700">1</span>
                                          <span className="text-[10px] text-blue-600 font-medium">سنة</span>
                                        </button>
                                        <button onClick={() => sendAction(emp.id, "renewal", 2)}
                                          className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                                          <span className="text-2xl font-black text-green-700">2</span>
                                          <span className="text-[10px] text-green-600 font-medium">سنة</span>
                                        </button>
                                      </div>
                                      <p className="text-[10px] text-gray-400 text-center mt-2">
                                        يُجدَّد من {endDate.toLocaleDateString("ar-SA")}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* زر عدم التجديد */}
                                <button
                                  onClick={() => sendAction(emp.id, "non_renewal")}
                                  disabled={!!isSending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  {sending === emp.id + "-non_renewal"
                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    : <BanIcon className="h-3.5 w-3.5" />}
                                  إرسال إشعار عدم التجديد
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {/* منتهي: زر تجديد فقط */}
                        {isExpired && (
                          <>
                            {emp.pendingRenewal ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                بانتظار موافقة الموظف على التجديد
                              </div>
                            ) : (
                              <div className="relative">
                                <button
                                  onClick={() => { setRenewPopup(popupOpen ? null : emp.id); setActionError(null); }}
                                  disabled={!!isSending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  {sending === emp.id + "-renewal"
                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    : <RefreshCw className="h-3.5 w-3.5" />}
                                  تجديد العقد
                                </button>

                                {popupOpen && (
                                  <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl p-3 w-56">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 text-center">اختر مدة التجديد</p>
                                    <p className="text-[10px] text-gray-400 text-center mb-2">سيُرسل للموظف للموافقة</p>
                                    {empError && <p className="text-[10px] text-red-500 text-center mb-2">{empError}</p>}
                                    <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => sendAction(emp.id, "renewal", 1)}
                                        className="flex flex-col items-center gap-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                                        <span className="text-2xl font-black text-blue-700">1</span>
                                        <span className="text-[10px] text-blue-600 font-medium">سنة</span>
                                      </button>
                                      <button onClick={() => sendAction(emp.id, "renewal", 2)}
                                        className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                                        <span className="text-2xl font-black text-green-700">2</span>
                                        <span className="text-[10px] text-green-600 font-medium">سنة</span>
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center mt-2">
                                      يُجدَّد من اليوم
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
