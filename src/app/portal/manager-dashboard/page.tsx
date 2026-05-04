"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/components/lang-provider";
import {
  Users, CalendarCheck, Clock, AlertTriangle, ClipboardList, CheckCircle2,
  TrendingUp, Trophy, Star, CalendarX2, Briefcase, ArrowLeft, UserCheck,
} from "lucide-react";
import Link from "next/link";
import { EmployeeAvatar } from "@/components/employee-avatar";

/* ── Types ── */
type TeamMember = {
  id: string; firstName: string; lastName: string; jobTitle?: string; department?: string; photo?: string | null;
  todayStatus?: string; lateMins?: number;
  monthPresent: number; monthLate: number; monthAbsent: number;
  attendanceRate: number;
};

type TeamLeave = {
  id: string; type: string; startDate: string; endDate: string; days: number;
  status: string; reason?: string;
  employee: { firstName: string; lastName: string };
};

type TeamEval = {
  id: string; period: string; year: number; score?: number; grade?: string; status: string;
  employee: { firstName: string; lastName: string; department?: string };
};

type PendingRequest = {
  id: string; title: string; type: string; status: string;
  employee: { firstName: string; lastName: string };
  createdAt: string;
};

const typeMap: Record<string, string> = {
  leave: "إجازة", attendance_fix: "تعديل حضور", loan: "سلفة",
  custody: "عهدة", exit_return: "خروج وعودة", resignation: "استقالة", letter: "خطاب",
};

const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة",
  unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};

const gradeColors: Record<string, string> = {
  "ممتاز": "text-emerald-600 bg-emerald-50",
  "جيد جداً": "text-sky-600 bg-sky-50",
  "جيد": "text-blue-600 bg-blue-50",
  "مقبول": "text-amber-600 bg-amber-50",
  "ضعيف": "text-red-600 bg-red-50",
};

