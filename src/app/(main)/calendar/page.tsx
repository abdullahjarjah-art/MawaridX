"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, CalendarDays, CheckCircle, XCircle, AlertTriangle, Clock, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type Attendance = {
  id: string; employeeId: string; date: string; status: string;
  checkIn?: string; checkOut?: string; workHours?: number;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string };
};

type Leave = {
  id: string; employeeId: string; type: string; startDate: string; endDate: string;
  days: number; status: string;
  employee: { firstName: string; lastName: string; employeeNumber: string };
};

type Employee = { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string };

const statusColors: Record<string, string> = {
  present: "bg-green-500",
  late: "bg-yellow-500",
  absent: "bg-red-500",
  half_day: "bg-sky-500",
};

export default function CalendarPage() {
  const { t, lang } = useLang();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterEmp, setFilterEmp] = useState("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const leaveTypeMap: Record<string, string> = {
    annual: t("سنوية"), sick: t("مرضية"), emergency: t("طارئة"),
    unpaid: t("بدون راتب"), maternity: t("أمومة"), paternity: t("أبوة"),
  };

  const statusLabels: Record<string, string> = {
    present: t("حاضر"),
    late: t("متأخر"),
    absent: t("غائب"),
    half_day: t("نصف دوام"),
  };

  const dayNames = lang === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = lang === "ar"
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    Promise.all([
      fetch(`/api/attendance?month=${month + 1}&year=${year}`).then(r => r.json()),
      fetch("/api/leaves").then(r => r.json()),
      fetch("/api/employees").then(r => r.json()),
    ]).then(([att, lv, emp]) => {
      setAttendance(Array.isArray(att) ? att : []);
      setLeaves(Array.isArray(lv) ? lv : []);
      setEmployees(Array.isArray(emp) ? emp : []);
    });
  }, [month, year]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const filteredAtt = filterEmp === "all" ? attendance : attendance.filter(a => a.employeeId === filterEmp);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const activeLeaves = leaves.filter(l => {
    if (l.status !== "approved") return false;
    if (filterEmp !== "all" && l.employeeId !== filterEmp) return false;
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    return ls <= monthEnd && le >= monthStart;
  });

  const dayData: Record<number, { attendance: Attendance[]; leaves: Leave[] }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dayData[d] = { attendance: [], leaves: [] };
  }

  filteredAtt.forEach(a => {
    const day = new Date(a.date).getDate();
    if (dayData[day]) dayData[day].attendance.push(a);
  });

  activeLeaves.forEach(l => {
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      if (current >= ls && current <= le && dayData[d]) {
        dayData[d].leaves.push(l);
      }
    }
  });

  const presentCount = filteredAtt.filter(a => a.status === "present").length;
  const lateCount = filteredAtt.filter(a => a.status === "late").length;
  const absentCount = filteredAtt.filter(a => a.status === "absent").length;
  const leaveCount = activeLeaves.length;

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            {t("التقويم")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("عرض الحضور والإجازات على شكل تقويم شهري")}</p>
        </div>
        <Select value={filterEmp} onValueChange={v => setFilterEmp(v ?? "all")}>
          <SelectTrigger className="w-52 h-8 sm:h-9 text-xs sm:text-sm">
            <SelectValue>
              {filterEmp === "all" ? t("كل الموظفين") : (() => { const e = employees.find(x => x.id === filterEmp); return e ? `${e.firstName} ${e.lastName}` : t("كل الموظفين"); })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("كل الموظفين")}</SelectItem>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{presentCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("حضور")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{lateCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("تأخير")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{absentCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("غياب")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Palmtree className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{leaveCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("إجازات موافق عليها")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Navigation */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {monthNames[month]} {year}
            </h2>
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {dayNames.map(d => (
              <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-24 border-b border-l border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const data = dayData[day];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              const dayOfWeek = new Date(year, month, day).getDay();
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "min-h-24 border-b border-l border-gray-100 dark:border-gray-700/50 p-1.5 cursor-pointer transition-colors",
                    isToday && "bg-sky-50/70 dark:bg-sky-900/20",
                    isWeekend && !isToday && "bg-red-50/40 dark:bg-red-900/10",
                    isSelected && "ring-2 ring-sky-500 ring-inset",
                    !isToday && !isWeekend && "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday ? "text-sky-600 dark:text-sky-400 font-bold" : "text-gray-700 dark:text-gray-300",
                    isWeekend && "text-red-500 dark:text-red-400"
                  )}>
                    {day}
                  </div>

                  <div className="flex flex-wrap gap-0.5">
                    {data.attendance.map(a => (
                      <div
                        key={a.id}
                        className={cn("w-2.5 h-2.5 rounded-full", statusColors[a.status] ?? "bg-gray-400")}
                        title={`${a.employee.firstName} ${a.employee.lastName} - ${statusLabels[a.status] ?? a.status}`}
                      />
                    ))}
                  </div>

                  {data.leaves.length > 0 && (
                    <div className="mt-0.5">
                      {data.leaves.slice(0, 2).map((l, idx) => (
                        <div key={`${l.id}-${idx}`} className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded px-1 truncate mb-0.5">
                          {filterEmp !== "all" ? (leaveTypeMap[l.type] ?? l.type) : `${l.employee.firstName} - ${leaveTypeMap[l.type] ?? l.type}`}
                        </div>
                      ))}
                      {data.leaves.length > 2 && (
                        <div className="text-[9px] text-gray-400">+{data.leaves.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selectedDay && dayData[selectedDay] && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              {t("تفاصيل يوم")} {selectedDay} {monthNames[month]} {year}
            </h3>

            {dayData[selectedDay].attendance.length === 0 && dayData[selectedDay].leaves.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t("لا توجد سجلات لهذا اليوم")}</p>
            ) : (
              <div className="space-y-4">
                {dayData[selectedDay].attendance.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {t("سجلات الحضور")}
                    </h4>
                    <div className="space-y-2">
                      {dayData[selectedDay].attendance.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full", statusColors[a.status])} />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{a.employee.firstName} {a.employee.lastName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{a.employee.department ?? a.employee.employeeNumber}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium",
                              a.status === "present" && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                              a.status === "late" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
                              a.status === "absent" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                              a.status === "half_day" && "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                            )}>
                              {statusLabels[a.status] ?? a.status}
                            </span>
                            {a.checkIn && (
                              <p className="text-[10px] text-gray-400 mt-1 font-mono">
                                {new Date(a.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                {a.checkOut && ` — ${new Date(a.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dayData[selectedDay].leaves.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <Palmtree className="h-4 w-4" /> {t("إجازات")}
                    </h4>
                    <div className="space-y-2">
                      {dayData[selectedDay].leaves.map((l, idx) => (
                        <div key={`${l.id}-${idx}`} className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{l.employee.firstName} {l.employee.lastName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {leaveTypeMap[l.type] ?? l.type} · {l.days} {t("يوم")}
                            </p>
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-300 font-mono">
                            {new Date(l.startDate).toLocaleDateString("en-CA")} → {new Date(l.endDate).toLocaleDateString("en-CA")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {t("حاضر")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> {t("متأخر")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {t("غائب")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> {t("نصف دوام")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> {t("إجازة")}</span>
      </div>
    </div>
  );
}
