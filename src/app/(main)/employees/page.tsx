"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/lang-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Pencil, Trash2, Eye, User, Briefcase, CreditCard, MapPin, Camera, Users, Crown, Building2, TrendingUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import { EmployeeAvatar } from "@/components/employee-avatar";

type Department = { id: string; name: string };
type WorkLocation = { id: string; name: string; active: boolean };

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  arabicName?: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  position: string;
  managerId?: string | null;
  department?: string;
  status: string;
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  startDate: string;
  employmentType: string;
  nationality?: string;
  iqamaExpiry?: string | null;
  workLocationId?: string | null;
  photo?: string | null;
};

const positionLabel: Record<string, string> = {
  manager: "مدير",
  supervisor: "مشرف",
  employee: "موظف",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  arabicName: "",
  email: "",
  phone: "",
  nationalId: "",
  birthDate: "",
  gender: "",
  maritalStatus: "",
  address: "",
  city: "",
  jobTitle: "",
  position: "",
  managerId: "",
  department: "",
  employmentType: "full_time",
  startDate: "",
  contractDuration: "",   // بالسنوات
  endDate: "",
  noticePeriodDays: "60", // شهرين افتراضي
  basicSalary: "",
  housingAllowance: "",
  transportAllowance: "",
  otherAllowance: "",
  bankName: "",
  iban: "",
  nationality: "saudi",
  iqamaExpiry: "",
  workLocationId: "",
};

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "نشط", variant: "default" },
  inactive: { label: "غير نشط", variant: "secondary" },
  terminated: { label: "منتهي", variant: "destructive" },
  on_leave: { label: "إجازة", variant: "outline" },
};

