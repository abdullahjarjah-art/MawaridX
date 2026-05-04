"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText, Plus, Search, Download, Trash2, Edit2, Eye,
  Upload, Calendar, Users, Building2, User, ShieldCheck, AlertTriangle,
  Clock, File, FileCheck, FileSpreadsheet, Presentation, Image, FolderOpen,
  Bell, X, CheckCircle2,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";

// ── أنواع ──
type DocCategory = "policy" | "procedure" | "form" | "contract" | "regulation" | "hr" | "other";
type AccessLevel = "all" | "managers" | "department" | "specific";

type CompanyDoc = {
  id: string; title: string; description?: string; category: DocCategory;
  fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string;
  accessLevel: AccessLevel; accessDepts?: string; accessEmployeeIds?: string;
  expiryDate?: string; notifyDaysBefore: number;
  isActive: boolean; createdBy: string; creatorName?: string;
  downloadCount: number; createdAt: string; updatedAt: string;
};

type Employee = { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string };
type Department = { id: string; name: string };

// ── ثوابت ──
const CATEGORIES: { value: DocCategory; label: string; color: string; icon: React.ElementType }[] = [
  { value: "policy",     label: "سياسة",        color: "bg-blue-100 text-blue-700 border-blue-200",    icon: ShieldCheck },
  { value: "procedure",  label: "إجراء",         color: "bg-purple-100 text-purple-700 border-purple-200", icon: FileCheck },
  { value: "form",       label: "نموذج",         color: "bg-green-100 text-green-700 border-green-200",  icon: File },
  { value: "contract",   label: "عقد",           color: "bg-orange-100 text-orange-700 border-orange-200", icon: FileText },
  { value: "regulation", label: "لائحة",         color: "bg-red-100 text-red-700 border-red-200",       icon: FileText },
  { value: "hr",         label: "موارد بشرية",   color: "bg-sky-100 text-sky-700 border-sky-200",       icon: Users },
  { value: "other",      label: "أخرى",          color: "bg-gray-100 text-gray-700 border-gray-200",    icon: FolderOpen },
];

const ACCESS_LEVELS: { value: AccessLevel; label: string; icon: React.ElementType }[] = [
  { value: "all",        label: "جميع الموظفين",    icon: Users },
  { value: "managers",   label: "المديرون فقط",     icon: ShieldCheck },
  { value: "department", label: "قسم محدد",          icon: Building2 },
  { value: "specific",   label: "موظفون محددون",    icon: User },
];

const emptyForm = {
  title: "", description: "", category: "other" as DocCategory,
  accessLevel: "all" as AccessLevel, accessDepts: [] as string[],
  accessEmployeeIds: [] as string[],
  expiryDate: "", notifyDaysBefore: "30",
};