export default function ManagerDashboardPage() {
  const { t } = useLang();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [leaves, setLeaves] = useState<TeamLeave[]>([]);
  const [evals, setEvals] = useState<TeamEval[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json();
        if (!me.employee?.id) return;
        const empId = me.employee.id;

        // Parallel fetches
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const [empRes, attRes, leavesRes, evalsRes, reqRes] = await Promise.all([
          fetch("/api/employees"),
          fetch(`/api/attendance?month=${month}&year=${year}`),
          fetch("/api/leaves"),
          fetch("/api/evaluations"),
          fetch(`/api/requests?managerId=${empId}`),
        ]);

        const [employees, attendance, allLeaves, allEvals, allReqs] = await Promise.all([
          empRes.json(), attRes.json(), leavesRes.json(), evalsRes.json(), reqRes.json(),
        ]);

        // Filter team
        const myTeam = (Array.isArray(employees) ? employees : [])
          .filter((e: { managerId?: string }) => e.managerId === empId);
        const teamIds = new Set(myTeam.map((m: { id: string }) => m.id));

        // Enrich team with attendance
        const attArr = Array.isArray(attendance) ? attendance : [];
        const enriched: TeamMember[] = myTeam.map((m: { id: string; firstName: string; lastName: string; jobTitle?: string; department?: string }) => {
          const empAtt = attArr.filter((a: { employeeId: string }) => a.employeeId === m.id);
          const today = empAtt.find((a: { date: string }) => new Date(a.date).toDateString() === now.toDateString());

          let lateMins = 0;
          if (today?.checkIn) {
            const d = new Date(today.checkIn);
            const mins = d.getHours() * 60 + d.getMinutes();
            if (mins > 480) lateMins = mins - 480;
          }

          const monthPresent = empAtt.filter((a: { status: string }) => a.status === "present").length;
          const monthLate = empAtt.filter((a: { status: string }) => a.status === "late").length;
          const monthAbsent = empAtt.filter((a: { status: string }) => a.status === "absent").length;
          const totalDays = monthPresent + monthLate + monthAbsent;

          return {
            id: m.id, firstName: m.firstName, lastName: m.lastName,
            jobTitle: m.jobTitle, department: m.department,
            todayStatus: today?.status ?? "absent", lateMins,
            monthPresent, monthLate, monthAbsent,
            attendanceRate: totalDays > 0 ? Math.round(((monthPresent + monthLate) / totalDays) * 100) : 0,
          };
        });
        setTeam(enriched);

        // Team leaves (current & upcoming)
        const teamLeaves = (Array.isArray(allLeaves) ? allLeaves : [])
          .filter((l: { employeeId: string; status: string }) =>
            teamIds.has(l.employeeId) && ["pending", "manager_approved", "approved"].includes(l.status)
          )
          .slice(0, 6);
        setLeaves(teamLeaves);

        // Team evaluations (latest year)
        const teamEvals = (Array.isArray(allEvals) ? allEvals : [])
          .filter((e: { employeeId: string }) => teamIds.has(e.employeeId))
          .slice(0, 10);
        setEvals(teamEvals);

        // Pending requests
        const pendingReqs = (Array.isArray(allReqs) ? allReqs : [])
          .filter((r: PendingRequest) => r.status === "pending")
          .slice(0, 5);
        setRequests(pendingReqs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const presentToday = team.filter(m => m.todayStatus === "present" || m.todayStatus === "late").length;
  const lateToday = team.filter(m => m.todayStatus === "late").length;
  const absentToday = team.filter(m => m.todayStatus === "absent").length;
  const avgRate = team.length > 0 ? Math.round(team.reduce((s, m) => s + m.attendanceRate, 0) / team.length) : 0;
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;

  const formatMins = (m: number) => {
    if (m === 0) return "—";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h} س ${min} د` : `${min} د`;
  };

  const statusBadge = (s: string) => {
    if (s === "present") return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />حاضر</span>;
    if (s === "late") return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />متأخر</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" />غائب</span>;
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-6 space-y-4">
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="bg-gradient-to-l from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 right-0 w-28 h-28 bg-white/5 rounded-full translate-x-10 translate-y-10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t("لوحة الفريق")}</h1>
              <p className="text-purple-200 text-sm">{t("متابعة أداء وحضور فريق العمل")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox icon={<Users className="h-5 w-5" />} value={team.length} label={t("أعضاء الفريق")} />
            <StatBox icon={<UserCheck className="h-5 w-5" />} value={presentToday} label={t("حاضرون اليوم")} highlight={presentToday === team.length && team.length > 0} />
            <StatBox icon={<Clock className="h-5 w-5" />} value={lateToday} label={t("متأخرون")} warn={lateToday > 0} />
            <StatBox icon={<AlertTriangle className="h-5 w-5" />} value={absentToday} label={t("غائبون")} warn={absentToday > 0} />
          </div>
        </div>
      </div>

      {/* ── Attendance Rate Bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            {t("نسبة الحضور هذا الشهر")}
          </span>
          <span className="text-lg font-black text-emerald-600">{avgRate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-l from-emerald-400 to-green-500"
            style={{ width: `${avgRate}%` }}
          />
        </div>
      </div>

      {/* ── Team Members ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-500" />
          {t("أعضاء الفريق")}
          <Badge className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{team.length}</Badge>
        </h3>

        {team.length === 0 ? (
          <div className="text-center py-10">
            <Users className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">{t("لا يوجد أعضاء فريق مسندين إليك")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {team.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar photo={m.photo} firstName={m.firstName} lastName={m.lastName} size="lg" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{m.firstName} {m.lastName}</p>
                      <p className="text-[10px] text-gray-400">{m.jobTitle ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini attendance bar */}
                    <div className="hidden sm:flex items-center gap-1 text-[10px]">
                      <span className="text-green-600 font-medium">{m.monthPresent}ح</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-amber-600 font-medium">{m.monthLate}ت</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-red-500 font-medium">{m.monthAbsent}غ</span>
                    </div>
                    <div className="text-left min-w-[60px]">
                      {statusBadge(m.todayStatus ?? "absent")}
                      {m.lateMins! > 0 && (
                        <p className="text-[9px] text-amber-500 mt-0.5">{formatMins(m.lateMins!)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Month Summary Table */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">{t("ملخص الشهر")}</p>
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-right px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">{t("الموظف")}</th>
                      <th className="text-center px-2 py-2.5 text-green-600 font-medium">{t("حضور")}</th>
                      <th className="text-center px-2 py-2.5 text-amber-600 font-medium">{t("تأخر")}</th>
                      <th className="text-center px-2 py-2.5 text-red-500 font-medium">{t("غياب")}</th>
                      <th className="text-center px-2 py-2.5 text-violet-600 dark:text-violet-400 font-medium">{t("النسبة")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {team.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-200">{m.firstName} {m.lastName}</td>
                        <td className="text-center px-2 py-2 text-green-700 dark:text-green-400 font-semibold">{m.monthPresent}</td>
                        <td className="text-center px-2 py-2 text-amber-700 dark:text-amber-400 font-semibold">{m.monthLate}</td>
                        <td className="text-center px-2 py-2 text-red-600 dark:text-red-400 font-semibold">{m.monthAbsent}</td>
                        <td className="text-center px-2 py-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                            m.attendanceRate >= 90 ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30" :
                            m.attendanceRate >= 70 ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30" :
                            "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30"
                          }`}>{m.attendanceRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Two columns: Leaves + Requests ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Team Leaves */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarX2 className="h-4 w-4 text-sky-500" />
            {t("إجازات الفريق")}
            {pendingLeaves > 0 && (
              <Badge className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600">{pendingLeaves} {t("معلقة")}</Badge>
            )}
          </h3>
          {leaves.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">{t("لا توجد إجازات حالية")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaves.map(l => (
                <div key={l.id} className={`rounded-xl p-3 border ${
                  l.status === "pending" ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10" :
                  "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {l.employee.firstName} {l.employee.lastName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {leaveTypeMap[l.type] ?? l.type} — {l.days} {t("يوم")}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(l.startDate).toLocaleDateString("ar-SA")} → {new Date(l.endDate).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${
                      l.status === "pending" ? "text-amber-600 border-amber-300" :
                      l.status === "approved" || l.status === "manager_approved" ? "text-green-600 border-green-300" :
                      "text-red-500 border-red-300"
                    }`}>
                      {l.status === "pending" ? "معلقة" : l.status === "approved" || l.status === "manager_approved" ? "معتمدة" : "مرفوضة"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-orange-500" />
              {t("طلبات معلقة")}
              {requests.length > 0 && (
                <Badge className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600">{requests.length}</Badge>
              )}
            </h3>
            <Link href="/portal/team-requests" className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
              {t("عرض الكل")} <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-300 dark:text-green-700 mb-2" />
              <p className="text-xs text-gray-400">{t("لا توجد طلبات معلقة")}</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-500 mt-1">{t("تم مراجعة جميع الطلبات")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.employee.firstName} {r.employee.lastName} · {typeMap[r.type] ?? r.type}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 shrink-0">{t("معلق")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Evaluations ── */}
      {evals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t("تقييمات الفريق")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {evals.map(ev => (
              <div key={ev.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.employee.firstName} {ev.employee.lastName}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{ev.period} {ev.year}</p>
                  </div>
                  {ev.grade && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${gradeColors[ev.grade] ?? "text-gray-600 bg-gray-100"}`}>
                      {ev.grade}
                    </span>
                  )}
                </div>
                {ev.score != null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ev.score >= 90 ? "bg-emerald-500" : ev.score >= 70 ? "bg-sky-500" : ev.score >= 50 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(ev.score, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-8">{ev.score}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat Box (inside header) ── */
function StatBox({ icon, value, label, highlight, warn }: {
  icon: React.ReactNode; value: number; label: string; highlight?: boolean; warn?: boolean;
}) {
  return (
    <div className={`backdrop-blur-sm rounded-xl p-3 text-center ${
      highlight ? "bg-green-400/20" : warn ? "bg-red-400/20" : "bg-white/15"
    }`}>
      <div className="flex items-center justify-center gap-2 mb-1 opacity-80">
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-purple-200">{label}</p>
    </div>
  );
}
