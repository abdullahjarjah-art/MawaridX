"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, Download, Users, Search, ArrowUpRight, Timer, MapPin } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { useLang } from "@/components/lang-provider";

type Employee = { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
type Location = { id: string; name: string; address?: string };
type Attendance = {
  id: string; employeeId: string; date: string; status: string; checkIn?: string;
  checkOut?: string; workHours?: number; notes?: string; overtimeMinutes?: number;
  checkInLocation?: Location | null;
  checkOutLocation?: Location | null;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
};
type Leave = {
  id: string; employeeId: string; type: string; startDate: string; endDate: string;
  days: number; reason?: string; status: string; notes?: string; attachmentUrl?: string | null;
  employee: { firstName: string; lastName: string; employeeNumber: string };
};

const now = new Date();
let CHECKIN_LIMIT = 8 * 60; // يُحدَّث من الإعدادات عند التحميل

function getLateMins(checkIn: string | undefined): number {
  if (!checkIn) return 0;
  const d = new Date(checkIn);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins > CHECKIN_LIMIT ? mins - CHECKIN_LIMIT : 0;
}

function formatMins(mins: number): string {
  if (mins === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} س ${m} د` : `${m} د`;
}

type EmpSummary = {
  employee: Employee;
  present: number; late: number; absent: number;
  totalLateMins: number; totalHours: number; totalOvertimeMins: number;
};

export default function AttendancePage() {
  const { t } = useLang();
  const [tab, setTab] = useState("attendance");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterDay, setFilterDay] = useState("");
  const [searchName, setSearchName] = useState("");
  const [attPage, setAttPage] = useState(1);
  const [attTotal, setAttTotal] = useState(0);
  const [attTotalPages, setAttTotalPages] = useState(1);
  const ATT_PAGE_SIZE = 25;

  const [attOpen, setAttOpen] = useState(false);
  const [attForm, setAttForm] = useState({ employeeId: "", date: new Date().toISOString().slice(0, 10), status: "present", checkIn: "", checkOut: "", notes: "", workHours: "" });
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", type: "annual", startDate: "", endDate: "", reason: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const attendanceStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
    present:  { label: t("حاضر"),     variant: "default",     color: "bg-green-100 text-green-700" },
    absent:   { label: t("غائب"),     variant: "destructive", color: "bg-red-100 text-red-700" },
    late:     { label: t("متأخر"),    variant: "outline",     color: "bg-yellow-100 text-yellow-700" },
    half_day: { label: t("نصف دوام"), variant: "secondary",   color: "bg-sky-100 text-sky-700" },
    leave:    { label: t("إجازة"),    variant: "secondary",   color: "bg-purple-100 text-purple-700" },
  };
  const leaveTypeMap: Record<string, string> = {
    annual: t("سنوية"), sick: t("مرضية"), emergency: t("طارئة"),
    unpaid: t("بدون راتب"), maternity: t("أمومة"), paternity: t("أبوة"),
  };
  const leaveStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: t("بانتظار المدير"), variant: "outline" },
    manager_approved: { label: t("بانتظار الإدارة"), variant: "secondary" },
    approved: { label: t("موافق عليها"), variant: "default" },
    rejected: { label: t("مرفوضة"), variant: "destructive" },
  };

  const monthNames = [t("يناير"),t("فبراير"),t("مارس"),t("أبريل"),t("مايو"),t("يونيو"),t("يوليو"),t("أغسطس"),t("سبتمبر"),t("أكتوبر"),t("نوفمبر"),t("ديسمبر")];
  const years = [String(now.getFullYear() - 1), String(now.getFullYear()), String(now.getFullYear() + 1)];

  const fetchAttendance = async (p = attPage) => {
    const params = new URLSearchParams({ month, year, page: String(p), pageSize: String(ATT_PAGE_SIZE) });
    const res = await fetch(`/api/attendance?${params}`);
    const data = await res.json();
    if (data.data) {
      setAttendance(data.data);
      setAttTotal(data.total);
      setAttTotalPages(data.totalPages);
    } else {
      setAttendance(Array.isArray(data) ? data : []);
    }
  };

  const fetchData = async () => {
    const [empRes, leaveRes, settRes] = await Promise.all([
      fetch("/api/employees?all=1"),
      fetch("/api/leaves"),
      fetch("/api/settings/attendance"),
    ]);
    const sett = await settRes.json();
    if (sett?.checkInTime) {
      const [h, m] = sett.checkInTime.split(":").map(Number);
      CHECKIN_LIMIT = h * 60 + m + (sett.lateToleranceMinutes ?? 0);
    }
    const empData = await empRes.json();
    setEmployees(Array.isArray(empData) ? empData : (empData.data ?? []));
    setLeaves(await leaveRes.json());
    fetchAttendance(1);
    setAttPage(1);
  };

  useEffect(() => { fetchData(); }, [month, year]);
  useEffect(() => { fetchAttendance(attPage); }, [attPage]);

  const saveAttendance = async () => {
    setSaving(true);
    await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(attForm) });
    setSaving(false); setAttOpen(false); fetchData();
  };
  const saveLeave = async () => {
    setSaving(true);
    await fetch("/api/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(leaveForm) });
    setSaving(false); setLeaveOpen(false); fetchData();
  };
  const updateLeaveStatus = async (id: string, status: string) => {
    await fetch(`/api/leaves/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchData();
  };

  // فلتر بالموظف واليوم والاسم
  const filteredAtt = attendance.filter(a => {
    if (filterEmp !== "all" && a.employeeId !== filterEmp) return false;
    if (filterDay && new Date(a.date).toISOString().slice(0, 10) !== filterDay) return false;
    if (searchName && !`${a.employee.firstName} ${a.employee.lastName} ${a.employee.employeeNumber}`.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  // إحصائيات
  const presentCount = attendance.filter(a => a.status === "present").length;
  const lateCount = attendance.filter(a => a.status === "late").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;
  const totalLateMins = attendance.reduce((s, a) => s + (a.status === "late" ? getLateMins(a.checkIn) : 0), 0);
  const totalOvertimeMins = attendance.reduce((s, a) => s + (a.overtimeMinutes ?? 0), 0);

  // ملخص لكل موظف
  const empSummaries: EmpSummary[] = employees.map(emp => {
    const empAtt = attendance.filter(a => a.employeeId === emp.id);
    return {
      employee: emp,
      present: empAtt.filter(a => a.status === "present").length,
      late: empAtt.filter(a => a.status === "late").length,
      absent: empAtt.filter(a => a.status === "absent").length,
      totalLateMins: empAtt.reduce((s, a) => s + (a.status === "late" ? getLateMins(a.checkIn) : 0), 0),
      totalHours: empAtt.reduce((s, a) => s + (a.workHours ?? 0), 0),
      totalOvertimeMins: empAtt.reduce((s, a) => s + (a.overtimeMinutes ?? 0), 0),
    };
  }).sort((a, b) => b.totalLateMins - a.totalLateMins);

  const filteredSummaries = empSummaries.filter(s =>
    !searchName || `${s.employee.firstName} ${s.employee.lastName} ${s.employee.employeeNumber}`.toLowerCase().includes(searchName.toLowerCase())
  );

  // تصدير Excel
  const exportExcel = () => {
    // BOM for UTF-8
    let csv = "\uFEFF";
    csv += "الرقم الوظيفي,الاسم,القسم,أيام الحضور,أيام التأخير,أيام الغياب,إجمالي دقائق التأخير,إجمالي الساعات\n";
    for (const s of empSummaries) {
      csv += `${s.employee.employeeNumber},${s.employee.firstName} ${s.employee.lastName},${s.employee.department ?? ""},${s.present},${s.late},${s.absent},${s.totalLateMins},${Math.round(s.totalHours * 10) / 10}\n`;
    }
    // تفاصيل السجلات
    csv += "\n\nتفاصيل الحضور\n";
    csv += "الرقم الوظيفي,الاسم,التاريخ,الحالة,وقت الدخول,وقت الخروج,ساعات العمل,دقائق التأخير\n";
    for (const a of attendance) {
      const lateMins = a.status === "late" ? getLateMins(a.checkIn) : 0;
      csv += `${a.employee.employeeNumber},${a.employee.firstName} ${a.employee.lastName},${new Date(a.date).toLocaleDateString("en-CA")},${attendanceStatusMap[a.status]?.label ?? a.status},${a.checkIn ? new Date(a.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""},${a.checkOut ? new Date(a.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""},${a.workHours ?? ""},${lateMins}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${year}_${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t("الحضور والإجازات")}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{monthNames[Number(month) - 1]} {year}</p>
        </div>
        <Button variant="outline" onClick={exportExcel} className="gap-2 text-xs sm:text-sm h-8 sm:h-9">
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t("تصدير")}
        </Button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-[10px] sm:text-xs text-green-600 font-medium">{t("حضور")}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-700">{presentCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              <span className="text-[10px] sm:text-xs text-yellow-600 font-medium">{t("تأخير")}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-yellow-700">{lateCount}</p>
            <p className="text-[10px] sm:text-xs text-yellow-500 mt-0.5">{formatMins(totalLateMins)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              <span className="text-[10px] sm:text-xs text-red-600 font-medium">{t("غياب")}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-700">{absentCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
              <span className="text-[10px] sm:text-xs text-sky-600 font-medium">{t("سجلات")}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-sky-700">{attendance.length}</p>
          </CardContent>
        </Card>
        {totalOvertimeMins > 0 && (
          <Card className="bg-violet-50 border-violet-100 col-span-2 md:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
                <span className="text-[10px] sm:text-xs text-violet-600 font-medium">{t("إجمالي الأوفرتايم")}</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-violet-700">{formatMins(totalOvertimeMins)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="space-y-3 mb-4">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="attendance" className="text-xs sm:text-sm">{t("سجل الحضور")}</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs sm:text-sm">{t("ملخص الموظفين")}</TabsTrigger>
              <TabsTrigger value="leaves" className="text-xs sm:text-sm">{t("الإجازات")}</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={month} onValueChange={v => setMonth(v ?? month)}>
              <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={v => setYear(v ?? year)}>
              <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {tab === "attendance" && (
              <>
                <Select value={filterEmp} onValueChange={v => setFilterEmp(v ?? "all")}>
                  <SelectTrigger className="w-32 sm:w-44 h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder={t("كل الموظفين")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("كل الموظفين")}</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Input type="date" value={filterDay} onChange={e => setFilterDay(e.target.value)} className="w-32 sm:w-40 h-8 sm:h-9 text-xs sm:text-sm" />
                  {filterDay && <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-400" onClick={() => setFilterDay("")}>✕</Button>}
                </div>
                <Button onClick={() => setAttOpen(true)} className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm">
                  <Plus className="h-3.5 w-3.5" /> {t("تسجيل")}
                </Button>
              </>
            )}
            {tab === "leaves" && (
              <Button onClick={() => setLeaveOpen(true)} className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm">
                <Plus className="h-3.5 w-3.5" /> {t("طلب إجازة")}
              </Button>
            )}
          </div>
        </div>

        {/* بحث بالاسم */}
        {(tab === "attendance" || tab === "summary") && (
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("بحث بالاسم أو الرقم الوظيفي...")}
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="pr-9"
            />
          </div>
        )}

        {/* سجل الحضور التفصيلي */}
        <TabsContent value="attendance">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الموظف")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("التاريخ")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الحالة")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" />{t("تسجيل الحضور")}</span>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      <span className="flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />{t("تسجيل الانصراف")}</span>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("عدد ساعات العمل")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("تأخير")}</th>
                    <th className="text-right px-4 py-3 font-medium text-indigo-600 bg-indigo-50/30">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-indigo-500" />{t("موقع الحضور")}</span>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-indigo-600 bg-indigo-50/30">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-indigo-500" />{t("موقع الانصراف")}</span>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-violet-600 bg-violet-50/50">
                      <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-violet-500" />{t("أوفرتايم")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredAtt.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500">{t("لا توجد سجلات لهذا الشهر")}</td></tr>
                  ) : filteredAtt.map(a => {
                    const lateMins = a.status === "late" ? getLateMins(a.checkIn) : 0;
                    const st = attendanceStatusMap[a.status];
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar photo={a.employee.photo} firstName={a.employee.firstName} lastName={a.employee.lastName} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{a.employee.firstName} {a.employee.lastName}</p>
                              <p className="text-xs text-gray-400">{a.employee.employeeNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{new Date(a.date).toLocaleDateString("ar-SA", { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st?.color ?? "bg-gray-100 text-gray-600"}`}>
                            {st?.label ?? a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {a.checkIn ? (() => {
                            const d = new Date(a.checkIn);
                            const h = d.getHours(); const m = d.getMinutes().toString().padStart(2,"0");
                            const hh = (h%12||12).toString().padStart(2,"0");
                            return (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="font-medium text-gray-800">{hh}:{m}</span>
                                <span className="text-xs text-gray-400">{h<12?t("صباحاً"):t("مساءً")}</span>
                              </span>
                            );
                          })() : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {a.checkOut ? (() => {
                            const d = new Date(a.checkOut);
                            const h = d.getHours(); const m = d.getMinutes().toString().padStart(2,"0");
                            const hh = (h%12||12).toString().padStart(2,"0");
                            return (
                              <span className="flex items-center gap-1.5">
                                <ArrowUpRight className="h-4 w-4 text-orange-500 shrink-0" />
                                <span className="font-medium text-gray-800">{hh}:{m}</span>
                                <span className="text-xs text-gray-400">{h<12?t("صباحاً"):t("مساءً")}</span>
                              </span>
                            );
                          })() : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {a.workHours ? (() => {
                            const wh = a.workHours;
                            const hrs = Math.floor(wh);
                            const mins = Math.round((wh - hrs) * 60);
                            if (hrs === 0) return `${mins} ${t("دقيقة")}`;
                            if (mins === 0) return `${hrs} ${t("ساعات")}`;
                            return `${hrs} ${t("ساعات")} ${t("و")} ${mins} ${t("دقيقة")}`;
                          })() : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {lateMins > 0 ? (
                            <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">{lateMins} د</span>
                          ) : "—"}
                        </td>
                        {/* عمود موقع الحضور */}
                        <td className="px-4 py-3 bg-indigo-50/20">
                          {a.checkInLocation ? (
                            <span className="flex items-center gap-1.5 text-sm text-indigo-700 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              {a.checkInLocation.name}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        {/* عمود موقع الانصراف */}
                        <td className="px-4 py-3 bg-indigo-50/20">
                          {a.checkOutLocation ? (
                            <span className={`flex items-center gap-1.5 text-sm font-medium ${
                              a.checkInLocation && a.checkOutLocation.id !== a.checkInLocation.id
                                ? "text-amber-700"
                                : "text-indigo-700"
                            }`}>
                              <MapPin className={`h-3.5 w-3.5 shrink-0 ${
                                a.checkInLocation && a.checkOutLocation.id !== a.checkInLocation.id
                                  ? "text-amber-400"
                                  : "text-indigo-400"
                              }`} />
                              {a.checkOutLocation.name}
                              {a.checkInLocation && a.checkOutLocation.id !== a.checkInLocation.id && (
                                <span className="text-[10px] bg-amber-100 text-amber-600 border border-amber-200 px-1 py-0.5 rounded-full">فرع مختلف</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 bg-violet-50/30">
                          {(a.overtimeMinutes ?? 0) > 0 ? (
                            <span className="text-xs text-violet-700 font-bold bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <Timer className="h-3 w-3" />
                              {formatMins(a.overtimeMinutes!)}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={attPage} totalPages={attTotalPages} total={attTotal} pageSize={ATT_PAGE_SIZE} onPage={p => { setAttPage(p); }} />
          </div>
        </TabsContent>

        {/* ملخص الموظفين */}
        <TabsContent value="summary">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الموظف")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("القسم")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 bg-green-50">{t("حضور")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 bg-yellow-50">{t("تأخير")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 bg-red-50">{t("غياب")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 bg-orange-50">{t("إجمالي دقائق التأخير")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("إجمالي عدد ساعات العمل")}</th>
                    <th className="text-right px-4 py-3 font-medium text-violet-600 bg-violet-50">{t("الأوفرتايم")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredSummaries.map(s => (
                    <tr key={s.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar photo={s.employee.photo} firstName={s.employee.firstName} lastName={s.employee.lastName} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{s.employee.firstName} {s.employee.lastName}</p>
                            <p className="text-xs text-gray-400">{s.employee.employeeNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.employee.department ?? "—"}</td>
                      <td className="px-4 py-3 bg-green-50/40">
                        <span className="font-bold text-green-700">{s.present}</span>
                      </td>
                      <td className="px-4 py-3 bg-yellow-50/40">
                        <span className="font-bold text-yellow-700">{s.late}</span>
                      </td>
                      <td className="px-4 py-3 bg-red-50/40">
                        <span className="font-bold text-red-700">{s.absent}</span>
                      </td>
                      <td className="px-4 py-3 bg-orange-50/40">
                        {s.totalLateMins > 0 ? (
                          <span className="font-bold text-orange-700">{formatMins(s.totalLateMins)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {Math.round(s.totalHours * 10) / 10} س
                      </td>
                      <td className="px-4 py-3 bg-violet-50/40">
                        {s.totalOvertimeMins > 0 ? (
                          <span className="font-bold text-violet-700 flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5" />{formatMins(s.totalOvertimeMins)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 font-bold">
                    <td className="px-4 py-3" colSpan={2}>{t("الإجمالي")}</td>
                    <td className="px-4 py-3 text-green-700 bg-green-50/40">{filteredSummaries.reduce((s, e) => s + e.present, 0)}</td>
                    <td className="px-4 py-3 text-yellow-700 bg-yellow-50/40">{filteredSummaries.reduce((s, e) => s + e.late, 0)}</td>
                    <td className="px-4 py-3 text-red-700 bg-red-50/40">{filteredSummaries.reduce((s, e) => s + e.absent, 0)}</td>
                    <td className="px-4 py-3 text-orange-700 bg-orange-50/40">{formatMins(filteredSummaries.reduce((s, e) => s + e.totalLateMins, 0))}</td>
                    <td className="px-4 py-3 text-gray-700">{Math.round(filteredSummaries.reduce((s, e) => s + e.totalHours, 0) * 10) / 10} س</td>
                    <td className="px-4 py-3 text-violet-700 bg-violet-50/40">
                      {formatMins(filteredSummaries.reduce((s, e) => s + e.totalOvertimeMins, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* الإجازات */}
        <TabsContent value="leaves">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الموظف")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("النوع")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("من")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("إلى")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الأيام")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الحالة")}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t("إجراءات")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {leaves.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">{t("لا توجد طلبات إجازة")}</td></tr>
                  ) : leaves.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{l.employee.firstName} {l.employee.lastName}</p>
                        <p className="text-xs text-gray-400">{l.employee.employeeNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{leaveTypeMap[l.type] ?? l.type}</div>
                        {l.attachmentUrl && (
                          <a
                            href={l.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 hover:bg-green-100"
                          >
                            📎 {t("عذر طبي")}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{new Date(l.startDate).toLocaleDateString("ar-SA")}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(l.endDate).toLocaleDateString("ar-SA")}</td>
                      <td className="px-4 py-3 text-gray-600">{l.days} {t("يوم")}</td>
                      <td className="px-4 py-3">
                        <Badge variant={leaveStatusMap[l.status]?.variant ?? "secondary"}>
                          {leaveStatusMap[l.status]?.label ?? l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {l.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 text-xs" onClick={() => updateLeaveStatus(l.id, "manager_approved")}>{t("موافقة المدير")}</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => updateLeaveStatus(l.id, "rejected")}>{t("رفض")}</Button>
                          </div>
                        )}
                        {l.status === "manager_approved" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-sky-600 border-sky-200 hover:bg-sky-50 text-xs" onClick={() => updateLeaveStatus(l.id, "approved")}>{t("موافقة نهائية")}</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => updateLeaveStatus(l.id, "rejected")}>{t("رفض")}</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Attendance Dialog */}
      <Dialog open={attOpen} onOpenChange={setAttOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("تسجيل حضور")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>{t("الموظف")}</Label>
              <Select value={attForm.employeeId} onValueChange={v => setAttForm({ ...attForm, employeeId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder={t("اختر موظف")} /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("التاريخ")}</Label>
              <Input type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("الحالة")}</Label>
              <Select value={attForm.status} onValueChange={v => setAttForm({ ...attForm, status: v ?? "present" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t("حاضر")}</SelectItem>
                  <SelectItem value="absent">{t("غائب")}</SelectItem>
                  <SelectItem value="late">{t("متأخر")}</SelectItem>
                  <SelectItem value="half_day">{t("نصف دوام")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("وقت الدخول")}</Label>
                <Input type="time" onChange={e => {
                  const d = new Date(`${attForm.date}T${e.target.value}`);
                  setAttForm({ ...attForm, checkIn: d.toISOString() });
                }} />
              </div>
              <div className="space-y-1">
                <Label>{t("وقت الخروج")}</Label>
                <Input type="time" onChange={e => {
                  const d = new Date(`${attForm.date}T${e.target.value}`);
                  setAttForm({ ...attForm, checkOut: d.toISOString() });
                }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("ملاحظات")}</Label>
              <Textarea value={attForm.notes} onChange={e => setAttForm({ ...attForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttOpen(false)}>{t("إلغاء")}</Button>
            <Button onClick={saveAttendance} disabled={saving || !attForm.employeeId}>{saving ? t("جارٍ الحفظ...") : t("حفظ")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("طلب إجازة")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>{t("الموظف")}</Label>
              <Select value={leaveForm.employeeId} onValueChange={v => setLeaveForm({ ...leaveForm, employeeId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder={t("اختر موظف")} /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("نوع الإجازة")}</Label>
              <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v ?? "annual" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{t("سنوية")}</SelectItem>
                  <SelectItem value="sick">{t("مرضية")}</SelectItem>
                  <SelectItem value="emergency">{t("طارئة")}</SelectItem>
                  <SelectItem value="unpaid">{t("بدون راتب")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t("من")}</Label><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("إلى")}</Label><Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>{t("السبب")}</Label><Textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>{t("إلغاء")}</Button>
            <Button onClick={saveLeave} disabled={saving || !leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate}>{saving ? t("جارٍ الحفظ...") : t("إرسال")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
