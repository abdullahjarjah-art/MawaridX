"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  Phone,
  Crown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Calendar,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type Company = {
  id: string;
  name: string;
  commercialReg?: string | null;
  adminEmail: string;
  adminName?: string | null;
  phone?: string | null;
  plan: string;
  maxEmployees: number;
  status: string;
  notes?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

const emptyForm = {
  name: "",
  commercialReg: "",
  adminEmail: "",
  adminName: "",
  adminPassword: "",
  phone: "",
  plan: "trial",
  maxEmployees: "10",
  status: "active",
  notes: "",
};

const planLabels: Record<string, { label: string; color: string }> = {
  trial: { label: "تجربة", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  basic: { label: "البداية", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  growth: { label: "النمو", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
  business: { label: "الأعمال", color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
  enterprise: { label: "مؤسسي", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "نشطة", variant: "default" },
  suspended: { label: "معلّقة", variant: "destructive" },
  expired: { label: "منتهية", variant: "secondary" },
};

const planMaxEmployees: Record<string, number> = {
  trial: 10,
  basic: 25,
  growth: 75,
  business: 200,
  enterprise: 1000,
};

export default function CompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchCompanies = async () => {
    const res = await fetch("/api/super-admin/companies");
    const data = await res.json();
    setCompanies(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      openAdd();
      router.replace("/super-admin/companies");
    }
  }, [searchParams, router]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name: company.name,
      commercialReg: company.commercialReg ?? "",
      adminEmail: company.adminEmail,
      adminName: company.adminName ?? "",
      adminPassword: "",
      phone: company.phone ?? "",
      plan: company.plan,
      maxEmployees: String(company.maxEmployees),
      status: company.status,
      notes: company.notes ?? "",
    });
    setError("");
    setOpen(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.adminEmail) {
      setError("اسم الشركة وإيميل المدير مطلوبة");
      return;
    }
    if (!editing && !form.adminPassword) {
      setError("كلمة المرور مطلوبة عند إنشاء شركة جديدة");
      return;
    }

    setSubmitting(true);
    const url = editing
      ? `/api/super-admin/companies/${editing.id}`
      : "/api/super-admin/companies";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSubmitting(false);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "حدث خطأ أثناء الحفظ");
      return;
    }

    setSuccess(editing ? "تم تحديث الشركة ✓" : "تم إنشاء الشركة بنجاح ✓");
    setTimeout(() => setSuccess(""), 3000);
    setOpen(false);
    fetchCompanies();
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`هل أنت متأكد من حذف شركة "${company.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }
    const res = await fetch(`/api/super-admin/companies/${company.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchCompanies();
      setSuccess("تم حذف الشركة ✓");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const filtered = companies.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.adminEmail.toLowerCase().includes(q) ||
      (c.adminName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient shadow-brand-lg p-5 sm:p-7">
        <div className="pattern-islamic absolute inset-0 opacity-[0.18]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-white animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-gold-gradient rounded-full px-3 py-1 mb-3 shadow-gold">
              <Crown className="h-3.5 w-3.5 text-white" />
              <span className="text-[11px] font-bold tracking-wide">إدارة العملاء</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">الشركات المشتركة</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">
              {companies.length} شركة مسجّلة · أدر الاشتراكات والحسابات
            </p>
          </div>

          <button
            onClick={openAdd}
            className="group inline-flex items-center gap-2 bg-white text-brand-primary font-bold px-5 h-11 rounded-xl shadow-soft transition-all hover:shadow-brand hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm">إضافة شركة</span>
          </button>
        </div>
      </div>

      {/* رسالة نجاح */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl animate-fade-up">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* شريط البحث */}
      <div className="relative">
        <div className="glass-strong rounded-2xl border border-brand-border p-1.5">
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
            <Input
              placeholder="بحث باسم الشركة أو الإيميل..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10 h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
            />
          </div>
        </div>
      </div>

      {/* قائمة الشركات */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-brand h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/40 border border-brand-border backdrop-blur-sm">
          <div className="pattern-dots absolute inset-0 opacity-40" />
          <div className="relative py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gradient-soft ring-1 ring-brand-border mb-4 animate-float">
              <Building2 className="h-8 w-8 text-brand-primary" />
            </div>
            <h3 className="text-base font-bold text-brand-ink">
              {search ? "لا توجد نتائج للبحث" : "لم تضف أي شركة بعد"}
            </h3>
            <p className="text-sm text-brand-muted mt-1.5">
              {search ? "جرّب كلمات بحث مختلفة" : "ابدأ بإضافة أول عميل لك"}
            </p>
            {!search && (
              <button
                onClick={openAdd}
                className="btn-brand inline-flex items-center gap-2 mt-5 px-5 h-10 rounded-xl text-sm"
              >
                <Plus className="h-4 w-4" />
                إضافة شركة
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 stagger">
          {filtered.map(company => (
            <div
              key={company.id}
              className="card-brand group p-4 sm:p-5 relative overflow-hidden"
            >
              <div className={`absolute top-0 inset-x-0 h-1 bg-brand-gradient`} />

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* الاسم والمعلومات الأساسية */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-brand shrink-0">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-brand-ink truncate">
                        {company.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${planLabels[company.plan]?.color ?? ""}`}>
                        {planLabels[company.plan]?.label ?? company.plan}
                      </span>
                      <Badge variant={statusLabels[company.status]?.variant ?? "secondary"} className="text-[10px]">
                        {statusLabels[company.status]?.label ?? company.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-brand-muted">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {company.adminEmail}
                      </span>
                      {company.adminName && (
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          {company.adminName}
                        </span>
                      )}
                      {company.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {company.phone}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        حد أقصى {company.maxEmployees} موظف
                      </span>
                      {company.expiresAt && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          ينتهي {new Date(company.expiresAt).toLocaleDateString("ar-SA")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* إجراءات */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-brand-primary/10"
                    onClick={() => openEdit(company)}
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4 text-brand-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => handleDelete(company)}
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog إضافة/تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-brand">
                {editing ? (
                  <Pencil className="h-5 w-5 text-white" />
                ) : (
                  <Sparkles className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <div className="font-black">
                  {editing ? "تعديل بيانات الشركة" : "إضافة شركة جديدة"}
                </div>
                <p className="text-xs text-brand-muted font-normal mt-0.5">
                  {editing ? company_name(editing) : "سجّل عميلاً جديداً في MawaridX"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-3">
            {/* القسم 1: بيانات الشركة */}
            <div>
              <h3 className="text-sm font-bold text-brand-ink mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-gradient-soft flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-brand-primary" />
                </div>
                بيانات الشركة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    اسم الشركة <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="شركة الراشد التجارية"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">السجل التجاري</Label>
                  <Input
                    placeholder="1010XXXXXX"
                    value={form.commercialReg}
                    onChange={e => setForm({ ...form, commercialReg: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">الجوال</Label>
                  <Input
                    placeholder="+9665XXXXXXXX"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* القسم 2: حساب الأدمن */}
            <div>
              <h3 className="text-sm font-bold text-brand-ink mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gold-gradient flex items-center justify-center">
                  <Crown className="h-3.5 w-3.5 text-white" />
                </div>
                حساب الأدمن
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">اسم الأدمن</Label>
                  <Input
                    placeholder="أحمد الراشد"
                    value={form.adminName}
                    onChange={e => setForm({ ...form, adminName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    إيميل الأدمن <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="hr@company.com"
                    value={form.adminEmail}
                    onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                    disabled={!!editing}
                    dir="ltr"
                  />
                </div>
                {!editing && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">
                      كلمة المرور <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="كلمة مرور قوية"
                        value={form.adminPassword}
                        onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                        className="pr-10 pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-primary"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-brand-muted">
                      الأدمن يستطيع تغييرها بعد تسجيل الدخول الأول
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* القسم 3: الاشتراك */}
            <div>
              <h3 className="text-sm font-bold text-brand-ink mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-gradient-soft flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
                </div>
                الاشتراك
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">خطة الاشتراك</Label>
                  <Select
                    value={form.plan}
                    onValueChange={v => {
                      const plan = v ?? "trial";
                      setForm({
                        ...form,
                        plan,
                        maxEmployees: String(planMaxEmployees[plan] ?? 10),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">تجربة — 14 يوم مجاناً</SelectItem>
                      <SelectItem value="basic">البداية — 299 ريال/شهر</SelectItem>
                      <SelectItem value="growth">النمو — 599 ريال/شهر</SelectItem>
                      <SelectItem value="business">الأعمال — 1299 ريال/شهر</SelectItem>
                      <SelectItem value="enterprise">مؤسسي — 2999 ريال/شهر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">الحد الأقصى للموظفين</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.maxEmployees}
                    onChange={e => setForm({ ...form, maxEmployees: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">الحالة</Label>
                  <Select
                    value={form.status}
                    onValueChange={v => setForm({ ...form, status: v ?? "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشطة</SelectItem>
                      <SelectItem value="suspended">معلّقة</SelectItem>
                      <SelectItem value="expired">منتهية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ملاحظات */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ملاحظات داخلية (اختياري)</Label>
              <textarea
                rows={2}
                placeholder="ملاحظات خاصة بك عن العميل..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-md border border-brand-border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              />
            </div>

            {/* خطأ */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="btn-brand min-w-32">
              {submitting
                ? "جارٍ الحفظ..."
                : editing
                ? "حفظ التغييرات"
                : "إنشاء الشركة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function company_name(c: Company) {
  return c.name;
}