function fileIcon(fileType?: string): React.ElementType {
  if (!fileType) return FileText;
  if (fileType.includes("pdf"))         return FileText;
  if (fileType.includes("word") || fileType.includes("document")) return FileText;
  if (fileType.includes("excel") || fileType.includes("sheet"))   return FileSpreadsheet;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return Presentation;
  if (fileType.startsWith("image/"))    return Image;
  return File;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function expiryStatus(expiryDate?: string, notifyDaysBefore?: number) {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  const warn = notifyDaysBefore ?? 30;
  if (daysLeft < 0)        return { label: "منتهي", color: "bg-red-100 text-red-700 border-red-200",       icon: AlertTriangle, days: daysLeft };
  if (daysLeft <= warn)    return { label: `ينتهي خلال ${daysLeft} يوم`, color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, days: daysLeft };
  return { label: `ينتهي ${exp.toLocaleDateString("ar-SA")}`, color: "bg-green-100 text-green-700 border-green-200", icon: Calendar, days: daysLeft };
}

export default function CompanyDocsPage() {
  const { t } = useLang();
  const [docs, setDocs]               = useState<CompanyDoc[]>([]);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterCat, setFilterCat]     = useState("all");
  const [filterAccess, setFilterAccess] = useState("all");

  // Dialog
  const [dialog, setDialog]         = useState(false);
  const [editDoc, setEditDoc]       = useState<CompanyDoc | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  // Upload
  const [uploading, setUploading]   = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; size: number; fileType: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Detail dialog
  const [detailDoc, setDetailDoc] = useState<CompanyDoc | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/company-docs");
    const data = await res.json();
    setDocs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/employees?all=1").then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : (d.data ?? [])));
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : []));
  }, []);

  // ── فلترة ──
  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    if (q && !d.title.toLowerCase().includes(q) && !(d.description ?? "").toLowerCase().includes(q)) return false;
    if (filterCat !== "all" && d.category !== filterCat) return false;
    if (filterAccess !== "all" && d.accessLevel !== filterAccess) return false;
    return true;
  });

  // ── فتح نموذج الإنشاء ──
  const openCreate = () => {
    setEditDoc(null);
    setForm(emptyForm);
    setUploadedFile(null);
    setFormError("");
    setDialog(true);
  };

  // ── فتح نموذج التعديل ──
  const openEdit = (doc: CompanyDoc) => {
    setEditDoc(doc);
    setForm({
      title:            doc.title,
      description:      doc.description ?? "",
      category:         doc.category,
      accessLevel:      doc.accessLevel,
      accessDepts:      doc.accessDepts ? JSON.parse(doc.accessDepts) : [],
      accessEmployeeIds: doc.accessEmployeeIds ? JSON.parse(doc.accessEmployeeIds) : [],
      expiryDate:       doc.expiryDate ? doc.expiryDate.slice(0, 10) : "",
      notifyDaysBefore: String(doc.notifyDaysBefore),
    });
    setUploadedFile(doc.fileUrl ? { url: doc.fileUrl, name: doc.fileName ?? "", size: doc.fileSize ?? 0, fileType: doc.fileType ?? "" } : null);
    setFormError("");
    setDialog(true);
  };

  // ── رفع ملف ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/company-docs/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setUploadedFile(data);
    else setFormError(data.error ?? "فشل رفع الملف");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── حفظ ──
  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("العنوان مطلوب"); return; }
    setSaving(true); setFormError("");

    const payload = {
      ...form,
      fileUrl:  uploadedFile?.url  ?? null,
      fileName: uploadedFile?.name ?? null,
      fileSize: uploadedFile?.size ?? null,
      fileType: uploadedFile?.fileType ?? null,
      notifyDaysBefore: parseInt(form.notifyDaysBefore) || 30,
    };

    const url    = editDoc ? `/api/company-docs/${editDoc.id}` : "/api/company-docs";
    const method = editDoc ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "حدث خطأ"); return; }
    setDialog(false);
    load();
  };

  // ── حذف ──
  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا المستند نهائيًا؟")) return;
    await fetch(`/api/company-docs/${id}`, { method: "DELETE" });
    load();
  };

