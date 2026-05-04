"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Search, Download, Eye, Clock, AlertTriangle, Calendar,
  ShieldCheck, File, FileSpreadsheet, FolderOpen, Users, Building2, User,
  CheckCircle2, X, FileCheck, Image, Presentation,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";

type DocCategory = "policy" | "procedure" | "form" | "contract" | "regulation" | "hr" | "other";
type AccessLevel  = "all" | "managers" | "department" | "specific";

type CompanyDoc = {
  id: string; title: string; description?: string; category: DocCategory;
  fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string;
  accessLevel: AccessLevel; expiryDate?: string; notifyDaysBefore: number;
  isActive: boolean; downloadCount: number; createdAt: string;
};

const CATEGORIES: { value: string; label: string; color: string; icon: React.ElementType }[] = [
  { value: "policy",     label: "سياسة",       color: "bg-blue-100 text-blue-700 border-blue-200",      icon: ShieldCheck },
  { value: "procedure",  label: "إجراء",        color: "bg-purple-100 text-purple-700 border-purple-200", icon: FileCheck },
  { value: "form",       label: "نموذج",        color: "bg-green-100 text-green-700 border-green-200",    icon: File },
  { value: "contract",   label: "عقد",          color: "bg-orange-100 text-orange-700 border-orange-200", icon: FileText },
  { value: "regulation", label: "لائحة",        color: "bg-red-100 text-red-700 border-red-200",          icon: FileText },
  { value: "hr",         label: "موارد بشرية",  color: "bg-sky-100 text-sky-700 border-sky-200",          icon: Users },
  { value: "other",      label: "أخرى",         color: "bg-gray-100 text-gray-700 border-gray-200",       icon: FolderOpen },
];

const ACCESS_ICONS: Record<string, React.ElementType> = {
  all: Users, managers: ShieldCheck, department: Building2, specific: User,
};
const ACCESS_LABELS: Record<string, string> = {
  all: "للجميع", managers: "للمديرين", department: "لقسم محدد", specific: "لموظفين محددين",
};

function fileIcon(fileType?: string): React.ElementType {
  if (!fileType) return FileText;
  if (fileType.includes("pdf"))          return FileText;
  if (fileType.includes("word") || fileType.includes("document")) return FileText;
  if (fileType.includes("excel") || fileType.includes("sheet"))   return FileSpreadsheet;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return Presentation;
  if (fileType.startsWith("image/"))     return Image;
  return File;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function expiryStatus(expiryDate?: string, notifyDaysBefore?: number) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  const warn = notifyDaysBefore ?? 30;
  if (days < 0)         return { label: "منتهي الصلاحية", color: "bg-red-100 text-red-700 border-red-200",     icon: AlertTriangle };
  if (days <= warn)     return { label: `ينتهي خلال ${days} يوم`, color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock };
  return { label: new Date(expiryDate).toLocaleDateString("ar-SA"), color: "bg-green-50 text-green-700 border-green-100", icon: Calendar };
}

export default function PortalCompanyDocsPage() {
  const { t } = useLang();
  const [docs, setDocs]       = useState<CompanyDoc[]>([]);
  const [empId, setEmpId]     = useState<string | null>(null);
  const [empName, setEmpName] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(user => {
      if (user.employee?.id) {
        const id   = user.employee.id;
        const name = `${user.employee.firstName} ${user.employee.lastName}`;
        setEmpId(id);
        setEmpName(name);
        fetch(`/api/company-docs?employeeId=${id}`)
          .then(r => r.json())
          .then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false); });
      }
    });
  }, []);

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    if (q && !d.title.toLowerCase().includes(q) && !(d.description ?? "").toLowerCase().includes(q)) return false;
    if (filterCat !== "all" && d.category !== filterCat) return false;
    return true;
  });

  const handleDownload = async (doc: CompanyDoc) => {
    if (!doc.fileUrl) return;
    // تسجيل التحميل
    await fetch(`/api/company-docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: empId, employeeName: empName }),
    });
    setDownloaded(prev => new Set([...prev, doc.id]));
    window.open(doc.fileUrl, "_blank");
  };

  const catMap = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));
  const expiringSoon = docs.filter(d => {
    if (!d.expiryDate) return false;
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= (d.notifyDaysBefore ?? 30);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* رأس الصفحة */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-sky-600" /> مستندات المنشأة
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">المستندات والسياسات المتاحة لك</p>
      </div>

      {/* تنبيه المستندات قاربت على الانتهاء */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {expiringSoon.length} مستند{expiringSoon.length > 1 ? "ات" : ""} ستنتهي صلاحيتها قريبًا
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {expiringSoon.map(d => d.title).join(" • ")}
            </p>
          </div>
        </div>
      )}

      {/* فلاتر */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterCat} onValueChange={v => setFilterCat(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الفئة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterCat !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCat("all"); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* فئات سريعة */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat("all")}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
            filterCat === "all" ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-600 border-gray-200 hover:border-sky-200"
          }`}>الكل ({docs.length})</button>
        {CATEGORIES.filter(c => docs.some(d => d.category === c.value)).map(c => {
          const Icon = c.icon;
          const count = docs.filter(d => d.category === c.value).length;
          return (
            <button key={c.value} onClick={() => setFilterCat(c.value)}
              className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filterCat === c.value ? "bg-sky-600 text-white border-sky-600" : `${c.color} hover:opacity-80`
              }`}>
              <Icon className="h-3 w-3" />{c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* المستندات */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-gray-400">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد مستندات</p>
          <p className="text-sm mt-1">لم يتم إضافة مستندات بعد أو لا توجد مستندات متاحة لك</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(doc => {
            const cat    = catMap[doc.category] ?? CATEGORIES[CATEGORIES.length - 1];
            const CatIcon = cat.icon;
            const FIcon  = fileIcon(doc.fileType);
            const expiry = expiryStatus(doc.expiryDate, doc.notifyDaysBefore);
            const ExpIcon = expiry?.icon;
            const AccIcon = ACCESS_ICONS[doc.accessLevel] ?? Users;
            const isDl   = downloaded.has(doc.id);

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* أيقونة */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${cat.color}`}>
                      <FIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                          {doc.description && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>
                          )}
                        </div>

                        {/* أزرار */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                              className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="معاينة">
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          {doc.fileUrl ? (
                            <Button size="sm" onClick={() => handleDownload(doc)}
                              className={`gap-1.5 text-xs h-8 ${isDl ? "bg-green-600 hover:bg-green-700" : "bg-sky-600 hover:bg-sky-700"}`}>
                              {isDl ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                              {isDl ? "تم التحميل" : "تحميل"}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">بدون ملف</span>
                          )}
                        </div>
                      </div>

                      {/* شارات */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${cat.color}`}>
                          <CatIcon className="h-3 w-3" />{cat.label}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <AccIcon className="h-3 w-3" />{ACCESS_LABELS[doc.accessLevel]}
                        </span>
                        {doc.fileSize && (
                          <span className="text-[11px] text-gray-400">{formatSize(doc.fileSize)}</span>
                        )}
                        {expiry && ExpIcon && (
                          <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${expiry.color}`}>
                            <ExpIcon className="h-3 w-3" />{expiry.label}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 mr-auto">
                          {new Date(doc.createdAt).toLocaleDateString("ar-SA")}
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
    </div>
  );
}
