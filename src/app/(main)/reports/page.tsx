"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, DollarSign, CalendarCheck, ClipboardList, TrendingUp, Clock, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportReportsExcel, exportReportsPDF } from "@/lib/export-utils";

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const typeMap: Record<string, string> = {
  leave: "إجازة", attendance_fix: "تعديل حضور", loan: "سلفة",
  custody: "عهدة", exit_return: "خروج وعودة", resignation: "استقالة", letter: "خطاب",
};

type ReportData = {
  attendanceByMonth: { month: number; present: number; late: number; absent: number; total: number; lateMins: number }[];
  salaryByMonth: { month: number; totalNet: number; count: number; paid: number }[];
  requestsByType: Record<string, { total: number; approved: number; rejected: number; pending: number }>;
  totalEmployees: number;
  departments: string[];
  employeesByDept: { department: string; count: number }[];
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-end gap-1 flex-1">
      <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [data, setData] = useState<ReportData | null>(null);
  const years = [String(now.getFullYear() - 1), String(now.getFullYear())];

  useEffect(() => {
    fetch(`/api/reports?year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [year]);

  if (!data) return (
    <div className="p-3 sm:p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 gap-2 sm:gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl" />)}</div>
      </div>
    </div>
  );

  const totalAttendance = data.attendanceByMonth.reduce((s, m) => s + m.total, 0);
  const totalLate = data.attendanceByMonth.reduce((s, m) => s + m.late, 0);
  const totalAbsent = data.attendanceByMonth.reduce((s, m) => s + m.absent, 0);
  const totalLateMins = data.attendanceByMonth.reduce((s, m) => s + m.lateMins, 0);
  const totalSalaryPaid = data.salaryByMonth.reduce((s, m) => s + m.totalNet, 0);
  const maxAtt = Math.max(...data.attendanceByMonth.map((m) => m.present + m.late + m.absent), 1);
  const maxSalary = Math.max(...data.salaryByMonth.map((m) => m.totalNet), 1);

  const formatMins = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h} س ${min} د` : `${min} د`;
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">التقارير</h1>
            <p className="text-sm text-gray-500">إحصائيات وتقارير شاملة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={v => setYear(v ?? year)}>
            <SelectTrigger className="w-28 h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 sm:h-9 gap-1.5 text-xs" onClick={() => data && exportReportsPDF(data, year)}>
            <FileText className="h-3.5 w-3.5 text-red-500" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="h-8 sm:h-9 gap-1.5 text-xs" onClick={() => data && exportReportsExcel(data, year)}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Excel
          </Button>
        </div>
      </div>

      {/* بطاقات ملخص */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-sky-600" /><span className="text-xs text-gray-500">الموظفون النشطون</span></div>
            <p className="text-2xl font-bold text-gray-900">{data.totalEmployees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CalendarCheck className="h-4 w-4 text-green-600" /><span className="text-xs text-gray-500">إجمالي سجلات الحضور</span></div>
            <p className="text-2xl font-bold text-gray-900">{totalAttendance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-yellow-600" /><span className="text-xs text-gray-500">إجمالي التأخير</span></div>
            <p className="text-2xl font-bold text-gray-900">{formatMins(totalLateMins)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-xs text-gray-500">إجمالي الرواتب</span></div>
            <p className="text-2xl font-bold text-gray-900">{totalSalaryPaid.toLocaleString("ar-SA")} ر.س</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* رسم الحضور */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-green-600" /> الحضور الشهري</h3>
            <p className="text-xs text-gray-400 mb-4">حاضر / متأخر / غائب</p>
            <div className="flex items-end gap-1 h-40 mb-2">
              {data.attendanceByMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                  <div className="w-full flex flex-col gap-0.5" style={{ height: `${(m.present + m.late + m.absent) / maxAtt * 100}%` }}>
                    {m.absent > 0 && <div className="bg-red-400 rounded-t" style={{ flex: m.absent }} />}
                    {m.late > 0 && <div className="bg-yellow-400" style={{ flex: m.late }} />}
                    {m.present > 0 && <div className="bg-green-500 rounded-b" style={{ flex: m.present }} />}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {data.attendanceByMonth.map((m) => (
                <div key={m.month} className="flex-1 text-center text-[9px] text-gray-400">{m.month}</div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-500 rounded" /> حاضر</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-yellow-400 rounded" /> متأخر ({totalLate})</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-400 rounded" /> غائب ({totalAbsent})</span>
            </div>
          </CardContent>
        </Card>

        {/* رسم الرواتب */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /> الرواتب الشهرية</h3>
            <p className="text-xs text-gray-400 mb-4">إجمالي صافي الرواتب</p>
            <div className="flex items-end gap-1 h-40 mb-2">
              {data.salaryByMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="w-full bg-sky-500 rounded-t" style={{ height: `${Math.max((m.totalNet / maxSalary) * 100, m.totalNet > 0 ? 4 : 0)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {data.salaryByMonth.map((m) => (
                <div key={m.month} className="flex-1 text-center text-[9px] text-gray-400">{m.month}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الطلبات حسب النوع */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-purple-600" /> الطلبات حسب النوع</h3>
            {Object.keys(data.requestsByType).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد طلبات</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.requestsByType).map(([type, stats]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{typeMap[type] ?? type}</span>
                      <span className="text-xs text-gray-400">{stats.total} طلب</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      {stats.approved > 0 && <div className="bg-green-500" style={{ width: `${(stats.approved / stats.total) * 100}%` }} />}
                      {stats.pending > 0 && <div className="bg-yellow-400" style={{ width: `${(stats.pending / stats.total) * 100}%` }} />}
                      {stats.rejected > 0 && <div className="bg-red-400" style={{ width: `${(stats.rejected / stats.total) * 100}%` }} />}
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded" /> موافق</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded" /> معلق</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" /> مرفوض</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* الموظفون حسب القسم */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-sky-600" /> الموظفون حسب القسم</h3>
            {data.employeesByDept.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد بيانات</p>
            ) : (
              <div className="space-y-3">
                {data.employeesByDept.sort((a, b) => b.count - a.count).map((d) => {
                  const pct = (d.count / data.totalEmployees) * 100;
                  return (
                    <div key={d.department}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{d.department}</span>
                        <span className="text-xs text-gray-400">{d.count} موظف</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