const catMeta = (cat: DocCategory) => CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
  const accessMeta = (lvl: AccessLevel) => ACCESS_LEVELS.find(a => a.value === lvl) ?? ACCESS_LEVELS[0];

  // ── إحصائيات ──
  const expiringSoon = docs.filter(d => {
    if (!d.expiryDate) return false;
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= (d.notifyDaysBefore ?? 30);
  }).length;
  const expired = docs.filter(d => d.expiryDate && new Date(d.expiryDate) < new Date()).length;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* ── رأس الصفحة ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-sky-600" /> مستندات المنشأة
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة ومشاركة المستندات الداخلية مع ضبط أذونات الوصول</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="h-4 w-4" /> رفع مستند
        </Button>
      </div>

      {/* ── إحصائيات ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي المستندات", value: docs.length,               color: "sky",    icon: FileText },
          { label: "المستندات النشطة", value: docs.length, color: "green", icon: CheckCircle2 },
          { label: "تنتهي قريبًا",     value: expiringSoon,              color: "amber",  icon: Clock },
          { label: "منتهية الصلاحية",  value: expired,                   color: "red",    icon: AlertTriangle },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`border-${s.color}-200 bg-${s.color}-50`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-${s.color}-100 flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4.5 w-4.5 text-${s.color}-600`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── فلاتر وبحث ── */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="بحث بالعنوان..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={filterCat} onValueChange={v => setFilterCat(v ?? "all")}>
            <SelectTrigger className="w-40"><SelectValue placeholder="الفئة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAccess} onValueChange={v => setFilterAccess(v ?? "all")}>
            <SelectTrigger className="w-44"><SelectValue placeholder="الصلاحية" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل مستويات الوصول</SelectItem>
              {ACCESS_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterCat !== "all" || filterAccess !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCat("all"); setFilterAccess("all"); }}>
              <X className="h-4 w-4 ml-1" /> مسح
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── قائمة المستندات ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد مستندات</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(doc => {
            const cat    = catMeta(doc.category);
            const CatIcon = cat.icon;
            const acc    = accessMeta(doc.accessLevel);
            const AccIcon = acc.icon;
            const expiry = expiryStatus(doc.expiryDate, doc.notifyDaysBefore);
            const ExpIcon = expiry?.icon;
            const FIcon  = fileIcon(doc.fileType);

            return (
              <Card key={doc.id} className="border transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* أيقونة الملف */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.color} border`}>
                      <FIcon className="h-5 w-5" />
                    </div>

                    {/* المحتوى */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                            {doc.title}
                          </h3>
                          {doc.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{doc.description}</p>}
                        </div>
                        {/* أزرار */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="معاينة">
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <button onClick={() => openEdit(doc)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="تعديل">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="حذف">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* شارات */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cat.color}`}>
                          <CatIcon className="h-3 w-3" />{cat.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                          <AccIcon className="h-3 w-3" />{acc.label}
                          {doc.accessLevel === "department" && doc.accessDepts && (
                            <span className="text-gray-400">: {JSON.parse(doc.accessDepts).join("، ")}</span>
                          )}
                        </span>
                        {doc.fileSize && (
                          <span className="text-xs text-gray-400">{formatSize(doc.fileSize)}</span>
                        )}
                        {expiry && ExpIcon && (
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${expiry.color}`}>
                            <ExpIcon className="h-3 w-3" />{expiry.label}
                          </span>
                        )}
                        {(doc.notifyDaysBefore > 0 && doc.expiryDate) && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Bell className="h-3 w-3" /> تذكير قبل {doc.notifyDaysBefore} يوم
                          </span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center gap-1 mr-auto">
                          <Download className="h-3 w-3" />{doc.downloadCount} تحميل
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ════════════════ Dialog الإضافة/التعديل ════════════════ */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-600" />
              {editDoc ? "تعديل المستند" : "رفع مستند جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />{formError}
              </div>
            )}

            {/* العنوان */}
            <div className="space-y-1">
              <Label>عنوان المستند <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: سياسة الإجازات السنوية" />
            </div>

            {/* الوصف */}
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف مختصر للمستند..." rows={2} />
            </div>

            {/* الفئة */}
            <div className="space-y-1">
              <Label>الفئة</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as DocCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* رفع الملف */}
            <div className="space-y-2">
              <Label>الملف</Label>
              {uploadedFile ? (
                <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5">
                  <FileText className="h-5 w-5 text-sky-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sky-800 truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-sky-500">{formatSize(uploadedFile.size)}</p>
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="text-sky-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">جاري الرفع...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">اضغط لاختيار ملف أو اسحبه هنا</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, PowerPoint, صور — حتى 20 MB</p>
                    </>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt" />
            </div>

            {/* صلاحية الوصول */}
            <div className="space-y-2">
              <Label>من يستطيع الوصول؟</Label>
              <div className="grid grid-cols-2 gap-2">
                {ACCESS_LEVELS.map(a => {
                  const Icon = a.icon;
                  const active = form.accessLevel === a.value;
                  return (
                    <button key={a.value} onClick={() => setForm(p => ({ ...p, accessLevel: a.value }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        active ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}>
                      <Icon className="h-4 w-4 shrink-0" />{a.label}
                    </button>
                  );
                })}
              </div>

              {/* أقسام محددة */}
              {form.accessLevel === "department" && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">اختر الأقسام</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-gray-50">
                    {departments.map(d => {
                      const sel = form.accessDepts.includes(d.name);
                      return (
                        <button key={d.id} onClick={() => setForm(p => ({
                          ...p,
                          accessDepts: sel ? p.accessDepts.filter(x => x !== d.name) : [...p.accessDepts, d.name]
                        }))} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                          sel ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-600 border-gray-200 hover:border-sky-300"
                        }`}>{d.name}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* موظفون محددون */}
              {form.accessLevel === "specific" && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">اختر الموظفين</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-xl divide-y">
                    {employees.map(e => {
                      const sel = form.accessEmployeeIds.includes(e.id);
                      return (
                        <label key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={sel} onChange={() => setForm(p => ({
                            ...p,
                            accessEmployeeIds: sel ? p.accessEmployeeIds.filter(x => x !== e.id) : [...p.accessEmployeeIds, e.id]
                          }))} className="rounded" />
                          <span className="text-sm">{e.firstName} {e.lastName}</span>
                          <span className="text-xs text-gray-400 mr-auto">{e.department}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* تاريخ انتهاء الصلاحية */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>تاريخ انتهاء الصلاحية</Label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} />
              </div>
              {form.expiryDate && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> تذكير قبل (أيام)</Label>
                  <Input type="number" min="1" max="365" value={form.notifyDaysBefore}
                    onChange={e => setForm(p => ({ ...p, notifyDaysBefore: e.target.value }))} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700 gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editDoc ? "حفظ التغييرات" : "رفع المستند"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      {detailDoc && (
        <Dialog open={!!detailDoc} onOpenChange={() => setDetailDoc(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{detailDoc.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">{detailDoc.description}</p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
