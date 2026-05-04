"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, Eye, Shield } from "lucide-react";
import { generateSalaryPDF } from "@/lib/salary-pdf";

type Salary = {
  id: string; month: number; year: number;
  basicSalary: number; allowances: number; deductions: number;
  bonus: number; overtimePay: number;
  gosiEmployee?: number; gosiEmployer?: number;
  netSalary: number;
  status: string; paidAt?: string; notes?: string;
};

type EmpInfo = {
  id: string;
  firstName: string; lastName: string;
  jobTitle?: string; department?: string;
  employeeNumber?: string; nationality?: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
};

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const now = new Date();

// ── دائرة SVG ──────────────────────────────────────────────
function PieChart({ slices }: { slices: { value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="w-44 h-44 rounded-full bg-gray-200" />;

  const cx = 80, cy = 80, r = 72;
  let angle = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];

  for (const { value, color } of slices) {
    if (value <= 0) continue;
    const sweep = (value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push({ d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color });
  }

  return (
    <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-sm">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
    </svg>
  );
}

export default function PortalSalaryPage() {
  const router = useRouter();
  const [emp, setEmp] = useState<EmpInfo | null>(null);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [latest, setLatest] = useState<Salary | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.employee?.id) {
        setEmp({
          id: data.employee.id,
          firstName: data.employee.firstName ?? "",
          lastName: data.employee.lastName ?? "",
          jobTitle: data.employee.jobTitle,
          department: data.employee.department,
          employeeNumber: data.employee.employeeNumber,
          nationality: data.employee.nationality,
          basicSalary: data.employee.basicSalary ?? 0,
          housingAllowance: data.employee.housingAllowance ?? 0,
          transportAllowance: data.employee.transportAllowance ?? 0,
          otherAllowance: data.employee.otherAllowance ?? 0,
        });
        // جلب آخر سنتين من الرواتب
        fetch(`/api/salaries?employeeId=${data.employee.id}&year=${now.getFullYear()}`)
          .then(r => r.json())
          .then(d => {
            const list: Salary[] = Array.isArray(d) ? d : [];
            setSalaries(list.sort((a, b) => b.month - a.month || b.year - a.year));
            if (list.length > 0) setLatest(list.sort((a, b) => b.month - a.month)[0]);
          });
      }
    });
  }, []);

  const totalSalary = emp
    ? emp.basicSalary + emp.housingAllowance + emp.transportAllowance + emp.otherAllowance
    : 0;

  const slices = emp ? [
    { value: emp.basicSalary,       color: "#374151" },  // رمادي داكن
    { value: emp.housingAllowance,  color: "#22c55e" },  // أخضر
    { value: emp.transportAllowance,color: "#9ca3af" },  // رمادي فاتح
    { value: emp.otherAllowance,    color: "#60a5fa" },  // أزرق
  ] : [];

  const downloadPDF = (s: Salary) => {
    if (!emp) return;
    generateSalaryPDF({
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeNumber: emp.employeeNumber ?? "",
      jobTitle: emp.jobTitle,
      department: emp.department,
      nationality: emp.nationality,
      month: s.month, year: s.year,
      basicSalary: s.basicSalary,
      allowances: s.allowances,
      bonus: s.bonus,
      overtimePay: s.overtimePay,
      deductions: s.deductions,
      gosiEmployee: s.gosiEmployee ?? 0,
      gosiEmployer: s.gosiEmployer ?? 0,
      netSalary: s.netSalary,
      status: s.status, paidAt: s.paidAt, notes: s.notes,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">الراتب والتفاصيل المالية</h1>
        <div className="w-9" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── بطاقة الراتب مع الدائرة ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <p className="text-right text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">الراتب</p>

          <div className="flex items-center justify-between mb-5">
            {/* الدائرة */}
            <div className="flex-shrink-0">
              <PieChart slices={slices} />
            </div>
            {/* المجموع */}
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">مجموع الراتب</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white tabular-nums">
                {totalSalary.toLocaleString("ar-SA")}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">ر.س / شهرياً</p>
            </div>
          </div>

          {/* Legend */}
          {emp && (() => {
            const rows = [
              { label: "الراتب الأساسي", value: emp.basicSalary,        color: "bg-gray-700" },
              { label: "بدل سكن",        value: emp.housingAllowance,   color: "bg-green-500" },
              { label: "بدل مواصلات",    value: emp.transportAllowance, color: "bg-gray-400" },
              { label: "بدل أخرى",       value: emp.otherAllowance,     color: "bg-blue-400" },
            ];
            return (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {rows.map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className={`text-base font-bold tabular-nums ${value > 0 ? "text-gray-800 dark:text-gray-200" : "text-gray-300 dark:text-gray-600"}`}>
                      {value > 0 ? value.toLocaleString("ar-SA") : "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${value > 0 ? "text-gray-600 dark:text-gray-300" : "text-gray-300 dark:text-gray-600"}`}>{label}</span>
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${value > 0 ? color : "bg-gray-200 dark:bg-gray-700"}`} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ── بطاقة تفاصيل الراتب (آخر شهر) ── */}
        {latest ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4" />
                بيانات الراتب
              </button>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">تفاصيل الراتب</p>
            </div>

            <p className="text-xs text-gray-400 text-right mb-1">شهر</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white text-right mb-5">
              {monthNames[latest.month - 1]} {latest.year}
            </p>

            {/* صافي الراتب */}
            <div className="bg-gray-900 dark:bg-gray-700 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
              <span className="text-2xl font-black text-white tabular-nums">{latest.netSalary.toLocaleString("ar-SA")} <span className="text-sm font-normal opacity-70">ر.س</span></span>
              <span className="text-xs text-gray-300 opacity-80">صافي الراتب</span>
            </div>

            {/* تفاصيل الأرقام */}
            <div className="space-y-2 mb-5">
              {latest.allowances > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium">+{latest.allowances.toLocaleString("ar-SA")} ر.س</span>
                  <span className="text-gray-500 dark:text-gray-400">البدلات</span>
                </div>
              )}
              {(latest.bonus + latest.overtimePay) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600 font-medium">+{(latest.bonus + latest.overtimePay).toLocaleString("ar-SA")} ر.س</span>
                  <span className="text-gray-500 dark:text-gray-400">مكافآت وإضافي</span>
                </div>
              )}
              {latest.deductions > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500 font-medium">-{latest.deductions.toLocaleString("ar-SA")} ر.س</span>
                  <span className="text-gray-500 dark:text-gray-400">الخصومات</span>
                </div>
              )}
              {(latest.gosiEmployee ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-teal-600 font-medium flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    -{(latest.gosiEmployee ?? 0).toLocaleString("ar-SA")} ر.س
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">GOSI (نصيبك)</span>
                </div>
              )}
            </div>

            {/* أزرار */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => downloadPDF(latest)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                تنزيل
              </button>
              <button
                onClick={() => downloadPDF(latest)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 dark:bg-gray-600 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
              >
                <Eye className="h-4 w-4" />
                معاينة
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-400 text-sm">لا توجد رواتب مسجلة</p>
          </div>
        )}

        {/* ── سجل الرواتب (قابل للطي) ── */}
        {salaries.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${showHistory ? "rotate-90" : ""}`} />
              <span>سجل الرواتب ({salaries.length} شهر)</span>
            </button>

            {showHistory && (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {salaries.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadPDF(s)}
                        className="text-xs text-sky-600 flex items-center gap-1 hover:underline"
                      >
                        <Download className="h-3 w-3" /> تنزيل
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "paid" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                        {s.status === "paid" ? "مصروف" : "معلق"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{monthNames[s.month - 1]} {s.year}</p>
                      <p className="text-xs text-gray-400">{s.netSalary.toLocaleString("ar-SA")} ر.س</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