export default function EmployeesPage() {
  const { t } = useLang();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;


  const managers = employees.filter(e => e.position === "manager");

  const fetchDepartments = async () => {
    const res = await fetch("/api/departments");
    const data = await res.json();
    setDepartments(Array.isArray(data) ? data : []);
  };

  const fetchEmployees = async (p = page, q = search) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (q) params.set("search", q);
    const res = await fetch(`/api/employees?${params}`);
    const data = await res.json();
    if (data.data) {
      setEmployees(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } else {
      setEmployees(Array.isArray(data) ? data : []);
    }
  };

  // جلب المديرين منفصلاً للـ dropdown (بدون pagination)
  const [allManagers, setAllManagers] = useState<Employee[]>([]);
  useEffect(() => {
    fetch("/api/employees?all=1").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : (d.data ?? []);
      setAllManagers(list.filter((e: Employee) => e.position === "manager"));
    });
  }, []);

  useEffect(() => {
    fetchEmployees(1, search);
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchEmployees(page, search);
  }, [page]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetch("/api/locations").then(r => r.json()).then(d => setWorkLocations(Array.isArray(d) ? d : []));
  }, []);

  const filtered = employees; // الفلترة صارت server-side

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      arabicName: emp.arabicName ?? "",
      email: emp.email,
      phone: emp.phone ?? "",
      nationalId: "",
      birthDate: "",
      gender: "",
      maritalStatus: "",
      address: "",
      city: "",
      jobTitle: emp.jobTitle ?? "",
      position: emp.position ?? "employee",
      managerId: emp.managerId ?? "",
      department: emp.department ?? "",
      employmentType: emp.employmentType,
      startDate: emp.startDate?.slice(0, 10) ?? "",
      contractDuration: String((emp as any).contractDuration ?? ""),
      endDate: (emp as any).endDate ? (emp as any).endDate.slice(0, 10) : "",
      noticePeriodDays: String((emp as any).noticePeriodDays ?? "60"),
      basicSalary: String(emp.basicSalary),
      housingAllowance: String((emp as any).housingAllowance ?? ""),
      transportAllowance: String((emp as any).transportAllowance ?? ""),
      otherAllowance: String((emp as any).otherAllowance ?? ""),
      bankName: (emp as any).bankName ?? "",
      iban: (emp as any).iban ?? "",
      nationality: emp.nationality ?? "saudi",
      iqamaExpiry: emp.iqamaExpiry ? emp.iqamaExpiry.slice(0, 10) : "",
      workLocationId: emp.workLocationId ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName || !form.lastName || !form.email) {
      setError(t("الاسم الأول واسم العائلة والبريد الإلكتروني مطلوبة"));
      return;
    }
    if (!form.position) {
      setError(t("يرجى تحديد منصب الموظف"));
      return;
    }
    setLoading(true);
    const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("حدث خطأ أثناء الحفظ، حاول مجدداً"));
      return;
    }
    setOpen(false);
    fetchEmployees();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("هل أنت متأكد من حذف هذا الموظف؟"))) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  };

  // ─── عرض الفورم كصفحة كاملة ───────────────────────────────
  if (open) {
    const total = (parseFloat(form.basicSalary) || 0) + (parseFloat(form.housingAllowance) || 0) + (parseFloat(form.transportAllowance) || 0) + (parseFloat(form.otherAllowance) || 0);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* شريط العنوان العلوي */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editing ? "bg-sky-100 dark:bg-sky-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                {editing ? <Pencil className="h-5 w-5 text-sky-600" /> : <UserPlus className="h-5 w-5 text-green-600" />}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editing ? t("تعديل بيانات الموظف") : t("إضافة موظف جديد")}
                </h1>
                {editing && <p className="text-xs text-gray-500">{editing.firstName} {editing.lastName} · {editing.employeeNumber}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>}
              <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء")}</Button>
              <Button onClick={handleSubmit} disabled={loading} className="min-w-28">
                {loading ? t("جارٍ الحفظ...") : editing ? t("حفظ التغييرات") : t("إضافة الموظف")}
              </Button>
            </div>
          </div>
        </div>

        {/* المحتوى */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* ── بطاقة 1: البيانات الشخصية ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-sky-50 dark:bg-sky-900/20 border-b border-sky-100 dark:border-sky-800 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white">{t("البيانات الشخصية")}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("الاسم الأول")} <span className="text-red-500">*</span></Label>
                  <Input className="h-11" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("اسم العائلة")} <span className="text-red-500">*</span></Label>
                  <Input className="h-11" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الاسم بالعربي</Label>
                  <Input className="h-11" value={form.arabicName} onChange={e => setForm({...form, arabicName: e.target.value})} />
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                  <Label className="text-sm font-medium">البريد الإلكتروني <span className="text-red-500">*</span></Label>
                  <Input className="h-11" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">رقم الهاتف</Label>
                  <Input className="h-11" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">رقم الهوية</Label>
                  <Input className="h-11" value={form.nationalId} onChange={e => setForm({...form, nationalId: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">تاريخ الميلاد</Label>
                  <Input className="h-11" type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الجنس</Label>
                  <Select value={form.gender} onValueChange={v => setForm({...form, gender: v ?? ""})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الحالة الاجتماعية</Label>
                  <Select value={form.maritalStatus} onValueChange={v => setForm({...form, maritalStatus: v ?? ""})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">أعزب</SelectItem>
                      <SelectItem value="married">متزوج</SelectItem>
                      <SelectItem value="divorced">مطلق</SelectItem>
                      <SelectItem value="widowed">أرمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الجنسية</Label>
                  <Select value={form.nationality} onValueChange={v => setForm({...form, nationality: v ?? "saudi", iqamaExpiry: v === "saudi" ? "" : form.iqamaExpiry})}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saudi">سعودي</SelectItem>
                      <SelectItem value="non_saudi">غير سعودي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.nationality === "non_saudi" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">تاريخ انتهاء الإقامة</Label>
                    <Input className="h-11" type="date" value={form.iqamaExpiry} onChange={e => setForm({...form, iqamaExpiry: e.target.value})} />
                  </div>
                )}
              </div>
            </div>

            {/* ── بطاقة 2: البيانات الوظيفية ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white">البيانات الوظيفية</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المنصب <span className="text-red-500">*</span></Label>
                  <Select value={form.position} onValueChange={v => setForm({...form, position: v ?? ""})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">مدير</SelectItem>
                      <SelectItem value="supervisor">مشرف</SelectItem>
                      <SelectItem value="employee">موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المسمى الوظيفي</Label>
                  <Input className="h-11" value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">القسم</Label>
                  <Select value={form.department} onValueChange={v => setForm({...form, department: v === "none" ? "" : (v ?? "")})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون قسم</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">المدير المباشر</Label>
                  <Select value={form.managerId} onValueChange={v => setForm({...form, managerId: v === "none" ? "" : (v ?? "")})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="بدون مدير" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مدير</SelectItem>
                      {allManagers.filter(m => m.id !== editing?.id).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} — {positionLabel[m.position] ?? m.position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">نوع التوظيف</Label>
                  <Select value={form.employmentType} onValueChange={v => setForm({...form, employmentType: v ?? "full_time"})}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">دوام كامل</SelectItem>
                      <SelectItem value="part_time">دوام جزئي</SelectItem>
                      <SelectItem value="contract">عقد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">تاريخ المباشرة</Label>
                  <Input className="h-11" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>

                {/* ── حقول العقد ── */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">مدة العقد</Label>
                  <Select
                    value={["1","2",""].includes(form.contractDuration) ? form.contractDuration : "custom"}
                    onValueChange={v => {
                      if (!v || v === "custom") return;
                      const dur = v === "" ? "" : v;
                      // احسب تاريخ الانتهاء تلقائياً
                      let endDate = form.endDate;
                      if (v && form.startDate) {
                        const d = new Date(form.startDate);
                        d.setFullYear(d.getFullYear() + parseFloat(v));
                        endDate = d.toISOString().slice(0, 10);
                      }
                      setForm({...form, contractDuration: dur, endDate});
                    }}
                  >
                    <SelectTrigger className="h-11"><SelectValue placeholder="اختر المدة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون تحديد</SelectItem>
                      <SelectItem value="1">سنة واحدة</SelectItem>
                      <SelectItem value="2">سنتان</SelectItem>
                      <SelectItem value="custom">مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* إدخال مخصص لمدة العقد */}
                {!["","1","2"].includes(form.contractDuration) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">عدد السنوات</Label>
                    <Input className="h-11" type="number" min="0.5" step="0.5" placeholder="مثال: 3"
                      value={form.contractDuration}
                      onChange={e => {
                        const v = e.target.value;
                        let endDate = form.endDate;
                        if (v && form.startDate) {
                          const d = new Date(form.startDate);
                          d.setFullYear(d.getFullYear() + parseFloat(v));
                          endDate = d.toISOString().slice(0, 10);
                        }
                        setForm({...form, contractDuration: v, endDate});
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">تاريخ انتهاء العقد</Label>
                  <Input className="h-11" type="date" value={form.endDate}
                    onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">فترة الإشعار قبل الإفساخ</Label>
                  <Select value={["30","60","90"].includes(form.noticePeriodDays) ? form.noticePeriodDays : "custom"}
                    onValueChange={v => v && v !== "custom" && setForm({...form, noticePeriodDays: v})}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">شهر واحد (30 يوم)</SelectItem>
                      <SelectItem value="60">شهران (60 يوم)</SelectItem>
                      <SelectItem value="90">3 أشهر (90 يوم)</SelectItem>
                      <SelectItem value="custom">مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!["30","60","90"].includes(form.noticePeriodDays) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">عدد أيام الإشعار</Label>
                    <Input className="h-11" type="number" min="1" placeholder="60"
                      value={form.noticePeriodDays}
                      onChange={e => setForm({...form, noticePeriodDays: e.target.value})} />
                  </div>
                )}

                {workLocations.length > 0 && (
                  <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                    <Label className="text-sm font-medium">موقع العمل / الفرع</Label>
                    <Select value={form.workLocationId} onValueChange={v => setForm({...form, workLocationId: v === "none" ? "" : (v ?? "")})}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر (اختياري)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون موقع محدد</SelectItem>
                        {workLocations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* ── بطاقة 3: البيانات المالية ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{t("البيانات المالية")}</h2>
                </div>
                {total > 0 && (
                  <div className="text-left">
                    <p className="text-xs text-emerald-600">{t("إجمالي الراتب")}</p>
                    <p className="text-lg font-black text-emerald-700">{total.toLocaleString("ar-SA")} {t("ر.س")}</p>
                  </div>
                )}
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("الراتب الأساسي")} ({t("ر.س")})</Label>
                  <Input className="h-11" type="number" min="0" placeholder="0" value={form.basicSalary} onChange={e => setForm({...form, basicSalary: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("بدل السكن")} ({t("ر.س")})</Label>
                  <Input className="h-11" type="number" min="0" placeholder="0" value={form.housingAllowance} onChange={e => setForm({...form, housingAllowance: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("بدل المواصلات")} ({t("ر.س")})</Label>
                  <Input className="h-11" type="number" min="0" placeholder="0" value={form.transportAllowance} onChange={e => setForm({...form, transportAllowance: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("بدل أخرى")} ({t("ر.س")})</Label>
                  <Input className="h-11" type="number" min="0" placeholder="0" value={form.otherAllowance} onChange={e => setForm({...form, otherAllowance: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("اسم البنك")}</Label>
                  <Input className="h-11" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} placeholder="مثال: بنك الراجحي" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("رقم الآيبان")} (IBAN)</Label>
                  <Input className="h-11 text-left font-mono" dir="ltr" value={form.iban} onChange={e => setForm({...form, iban: e.target.value.toUpperCase()})} placeholder="SA00000000000000000000" />
                </div>
              </div>
            </div>

            {/* ── بطاقة 4: العنوان ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white">العنوان</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label className="text-sm font-medium">العنوان</Label>
                  <Input className="h-11" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المدينة</Label>
                  <Input className="h-11" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
              </div>
            </div>

          </div>

          {/* زر الحفظ في الأسفل */}
          <div className="mt-8 flex justify-end gap-3 pb-8">
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>{t("إلغاء")}</Button>
            <Button size="lg" onClick={handleSubmit} disabled={loading} className="min-w-40">
              {loading ? t("جارٍ الحفظ...") : editing ? t("حفظ التغييرات") : t("إضافة الموظف")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── إحصاءات سريعة ───────────────────────
  const activeCount   = employees.filter(e => e.status === "active").length;
  const managersCount = employees.filter(e => e.position === "manager").length;
  const deptsCount    = new Set(employees.map(e => e.department).filter(Boolean)).size;

  return (
    <div className="p-3 sm:p-6 space-y-5 sm:space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient shadow-brand-lg p-5 sm:p-7">
        <div className="pattern-islamic absolute inset-0 opacity-[0.18]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-white animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-medium tracking-wide">إدارة الموارد البشرية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t("الموظفون")}</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">
              {t("استعرض، أدِر، وابحث في بيانات فريقك بكل سهولة")}
            </p>
          </div>

          <button
            onClick={openAdd}
            className="group relative inline-flex items-center gap-2 bg-white text-brand-primary hover:bg-white/95 font-bold px-5 h-11 rounded-xl shadow-soft transition-all hover:shadow-brand hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm">{t("إضافة موظف")}</span>
          </button>
        </div>

        {/* ─── إحصاءات ─── */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-5 stagger">
          {[
            { icon: Users,       label: t("إجمالي"),   value: total || employees.length, color: "from-amber-300 to-amber-500" },
            { icon: TrendingUp,  label: t("نشط"),      value: activeCount,               color: "from-emerald-300 to-emerald-500" },
            { icon: Crown,       label: t("مديرون"),  value: managersCount,             color: "from-sky-300 to-sky-500" },
            { icon: Building2,   label: t("أقسام"),   value: deptsCount,                 color: "from-violet-300 to-violet-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-soft`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] text-white/80 tracking-wide">{label}</p>
                <p className="text-base sm:text-lg font-black text-white leading-none mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── شريط البحث ─── */}
      <div className="relative">
        <div className="absolute inset-0 bg-brand-gradient-soft rounded-2xl opacity-50 blur-xl -z-10" />
        <div className="relative glass-strong rounded-2xl border border-brand-border p-1.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
            <Input
              placeholder={t("بحث بالاسم أو البريد أو الرقم...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-brand-muted hover:text-brand-primary px-3 h-8 rounded-lg hover:bg-brand-primary/5 transition-colors"
            >
              {t("إلغاء")}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/40 border border-brand-border backdrop-blur-sm">
          <div className="pattern-dots absolute inset-0 opacity-40" />
          <div className="relative py-16 sm:py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gradient-soft ring-1 ring-brand-border mb-4 animate-float">
              <Users className="h-8 w-8 text-brand-primary" />
            </div>
            <h3 className="text-base font-bold text-brand-ink">
              {search ? t("لا توجد نتائج للبحث") : t("لا يوجد موظفون بعد")}
            </h3>
            <p className="text-sm text-brand-muted mt-1.5 max-w-sm mx-auto">
              {search ? t("جرّب كلمات بحث مختلفة") : t("ابدأ ببناء فريقك — أضف أول موظف الآن")}
            </p>
            {!search && (
              <button
                onClick={openAdd}
                className="btn-brand inline-flex items-center gap-2 mt-5 px-5 h-10 rounded-xl text-sm"
              >
                <UserPlus className="h-4 w-4" />
                {t("إضافة موظف")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ─── عرض بطاقات على الجوال ─── */}
          <div className="sm:hidden space-y-2.5 stagger">
            {filtered.map((emp) => (
              <div
                key={emp.id}
                onClick={() => router.push(`/employees/${emp.id}`)}
                className="card-brand group cursor-pointer active:scale-[0.98] transition-all p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <EmployeeAvatar photo={emp.photo} firstName={emp.firstName} lastName={emp.lastName} size="md" />
                      {emp.position === "manager" && (
                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                          <Crown className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-ink truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">
                        {emp.jobTitle ?? emp.department ?? ""} · <span className="font-mono">{emp.employeeNumber}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={statusLabel[emp.status]?.variant ?? "secondary"} className="text-[10px] px-1.5 py-0">
                      {statusLabel[emp.status]?.label ?? emp.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-brand-primary/10" onClick={(e) => { e.stopPropagation(); openEdit(emp); }}>
                      <Pencil className="h-3 w-3 text-brand-primary" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── جدول على الشاشات الكبيرة ─── */}
          <div className="hidden sm:block relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-brand-border backdrop-blur-sm shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-gradient-soft border-b border-brand-border">
                  <tr>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("الرقم")}</th>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("الاسم")}</th>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("المسمى الوظيفي")}</th>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("القسم")}</th>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("الراتب")}</th>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("الحالة")}</th>
                    <th className="text-right px-4 py-3.5 font-bold text-brand-ink text-xs tracking-wide uppercase">{t("إجراءات")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="group hover:bg-brand-primary/[0.03] dark:hover:bg-brand-primary/[0.05] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-brand-muted">
                        <span className="inline-block px-2 py-1 bg-brand-gradient-soft rounded-md">{emp.employeeNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <EmployeeAvatar photo={emp.photo} firstName={emp.firstName} lastName={emp.lastName} size="sm" />
                            {emp.position === "manager" && (
                              <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                                <Crown className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-brand-ink">{emp.firstName} {emp.lastName}</div>
                            {emp.arabicName && <div className="text-xs text-brand-muted">{emp.arabicName}</div>}
                            <div className="text-[11px] text-brand-muted/80">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-brand-ink/80">{emp.jobTitle ?? "—"}</td>
                      <td className="px-4 py-3">
                        {emp.department ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-brand-ink/80">
                            <Building2 className="h-3 w-3 text-brand-primary" />
                            {emp.department}
                          </span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const total = emp.basicSalary + ((emp as any).housingAllowance || 0) + ((emp as any).transportAllowance || 0) + ((emp as any).otherAllowance || 0);
                          return (
                            <span className="font-bold text-brand-ink">
                              {total.toLocaleString("ar-SA")}
                              <span className="text-[10px] text-brand-muted font-normal mr-1">{t("ر.س")}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusLabel[emp.status]?.variant ?? "secondary"}>
                          {statusLabel[emp.status]?.label ?? emp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-sky-100 dark:hover:bg-sky-900/30" onClick={() => router.push(`/employees/${emp.id}`)} title={t("عرض الملف")}>
                            <Eye className="h-4 w-4 text-sky-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-brand-primary/10" onClick={() => openEdit(emp)}>
                            <Pencil className="h-4 w-4 text-brand-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => handleDelete(emp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-brand-border/60 bg-brand-gradient-soft/30">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </div>
        </>
      )}

      {/* Dialog محذوف — الفورم أصبح صفحة كاملة أعلاه */}
      <Dialog open={false} onOpenChange={setOpen}>
        <DialogContent className="hidden">
          <DialogHeader className="hidden">
            <DialogTitle className="text-lg flex items-center gap-2">
              {editing ? <Pencil className="h-5 w-5 text-sky-600" /> : <UserPlus className="h-5 w-5 text-sky-600" />}
              {editing ? t("تعديل بيانات الموظف") : t("إضافة موظف جديد")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* === العمود الأيسر: القسم 1 + القسم 2 === */}
            <div className="border-b lg:border-b-0 lg:border-l border-gray-100 dark:border-gray-700">
              {/* === القسم 1: البيانات الشخصية === */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-sky-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("البيانات الشخصية")}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("الاسم الأول")} <span className="text-red-500">*</span></Label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("اسم العائلة")} <span className="text-red-500">*</span></Label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>الاسم بالعربي</Label>
                    <Input value={form.arabicName} onChange={(e) => setForm({ ...form, arabicName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>البريد الإلكتروني <span className="text-red-500">*</span></Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>رقم الهاتف</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>رقم الهوية</Label>
                    <Input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>تاريخ الميلاد</Label>
                    <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>الجنس</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v ?? "" })}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>الحالة الاجتماعية</Label>
                    <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v ?? "" })}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">أعزب</SelectItem>
                        <SelectItem value="married">متزوج</SelectItem>
                        <SelectItem value="divorced">مطلق</SelectItem>
                        <SelectItem value="widowed">أرمل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>الجنسية</Label>
                    <Select value={form.nationality} onValueChange={(v) => setForm({ ...form, nationality: v ?? "saudi", iqamaExpiry: v === "saudi" ? "" : form.iqamaExpiry })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saudi">سعودي</SelectItem>
                        <SelectItem value="non_saudi">غير سعودي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.nationality === "non_saudi" && (
                    <div className="space-y-1">
                      <Label>تاريخ انتهاء الإقامة</Label>
                      <Input type="date" value={form.iqamaExpiry} onChange={(e) => setForm({ ...form, iqamaExpiry: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />

              {/* === القسم 2: البيانات الوظيفية === */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">البيانات الوظيفية</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>المنصب <span className="text-red-500">*</span></Label>
                    <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v ?? "" })}>
                      <SelectTrigger><SelectValue placeholder="اختر المنصب" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">مدير</SelectItem>
                        <SelectItem value="supervisor">مشرف</SelectItem>
                        <SelectItem value="employee">موظف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>المسمى الوظيفي</Label>
                    <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>القسم</Label>
                    <Select value={form.department} onValueChange={v => setForm({ ...form, department: v === "none" ? "" : (v ?? "") })}>
                      <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون قسم</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>المدير المباشر</Label>
                    <Select value={form.managerId} onValueChange={(v) => setForm({ ...form, managerId: v === "none" ? "" : (v ?? "") })}>
                      <SelectTrigger><SelectValue placeholder="بدون مدير" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مدير</SelectItem>
                        {allManagers.filter(m => m.id !== editing?.id).map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.firstName} {m.lastName} — {positionLabel[m.position] ?? m.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>نوع التوظيف</Label>
                    <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v ?? "full_time" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">دوام كامل</SelectItem>
                        <SelectItem value="part_time">دوام جزئي</SelectItem>
                        <SelectItem value="contract">عقد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>تاريخ المباشرة</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  {workLocations.length > 0 && (
                    <div className="space-y-1 col-span-2">
                      <Label>موقع العمل / الفرع</Label>
                      <Select value={form.workLocationId} onValueChange={(v) => setForm({ ...form, workLocationId: v === "none" ? "" : (v ?? "") })}>
                        <SelectTrigger><SelectValue placeholder="اختر (اختياري)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون موقع محدد</SelectItem>
                          {workLocations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === العمود الأيمن: القسم 3 + القسم 4 === */}
            <div>
              {/* === القسم 3: البيانات المالية === */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("البيانات المالية")}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <Label>{t("الراتب الأساسي")} ({t("ر.س")})</Label>
                    <Input type="number" min="0" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("بدل السكن")} ({t("ر.س")})</Label>
                    <Input type="number" min="0" value={form.housingAllowance} onChange={(e) => setForm({ ...form, housingAllowance: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("بدل المواصلات")} ({t("ر.س")})</Label>
                    <Input type="number" min="0" value={form.transportAllowance} onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("بدل أخرى")} ({t("ر.س")})</Label>
                    <Input type="number" min="0" value={form.otherAllowance} onChange={(e) => setForm({ ...form, otherAllowance: e.target.value })} placeholder="0" />
                  </div>
                  {/* إجمالي الراتب */}
                  {(() => {
                    const total = (parseFloat(form.basicSalary) || 0) + (parseFloat(form.housingAllowance) || 0) + (parseFloat(form.transportAllowance) || 0) + (parseFloat(form.otherAllowance) || 0);
                    return total > 0 ? (
                      <div className="col-span-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{t("إجمالي الراتب")}</span>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {total.toLocaleString("ar-SA")} {t("ر.س")}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <div className="space-y-1">
                    <Label>{t("اسم البنك")}</Label>
                    <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="مثال: بنك الراجحي" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("رقم الآيبان")} (IBAN)</Label>
                    <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} placeholder="SA0000000000000000000000" dir="ltr" className="text-left font-mono" />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />

              {/* === القسم 4: العنوان === */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">العنوان</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>العنوان</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>المدينة</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "جارٍ الحفظ..." : editing ? "حفظ التغييرات" : "إضافة الموظف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
