"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, DollarSign, CheckCircle, Clock, Wand2, Pencil, AlertTriangle,
  Download, Shield, BadgeCheck, RefreshCw, Scissors, Trash2,
  ToggleLeft, ToggleRight, FileSpreadsheet, FileText, Search,
  Users, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { generateSalaryPDF } from "@/lib/salary-pdf";
import { exportSalariesExcel, exportSalariesPDF } from "@/lib/export-utils";
import { Pagination } from "@/components/ui/pagination";
import { useLang } from "@/components/lang-provider";

type Employee = {
  id: string; firstName: string; lastName: string;
  employeeNumber: string; basicSalary: number; department?: string;
  jobTitle?: string; nationality?: string;
  housingAllowance?: number; transportAllowance?: number; otherAllowance?: number;
};
type Salary = {
  id: string; employeeId: string; month: number; year: number;
  basicSalary: number; allowances: number; deductions: number;
  bonus: number; overtimePay: number;
  gosiEmployee: number; gosiEmployer: number;
  netSalary: number;
  status: string; paidAt?: string; notes?: string;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string };
};
type Attendance = { id: string; employeeId: string; date: string; status: string; checkIn?: string; };
type Row = { employee: Employee; salary: Salary | null; lateMins: number; };
type DeductionRule = {
  id: string; name: string; type: string; amount: number; isActive: boolean;
  totalMonths: number; appliedMonths: number; employeeId: string | null;
  employee?: { id: string; firstName: string; lastName: string; employeeNumber: string } | null;
};

const emptyDeductionForm = { name: "", type: "fixed", amount: "", employeeId: "", isActive: true, totalMonths: "0" };
const now = new Date();
let CHECKIN_LIMIT = 8 * 60;

function getLateMins(checkIn: string | undefined): number {
  if (!checkIn) return 0;
  const d = new Date(checkIn);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins > CHECKIN_LIMIT ? mins - CHECKIN_LIMIT : 0;
}
function calcGosiPreview(basic: number, nationality: string) {
  if (nationality === "saudi") {
    const v = Math.round(basic * 0.09 * 100) / 100;
    return { gosiEmployee: v, gosiEmployer: v };
  }
  return { gosiEmployee: 0, gosiEmployer: Math.round(basic * 0.02 * 100) / 100 };
}

const emptyForm = {
  employeeId: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()),
  basicSalary: "", allowances: "0", deductions: "0", bonus: "0", overtimePay: "0",
  gosiEmployee: "", gosiEmployer: "", notes: "",
};

type StatusFilter = "all" | "paid" | "pending" | "none";

