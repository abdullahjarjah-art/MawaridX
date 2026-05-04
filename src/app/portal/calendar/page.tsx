"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, CalendarDays, CheckCircle, XCircle, AlertTriangle, Clock, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type AttendanceRecord = {
  id: string; date: string; status: string;
  checkIn?: string; checkOut?: string; workHours?: number;
};

type LeaveRecord = {
  id: string; type: string; startDate: string; endDate: string;
  days: number; status: string;
};

const statusColors: Record<string, string> = {
  present: "bg-green-500",
  late: "bg-yellow-500",
  absent: "bg-red-500",
  half_day: "bg-sky-500",
};

export default function PortalCalendarPage() {
  const { t, lang } = useLang();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
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
    leave: t("إجازة"),
  };

  const dayNames = lang === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = lang === "ar"
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.employee?.id) setEmployeeId(data.employee.id);
    });
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    setSelectedDay(null);
    Promise.all([
      fetch(`/api/attendance?employeeId=${employeeId}&month=${month + 1}&year=${year}&all=1`).then(r => r.json()),
      fetch(`/api/leaves?employeeId=${employeeId}`).then(r => r.json()),
    ]).then(([att, lv]) => {
      const attData: AttendanceRecord[] = Array.isArray(att) ? att : (att.data ?? []);
      const lvData: LeaveRecord[] = Array.isArray(lv) ? lv : [];
      setAttendance(attData);
      setLeaves(lvData);
    });
  }, [month, year, employeeId]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Approved leaves that overlap this month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const activeLeaves = leaves.filter(l => {
    if (l.status !== "approved") return false;
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    return ls <= monthEnd && le >= monthStart;
  });

  // Build day data map
  const dayData: Record<number, { att: AttendanceRecord | null; leaves: LeaveRecord[] }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dayData[d] = { att: null, leaves: [] };
  }

  attendance.forEach(a => {
    const day = new Date(a.date).getDate();
    const m = new Date(a.date).getMonth();
    const y = new Date(a.date).getFullYear();
    if (m === month && y === year && dayData[day]) {
      dayData[day].att = a;
    }
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

  // Stats
  const presentCount = attendance.filter(a => a.status === "present").length;
  const lateCount = attendance.filter(a => a.status === "late").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t("تقويم الحضور")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("عرض حضورك وإجازاتك على التقويم")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{presentCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("حضور")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{lateCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("تأخير")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{absentCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("غياب")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="mb-4">
        <CardContent className="p-0">
          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {monthNames[month]} {year}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {dayNames.map(d => (
              <div key={d} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate px-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-14 sm:min-h-20 border-b border-l border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const data = dayData[day];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              const dayOfWeek = new Date(year, month, day).getDay();
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
              const isSelected = selectedDay === day;
              const attStatus = data.att?.status;
              const hasLeave = data.leaves.length > 0;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "min-h-14 sm:min-h-20 border-b border-l border-gray-100 dark:border-gray-700/50 p-1 cursor-pointer transition-colors",
                    isToday && "bg-sky-50/70 dark:bg-sky-900/20",
                    isWeekend && !isToday && "bg-red-50/40 dark:bg-red-900/10",
                    isSelected && "ring-2 ring-sky-500 ring-inset",
                    !isToday && !isWeekend && "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    isToday ? "w-5 h-5 bg-sky-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold" : "",
                    !isToday && isWeekend && "text-red-500 dark:text-red-400",
                    !isToday && !isWeekend && "text-gray-700 dark:text-gray-300"
                  )}>
                    {day}
                  </div>

                  {/* Status dot */}
                  {attStatus && (
                    <div className={cn("w-2 h-2 rounded-full mt-0.5", statusColors[attStatus] ?? "bg-gray-400")} />
                  )}

                  {/* Leave badge */}
                  {hasLeave && (
                    <div className="mt-0.5 text-[8px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded px-0.5 truncate leading-tight">
                      {leaveTypeMap[data.leaves[0].type] ?? t("إجازة")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay && dayData[selectedDay] && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
              {t("تفاصيل يوم")} {selectedDay} {monthNames[month]} {year}
            </h3>

            {!dayData[selectedDay].att && dayData[selectedDay].leaves.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">{t("لا توجد سجلات لهذا اليوم")}</p>
            ) : (
              <div className="space-y-3">
                {/* Attendance */}
                {dayData[selectedDay].att && (
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {t("سجلات الحضور")}
                    </p>
                    {(() => {
                      const a = dayData[selectedDay].att!;
                      return (
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            a.status === "present" && "bg-green-100 text-green-700",
                            a.status === "late" && "bg-yellow-100 text-yellow-700",
                            a.status === "absent" && "bg-red-100 text-red-700",
                            a.status === "half_day" && "bg-sky-100 text-sky-700",
                            a.status === "leave" && "bg-purple-100 text-purple-700",
                          )}>
                            {statusLabels[a.status] ?? a.status}
                          </span>
                          {a.checkIn && (
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(a.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              {a.checkOut && ` — ${new Date(a.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Leaves */}
                {dayData[selectedDay].leaves.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <Palmtree className="h-3.5 w-3.5" /> {t("إجازات")}
                    </p>
                    {dayData[selectedDay].leaves.map((l, idx) => (
                      <div key={`${l.id}-${idx}`} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          {leaveTypeMap[l.type] ?? l.type} · {l.days} {t("يوم")}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(l.startDate).toLocaleDateString("en-CA")} → {new Date(l.endDate).toLocaleDateString("en-CA")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" /> {t("حاضر")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" /> {t("متأخر")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" /> {t("غائب")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" /> {t("نصف دوام")}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" /> {t("إجازة")}</span>
      </div>
    </div>
  );
}