export default function SalariesPage() {
  const { t } = useLang();
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [salaries, setSalaries]           = useState<Salary[]>([]);
  const [attendance, setAttendance]       = useState<Attendance[]>([]);
  const [month, setMonth]                 = useState(String(now.getMonth() + 1));
  const [year, setYear]                   = useState(String(now.getFullYear()));
  const [open, setOpen]                   = useState(false);
  const [editId, setEditId]               = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm);
  const [saving, setSaving]               = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [markingAllPaid, setMarkingAllPaid] = useState(false);
  const [recalcing, setRecalcing]         = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [deductionRules, setDeductionRules] = useState<DeductionRule[]>([]);
  const [deductionOpen, setDeductionOpen] = useState(false);
  const [deductionEditId, setDeductionEditId] = useState<string | null>(null);
  const [deductionForm, setDeductionForm] = useState(emptyDeductionForm);
  const [savingDeduction, setSavingDeduction] = useState(false);
  const [showDeductions, setShowDeductions] = useState(false);
  const [salPage, setSalPage]             = useState(1);
  const [salTotal, setSalTotal]           = useState(0);
  const [salTotalPages, setSalTotalPages] = useState(1);
  const SAL_PAGE_SIZE = 20;

  const monthNames = [t("يناير"),t("فبراير"),t("مارس"),t("أبريل"),t("مايو"),t("يونيو"),
                      t("يوليو"),t("أغسطس"),t("سبتمبر"),t("أكتوبر"),t("نوفمبر"),t("ديسمبر")];

  const fetchDeductions = async () => {
    const data = await fetch("/api/salary-deductions").then(r => r.json());
    setDeductionRules(Array.isArray(data) ? data : []);
  };

  const fetchData = async (p = salPage) => {
    const salParams = new URLSearchParams({ month, year, page: String(p), pageSize: String(SAL_PAGE_SIZE) });
    const [empRes, salRes, attRes, settRes] = await Promise.all([
      fetch("/api/employees?all=1"),
      fetch(`/api/salaries?${salParams}`),
      fetch(`/api/attendance?month=${month}&year=${year}&all=1`),
      fetch("/api/settings/attendance"),
    ]);
    const [empData, salData, attData, sett] = await Promise.all([
      empRes.json(), salRes.json(), attRes.json(), settRes.json(),
    ]);
    if (sett?.checkInTime) {
      const [h, m] = sett.checkInTime.split(":").map(Number);
      CHECKIN_LIMIT = h * 60 + m + (sett.lateToleranceMinutes ?? 0);
    }
    setEmployees(Array.isArray(empData) ? empData : (empData.data ?? []));
    if (salData.data) {
      setSalaries(salData.data);
      setSalTotal(salData.total);
      setSalTotalPages(salData.totalPages);
    } else {
      setSalaries(Array.isArray(salData) ? salData : []);
    }
    setAttendance(Array.isArray(attData) ? attData : (attData.data ?? []));
  };

  useEffect(() => { fetchData(1); setSalPage(1); }, [month, year]);
  useEffect(() => { fetchData(salPage); }, [salPage]);
  useEffect(() => { fetchDeductions(); }, []);

  const rows: Row[] = employees.map(emp => {
    const empAtt = attendance.filter(a => a.employeeId === emp.id && a.status === "late");
    const lateMins = empAtt.reduce((sum, a) => sum + getLateMins(a.checkIn), 0);
    return { employee: emp, salary: salaries.find(s => s.employeeId === emp.id) ?? null, lateMins };
  });

  // إحصائيات
  const totalNet      = rows.reduce((sum, r) => sum + (r.salary?.netSalary ?? 0), 0);
  const totalBasic    = rows.reduce((sum, r) => sum + (r.salary?.basicSalary ?? r.employee.basicSalary), 0);
  const totalGosiEmp  = salaries.reduce((sum, s) => sum + (s.gosiEmployee ?? 0), 0);
  const totalGosiEer  = salaries.reduce((sum, s) => sum + (s.gosiEmployer ?? 0), 0);
  const paidCount     = salaries.filter(s => s.status === "paid").length;
  const pendingCount  = salaries.filter(s => s.status === "pending").length;
  const noneCount     = employees.length - salaries.length;

  // فلترة وبحث
  const filteredRows = useMemo(() => rows.filter(r => {
    const name = `${r.employee.firstName} ${r.employee.lastName} ${r.employee.employeeNumber} ${r.employee.department ?? ""}`.toLowerCase();
    if (!name.includes(search.toLowerCase())) return false;
    if (statusFilter === "paid")    return r.salary?.status === "paid";
    if (statusFilter === "pending") return r.salary?.status === "pending";
    if (statusFilter === "none")    return !r.salary;
    return true;
  }), [rows, search, statusFilter]);

  // GOSI preview
  const selectedEmp = employees.find(e => e.id === form.employeeId);
  const gosiPreview = calcGosiPreview(parseFloat(form.basicSalary || "0"), selectedEmp?.nationality ?? "non_saudi");
  const formGosiEmp = form.gosiEmployee !== "" ? parseFloat(form.gosiEmployee) : gosiPreview.gosiEmployee;
  const formGosiEer = form.gosiEmployer !== "" ? parseFloat(form.gosiEmployer) : gosiPreview.gosiEmployer;
  const net = (
    parseFloat(form.basicSalary || "0") + parseFloat(form.allowances || "0") +
    parseFloat(form.bonus || "0") + parseFloat(form.overtimePay || "0") -
    parseFloat(form.deductions || "0")
  );
  // البدلات الافتراضية للموظف المحدد
  const defaultAllowances = selectedEmp
    ? (selectedEmp.housingAllowance ?? 0) + (selectedEmp.transportAllowance ?? 0) + (selectedEmp.otherAllowance ?? 0)
    : 0;

  const openAdd = (emp?: Employee) => {
    setEditId(null);
    const basic = String(emp?.basicSalary ?? "");
    const basicNum = parseFloat(basic || "0");
    const nationality = emp?.nationality ?? "non_saudi";
    const gosi = calcGosiPreview(basicNum, nationality);
    const allowancesDefault = emp
      ? String((emp.housingAllowance ?? 0) + (emp.transportAllowance ?? 0) + (emp.otherAllowance ?? 0))
      : "0";

    // احسب الخصومات الثابتة المنطبقة على هذا الموظف
    const activeRules = deductionRules.filter(
      r => r.isActive && (r.totalMonths === 0 || r.appliedMonths < r.totalMonths)
    );
    const applicableDeductions = emp
      ? activeRules.filter(r => r.employeeId === null || r.employeeId === emp.id)
      : [];
    const fixedDeductionsTotal = applicableDeductions.reduce((sum, r) => {
      const val = r.type === "percentage"
        ? Math.round(basicNum * (r.amount / 100) * 100) / 100
        : r.amount;
      return sum + val;
    }, 0);

    setForm({
      ...emptyForm, month, year,
      employeeId: emp?.id ?? "",
      basicSalary: basic,
      allowances: allowancesDefault,
      deductions: String(fixedDeductionsTotal),
      gosiEmployee: String(gosi.gosiEmployee),
      gosiEmployer: String(gosi.gosiEmployer),
    });
    setOpen(true);
  };

  const openEdit = (s: Salary) => {
    setEditId(s.id);
    setForm({
      employeeId: s.employeeId, month: String(s.month), year: String(s.year),
      basicSalary: String(s.basicSalary), allowances: String(s.allowances),
      deductions: String(s.deductions), bonus: String(s.bonus), overtimePay: String(s.overtimePay),
      gosiEmployee: String(s.gosiEmployee ?? 0), gosiEmployer: String(s.gosiEmployer ?? 0),
      notes: s.notes ?? "",
    });
    setOpen(true);
  };

  const saveSalary = async () => {
    setSaving(true);
    const payload = { ...form, gosiEmployee: formGosiEmp, gosiEmployer: formGosiEer, status: "pending" };
    await fetch(editId ? `/api/salaries/${editId}` : "/api/salaries", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setOpen(false);
    fetchData();
  };

  const deleteSalary = async (id: string) => {
    if (!confirm(t("هل تريد حذف هذا الراتب؟"))) return;
    setDeletingId(id);
    await fetch(`/api/salaries/${id}`, { method: "DELETE" });
    setDeletingId(null);
    fetchData();
  };

  const markPaid = async (id: string) => {
    const s = salaries.find(x => x.id === id);
    if (!s) return;
    await fetch(`/api/salaries/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, status: "paid" }),
    });
    fetchData();
  };

  const generateAll = async () => {
    setGenerating(true);
    await fetch("/api/salaries", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, month, year }) });
    setGenerating(false); fetchData();
  };

  const recalcGosi = async () => {
    setRecalcing(true);
    await fetch("/api/salaries", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recalcGosi: true, month, year }) });
    setRecalcing(false); fetchData();
  };

  const markAllPaid = async () => {
    if (!confirm(`${t("هل تريد تأكيد صرف جميع رواتب")} ${monthNames[Number(month) - 1]} ${year}؟`)) return;
    setMarkingAllPaid(true);
    await fetch("/api/salaries", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllPaid: true, month, year }) });
    setMarkingAllPaid(false); fetchData();
  };

  // ── خصومات ──
  const openAddDeduction = () => { setDeductionEditId(null); setDeductionForm(emptyDeductionForm); setDeductionOpen(true); };
  const openEditDeduction = (r: DeductionRule) => {
    setDeductionEditId(r.id);
    setDeductionForm({ name: r.name, type: r.type ?? "fixed", amount: String(r.amount),
      employeeId: r.employeeId ?? "", isActive: r.isActive, totalMonths: String(r.totalMonths ?? 0) });
    setDeductionOpen(true);
  };
  const saveDeduction = async () => {
    setSavingDeduction(true);
    const payload = { ...deductionForm, amount: deductionForm.amount, employeeId: deductionForm.employeeId || null };
    await fetch(deductionEditId ? `/api/salary-deductions/${deductionEditId}` : "/api/salary-deductions", {
      method: deductionEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSavingDeduction(false); setDeductionOpen(false); fetchDeductions();
  };
  const deleteDeduction = async (id: string) => {
    if (!confirm(t("هل تريد حذف هذا الخصم؟"))) return;
    await fetch(`/api/salary-deductions/${id}`, { method: "DELETE" }); fetchDeductions();
  };
  const toggleDeduction = async (r: DeductionRule) => {
    await fetch(`/api/salary-deductions/${r.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, employeeId: r.employeeId, isActive: !r.isActive }),
    }); fetchDeductions();
  };

  const years = [String(now.getFullYear() - 1), String(now.getFullYear()), String(now.getFullYear() + 1)];

  const statusTabs: { key: StatusFilter; label: string; count: number; color: string }[] = [
    { key: "all",     label: t("الكل"),       count: rows.length,  color: "bg-gray-900 text-white" },
    { key: "paid",    label: t("تم الصرف"),   count: paidCount,    color: "bg-green-600 text-white" },
    { key: "pending", label: t("معلق"),        count: pendingCount, color: "bg-amber-500 text-white" },
    { key: "none",    label: t("لم يُسجَّل"), count: noneCount,    color: "bg-gray-400 text-white" },
  ];

  return (
    <div className="p-3 sm:p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("الرواتب")}</h1>
            <p className="text-sm text-gray-500">
              {monthNames[Number(month) - 1]} {year} — {employees.length} {t("موظف")}
            </p>
          </div>
        </div>

        {/* أزرار */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={generateAll} disabled={generating} className="gap-1.5 h-9 text-sm">
            <Wand2 className="h-4 w-4" />
            {generating ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t("جارٍ...")}</> : t("توليد الرواتب")}
          </Button>
          {salaries.length > 0 && (
            <Button variant="outline" onClick={recalcGosi} disabled={recalcing}
              className="gap-1.5 h-9 text-sm text-teal-600 border-teal-300 hover:bg-teal-50">
              <RefreshCw className={`h-4 w-4 ${recalcing ? "animate-spin" : ""}`} />
              {t("إعادة GOSI")}
            </Button>
          )}
          {pendingCount > 0 && (
            <Button variant="outline" onClick={markAllPaid} disabled={markingAllPaid}
              className="gap-1.5 h-9 text-sm text-green-600 border-green-300 hover:bg-green-50">
              <BadgeCheck className="h-4 w-4" />
              {markingAllPaid ? t("...") : `${t("صرف الجميع")} (${pendingCount})`}
            </Button>
          )}
          {salaries.length > 0 && (
            <>
              <Button variant="outline" className="gap-1.5 h-9 text-sm"
                onClick={() => exportSalariesPDF(
                  salaries.map(s => ({ employeeName: `${s.employee.firstName} ${s.employee.lastName}`, employeeNumber: s.employee.employeeNumber, department: s.employee.department, month: s.month, year: s.year, basicSalary: s.basicSalary, allowances: s.allowances, bonus: s.bonus, overtimePay: s.overtimePay, deductions: s.deductions, gosiEmployee: s.gosiEmployee, gosiEmployer: s.gosiEmployer, netSalary: s.netSalary, status: s.status, paidAt: s.paidAt })),
                  Number(month), Number(year),
                  { totalNet, totalBasic: salaries.reduce((s, r) => s + r.basicSalary, 0), totalGosi: salaries.reduce((s, r) => s + r.gosiEmployee, 0) }
                )}>
                <FileText className="h-4 w-4 text-red-500" /> PDF
              </Button>
              <Button variant="outline" className="gap-1.5 h-9 text-sm"
                onClick={() => exportSalariesExcel(
                  salaries.map(s => ({ employeeName: `${s.employee.firstName} ${s.employee.lastName}`, employeeNumber: s.employee.employeeNumber, department: s.employee.department, month: s.month, year: s.year, basicSalary: s.basicSalary, allowances: s.allowances, bonus: s.bonus, overtimePay: s.overtimePay, deductions: s.deductions, gosiEmployee: s.gosiEmployee, gosiEmployer: s.gosiEmployer, netSalary: s.netSalary, status: s.status, paidAt: s.paidAt })),
                  Number(month), Number(year)
                )}>
                <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel
              </Button>
            </>
          )}
          <Button onClick={() => openAdd()} className="gap-1.5 h-9 text-sm">
            <Plus className="h-4 w-4" /> {t("إضافة راتب")}
          </Button>
        </div>
      </div>

      {/* ── إحصائيات ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign className="h-4 w-4 text-green-700 opacity-70" />
              <p className="text-xs font-medium text-green-700 opacity-80">{t("إجمالي الصافي")}</p>
            </div>
            <p className="text-lg font-black text-green-700">{totalNet.toLocaleString("ar-SA")} ر.س</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 bg-sky-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign className="h-4 w-4 text-sky-700 opacity-70" />
              <p className="text-xs font-medium text-sky-700 opacity-80">{t("إجمالي الأساسي")}</p>
            </div>
            <p className="text-lg font-black text-sky-700">{totalBasic.toLocaleString("ar-SA")} ر.س</p>
          </CardContent>
        </Card>

        {/* بطاقة GOSI مقسّمة */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 bg-teal-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-teal-700 opacity-70" />
              <p className="text-xs font-medium text-teal-700 opacity-80">GOSI</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-teal-600">استقطاع الموظفين</span>
                <span className="text-sm font-black text-teal-700">
                  {totalGosiEmp.toLocaleString("ar-SA")} <span className="text-[10px] font-normal">ر.س</span>
                </span>
              </div>
              <div className="h-px bg-teal-200" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-teal-500">تكلفة الشركة</span>
                <span className="text-sm font-bold text-teal-600">
                  {totalGosiEer.toLocaleString("ar-SA")} <span className="text-[10px] font-normal">ر.س</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 bg-amber-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="h-4 w-4 text-amber-700 opacity-70" />
              <p className="text-xs font-medium text-amber-700 opacity-80">{t("مصروف")} / {t("معلق")} / {t("لم يُسجَّل")}</p>
            </div>
            <p className="text-lg font-black text-amber-700">{paidCount} / {pendingCount} / {noneCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── الخصومات الثابتة (قابلة للطي) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-5 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowDeductions(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t("الخصومات الثابتة الشهرية")}</span>
            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">
              {deductionRules.filter(r => r.isActive).length} {t("فعّال")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-rose-600 hover:bg-rose-50"
              onClick={e => { e.stopPropagation(); openAddDeduction(); }}>
              <Plus className="h-3.5 w-3.5" /> {t("إضافة")}
            </Button>
            {showDeductions ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {showDeductions && (
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
            {deductionRules.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">{t("لا توجد خصومات ثابتة")}</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-3">
                {deductionRules.map(r => (
                  <div key={r.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${r.isActive ? "bg-rose-50 border-rose-200" : "bg-gray-50 border-gray-200 opacity-60"}`}>
                    <span className={`font-semibold ${r.isActive ? "text-rose-700" : "text-gray-500"}`}>{r.name}</span>
                    <span className={`font-bold ${r.isActive ? "text-rose-600" : "text-gray-400"}`}>
                      -{r.type === "percentage" ? `${r.amount}%` : `${r.amount.toLocaleString("ar-SA")} ر.س`}
                    </span>
                    {r.totalMonths > 0 && (
                      <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                        {r.appliedMonths}/{r.totalMonths} {t("شهر")}
                      </span>
                    )}
                    <span className="text-gray-400">{r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : t("الكل")}</span>
                    <button onClick={() => toggleDeduction(r)} className="text-gray-400 hover:text-gray-600">
                      {r.isActive ? <ToggleRight className="h-4 w-4 text-rose-400" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEditDeduction(r)} className="text-gray-400 hover:text-sky-500"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteDeduction(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── فلتر الشهر + بحث + تبويبات الحالة ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        {/* شهر + سنة */}
        <div className="flex gap-2 shrink-0">
          <Select value={month} onValueChange={v => setMonth(v ?? month)}>
            <SelectTrigger className="w-28 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={v => setYear(v ?? year)}>
            <SelectTrigger className="w-24 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* بحث */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder={t("بحث بالاسم أو الرقم...")} value={search}
            onChange={e => setSearch(e.target.value)} className="pr-9 h-9 text-sm" />
        </div>

        {/* تبويبات الحالة */}
        <div className="flex gap-1.5 shrink-0">
          {statusTabs.map(tab => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? tab.color
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-gray-400"
              }`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === tab.key ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── الجدول ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs">{t("الموظف")}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs">{t("الأساسي")}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs">{t("البدلات")}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs">{t("خصومات")}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs">{t("مكافآت")}</th>
                <th className="text-right px-4 py-3 font-semibold text-teal-600 dark:text-teal-400 text-xs bg-teal-50/50 dark:bg-teal-900/20">
                  <span title="استقطاع نصيب الموظف فقط — نصيب صاحب العمل على الشركة">
                    GOSI <span className="font-normal text-[10px]">(موظف)</span>
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-orange-500 text-xs bg-orange-50/50 dark:bg-orange-900/20">{t("تأخير")}</th>
                <th className="text-right px-4 py-3 font-semibold text-green-600 dark:text-green-400 text-xs bg-green-50/50 dark:bg-green-900/20">{t("الصافي")}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs">{t("الحالة")}</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-400">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>{search ? t("لا نتائج للبحث") : t("لا يوجد موظفون")}</p>
                  </td>
                </tr>
              ) : filteredRows.map(({ employee: emp, salary: s, lateMins }) => (
                <tr key={emp.id}
                  className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors ${!s ? "opacity-55" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-gray-400">{emp.employeeNumber}{emp.department ? ` · ${emp.department}` : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                    {(s?.basicSalary ?? emp.basicSalary).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                    {s ? `+${s.allowances.toLocaleString("ar-SA")}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-red-500 dark:text-red-400">
                    {s ? `-${s.deductions.toLocaleString("ar-SA")}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sky-600 dark:text-sky-400">
                    {s && (s.bonus + s.overtimePay) > 0
                      ? `+${(s.bonus + s.overtimePay).toLocaleString("ar-SA")}`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 bg-teal-50/30 dark:bg-teal-900/10">
                    {s
                      ? <span className={`text-xs font-medium ${s.gosiEmployee > 0 ? "text-teal-700 dark:text-teal-400" : "text-gray-400"}`}>
                          {s.gosiEmployee > 0 ? `-${s.gosiEmployee.toLocaleString("ar-SA")}` : "—"}
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 bg-orange-50/30 dark:bg-orange-900/10">
                    {lateMins > 0
                      ? <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">{lateMins} د</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 bg-green-50/30 dark:bg-green-900/10">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {s ? `${s.netSalary.toLocaleString("ar-SA")} ر.س` : <span className="text-gray-300 font-normal">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!s ? (
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">{t("لم يُسجَّل")}</span>
                    ) : s.status === "paid" ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-lg">
                        <CheckCircle className="h-3.5 w-3.5" /> {t("مصروف")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3.5 w-3.5" /> {t("معلق")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {s ? (
                        <>
                          <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => openEdit(s)} title={t("تعديل")}>
                            <Pencil className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                            title={t("تحميل PDF")}
                            onClick={() => generateSalaryPDF({ employeeName: `${emp.firstName} ${emp.lastName}`, employeeNumber: emp.employeeNumber, jobTitle: emp.jobTitle, department: emp.department, nationality: emp.nationality, month: s.month, year: s.year, basicSalary: s.basicSalary, allowances: s.allowances, bonus: s.bonus, overtimePay: s.overtimePay, deductions: s.deductions, gosiEmployee: s.gosiEmployee ?? 0, gosiEmployer: s.gosiEmployer ?? 0, netSalary: s.netSalary, status: s.status, paidAt: s.paidAt, notes: s.notes })}>
                            <Download className="h-3.5 w-3.5 text-sky-500" />
                          </button>
                          <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            onClick={() => deleteSalary(s.id)} disabled={deletingId === s.id} title={t("حذف")}>
                            {deletingId === s.id
                              ? <RefreshCw className="h-3.5 w-3.5 text-gray-400 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
                          </button>
                          {s.status === "pending" && (
                            <button
                              className="text-green-600 border border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20 text-xs h-7 px-2.5 rounded-lg font-semibold transition-colors"
                              onClick={() => markPaid(s.id)}>
                              {t("صرف")}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          className="text-sky-600 border border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-xs h-7 px-2.5 rounded-lg font-semibold transition-colors"
                          onClick={() => openAdd(emp)}>
                          {t("تسجيل")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* ── Footer الإجمالي ── */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                  <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-200 text-sm">{t("الإجمالي")}</td>
                  <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-200">
                    {salaries.reduce((s, r) => s + r.basicSalary, 0).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">
                    +{salaries.reduce((s, r) => s + r.allowances, 0).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-4 py-3 font-bold text-red-500">
                    -{salaries.reduce((s, r) => s + r.deductions, 0).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-4 py-3 font-bold text-sky-600">
                    +{salaries.reduce((s, r) => s + r.bonus + r.overtimePay, 0).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-4 py-3 bg-teal-50/30">
                    <p className="font-bold text-teal-700 dark:text-teal-400 text-sm">-{totalGosiEmp.toLocaleString("ar-SA")}</p>
                    <p className="text-[10px] text-teal-500">+{totalGosiEer.toLocaleString("ar-SA")} على الشركة</p>
                  </td>
                  <td className="px-4 py-3 bg-orange-50/30"></td>
                  <td className="px-4 py-3 font-black text-green-700 dark:text-green-400 bg-green-50/30 text-base">
                    {totalNet.toLocaleString("ar-SA")} ر.س
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-xs text-gray-400">
                    <span className="text-green-600 font-medium">{paidCount} {t("مصروف")}</span>
                    {" · "}
                    <span className="text-amber-600 font-medium">{pendingCount} {t("معلق")}</span>
                    {" · "}
                    <span className="text-gray-400">{noneCount} {t("لم يُسجَّل")}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination page={salPage} totalPages={salTotalPages} total={salTotal} pageSize={SAL_PAGE_SIZE} onPage={setSalPage} />
      </div>

      {/* ── Dialog الخصومات الثابتة ── */}
      <Dialog open={deductionOpen} onOpenChange={setDeductionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-rose-500" />
              {deductionEditId ? t("تعديل الخصم") : t("إضافة خصم ثابت")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>{t("اسم الخصم")}</Label>
              <Input placeholder={t("مثال: قرض، غرامة...")} value={deductionForm.name}
                onChange={e => setDeductionForm({ ...deductionForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("نوع الخصم")}</Label>
              <div className="flex gap-2">
                {["fixed", "percentage"].map(type => (
                  <button key={type} type="button"
                    onClick={() => setDeductionForm({ ...deductionForm, type })}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors ${deductionForm.type === type ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                    {type === "fixed" ? t("مبلغ ثابت (ر.س)") : t("نسبة مئوية (%)")}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{deductionForm.type === "percentage" ? t("النسبة (%)") : t("المبلغ (ر.س)")}</Label>
              <Input type="number" min="0" value={deductionForm.amount}
                onChange={e => setDeductionForm({ ...deductionForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("تطبيق على")}</Label>
              <Select value={deductionForm.employeeId || "__all__"}
                onValueChange={v => setDeductionForm({ ...deductionForm, employeeId: v === "__all__" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("جميع الموظفين")}</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("عدد أشهر الخصم")}</Label>
              <Input type="number" min="0" placeholder={t("0 = دائم")} value={deductionForm.totalMonths}
                onChange={e => setDeductionForm({ ...deductionForm, totalMonths: e.target.value })} />
              <p className="text-[10px] text-gray-400">{t("0 = دائم · أو حدد عدد الأشهر")}</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActiveChk" checked={deductionForm.isActive}
                onChange={e => setDeductionForm({ ...deductionForm, isActive: e.target.checked })}
                className="w-4 h-4 accent-rose-500" />
              <label htmlFor="isActiveChk" className="text-sm text-gray-700">{t("مفعّل")}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductionOpen(false)}>{t("إلغاء")}</Button>
            <Button onClick={saveDeduction} disabled={savingDeduction || !deductionForm.name || !deductionForm.amount}
              className="bg-rose-600 hover:bg-rose-700">
              {savingDeduction ? t("جارٍ الحفظ...") : t("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog إضافة/تعديل راتب ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              {editId ? t("تعديل الراتب") : t("إضافة راتب")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* اختيار الموظف */}
            {!editId && (
              <div className="space-y-1">
                <Label>{t("الموظف")} <span className="text-red-500">*</span></Label>
                <Select value={form.employeeId} onValueChange={id => {
                  if (!id) return;
                  const emp = employees.find(e => e.id === id);
                  const basic = String(emp?.basicSalary ?? "");
                  const gosi = calcGosiPreview(parseFloat(basic || "0"), emp?.nationality ?? "non_saudi");
                  const allowancesDefault = emp
                    ? String((emp.housingAllowance ?? 0) + (emp.transportAllowance ?? 0) + (emp.otherAllowance ?? 0))
                    : "0";
                  setForm({ ...form, employeeId: id, basicSalary: basic, allowances: allowancesDefault,
                    gosiEmployee: String(gosi.gosiEmployee), gosiEmployer: String(gosi.gosiEmployer) });
                }}>
                  <SelectTrigger><SelectValue placeholder={t("اختر موظف")} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* الشهر والسنة */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("الشهر")}</Label>
                <Select value={form.month} onValueChange={v => setForm({ ...form, month: v ?? form.month })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("السنة")}</Label>
                <Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>

            {/* الراتب الأساسي والبدلات */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("الراتب الأساسي")}</Label>
                <Input type="number" value={form.basicSalary} onChange={e => {
                  const basic = e.target.value;
                  const nat = selectedEmp?.nationality ?? "non_saudi";
                  const gosi = calcGosiPreview(parseFloat(basic || "0"), nat);
                  setForm({ ...form, basicSalary: basic,
                    gosiEmployee: String(gosi.gosiEmployee), gosiEmployer: String(gosi.gosiEmployer) });
                }} />
              </div>
              <div className="space-y-1">
                <Label>{t("البدلات")}</Label>
                <Input type="number" value={form.allowances}
                  onChange={e => setForm({ ...form, allowances: e.target.value })} />
                {/* تلميح بدلات الموظف */}
                {selectedEmp && defaultAllowances > 0 && (
                  <p className="text-[10px] text-blue-500 mt-0.5">
                    من ملف الموظف:
                    {(selectedEmp.housingAllowance ?? 0) > 0 && ` سكن ${(selectedEmp.housingAllowance ?? 0).toLocaleString("ar-SA")}`}
                    {(selectedEmp.transportAllowance ?? 0) > 0 && ` + نقل ${(selectedEmp.transportAllowance ?? 0).toLocaleString("ar-SA")}`}
                    {(selectedEmp.otherAllowance ?? 0) > 0 && ` + أخرى ${(selectedEmp.otherAllowance ?? 0).toLocaleString("ar-SA")}`}
                    {" "}
                    <button type="button" className="underline" onClick={() => setForm({ ...form, allowances: String(defaultAllowances) })}>
                      تطبيق
                    </button>
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>{t("الخصومات")}</Label>
                <Input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} />
                {/* تلميح الخصومات الثابتة */}
                {selectedEmp && (() => {
                  const activeRules = deductionRules.filter(
                    r => r.isActive && (r.totalMonths === 0 || r.appliedMonths < r.totalMonths)
                      && (r.employeeId === null || r.employeeId === selectedEmp.id)
                  );
                  if (activeRules.length === 0) return null;
                  const basicNum = parseFloat(form.basicSalary || "0");
                  const total = activeRules.reduce((sum, r) => {
                    return sum + (r.type === "percentage"
                      ? Math.round(basicNum * (r.amount / 100) * 100) / 100
                      : r.amount);
                  }, 0);
                  return (
                    <p className="text-[10px] text-rose-500 mt-0.5">
                      خصومات ثابتة:
                      {activeRules.map(r => ` ${r.name} ${r.type === "percentage" ? `${r.amount}%` : `${r.amount} ر.س`}`).join(" ·")}
                      {" "}= {total.toLocaleString("ar-SA")} ر.س
                      {" "}
                      <button type="button" className="underline"
                        onClick={() => setForm({ ...form, deductions: String(total) })}>
                        تطبيق
                      </button>
                    </p>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <Label>{t("المكافآت")}</Label>
                <Input type="number" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("أجر إضافي")}</Label>
                <Input type="number" value={form.overtimePay} onChange={e => setForm({ ...form, overtimePay: e.target.value })} />
              </div>
            </div>

            {/* GOSI */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t("التأمينات الاجتماعية — GOSI")}</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${selectedEmp?.nationality === "saudi" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {selectedEmp?.nationality === "saudi" ? "🇸🇦 سعودي" : "غير سعودي"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* نصيب الموظف — يُخصم */}
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                    نصيب الموظف
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">للعرض فقط</span>
                  </Label>
                  <Input type="number" value={form.gosiEmployee}
                    placeholder={String(gosiPreview.gosiEmployee)}
                    onChange={e => setForm({ ...form, gosiEmployee: e.target.value })}
                    className="bg-white border-teal-200" />
                  <p className="text-[10px] text-teal-600">
                    {selectedEmp?.nationality === "saudi" ? "9% من الأساسي" : "غير مطبّق على غير السعوديين"}
                  </p>
                </div>

                {/* نصيب صاحب العمل — لا يُخصم */}
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                    نصيب صاحب العمل
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">تكلفة الشركة</span>
                  </Label>
                  <Input type="number" value={form.gosiEmployer}
                    placeholder={String(gosiPreview.gosiEmployer)}
                    onChange={e => setForm({ ...form, gosiEmployer: e.target.value })}
                    className="bg-white border-teal-200" />
                  <p className="text-[10px] text-teal-600">
                    {selectedEmp?.nationality === "saudi" ? "9% من الأساسي" : "2% من الأساسي"}
                  </p>
                </div>
              </div>

              {/* ملاحظة توضيحية */}
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg px-3 py-2 text-[11px] text-teal-700 dark:text-teal-400">
                💡 GOSI يُعرض للإحصاء ولا يؤثر على الصافي · نصيب صاحب العمل <strong>تدفعه الشركة مستقلاً</strong>
              </div>
            </div>

            {/* ملاحظات + الصافي */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("ملاحظات")}</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1 flex items-end">
                <div className="w-full bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-3 text-center border border-green-200 dark:border-green-800">
                  <p className="text-xs text-gray-500 mb-1">{t("الصافي المتوقع")}</p>
                  <p className="text-2xl font-black text-green-700 dark:text-green-400">{net.toLocaleString("ar-SA")}</p>
                  <p className="text-xs text-gray-400">ر.س</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء")}</Button>
            <Button onClick={saveSalary} disabled={saving || (!editId && !form.employeeId) || !form.basicSalary}>
              {saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t("جارٍ الحفظ...")}</> : t("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
