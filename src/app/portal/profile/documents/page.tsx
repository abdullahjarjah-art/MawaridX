"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, FileText, Eye, Download, AlertTriangle,
  File, ImageIcon, FolderOpen, Plus, Upload, X, Trash2,
} from "lucide-react";

type Document = {
  id: string; type: string; name: string; fileUrl?: string | null;
  expiryDate?: string | null; notes?: string | null; createdAt: string;
};

const docTypeLabel: Record<string, string> = {
  national_id: "هوية وطنية", iqama: "إقامة", passport: "جواز سفر",
  contract: "عقد عمل", certificate: "شهادة", medical: "تقرير طبي", other: "أخرى",
};
const docTypeColor: Record<string, string> = {
  national_id: "bg-blue-50 text-blue-600", iqama: "bg-blue-50 text-blue-600",
  passport: "bg-indigo-50 text-indigo-600", contract: "bg-green-50 text-green-600",
  certificate: "bg-amber-50 text-amber-600", medical: "bg-rose-50 text-rose-600",
  other: "bg-gray-100 text-gray-500",
};

const emptyForm = { type: "other", name: "", expiryDate: "", notes: "" };

export default function MyDocumentsPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // نافذة الإضافة
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [file, setFile]         = useState<File | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.employee?.id) {
        setEmployeeId(d.employee.id);
        fetch(`/api/employees/${d.employee.id}/documents`)
          .then(r => r.json())
          .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false); });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const submit = async () => {
    if (!form.name.trim()) { setError("اسم الوثيقة مطلوب"); return; }
    if (!file)              { setError("يرجى اختيار ملف"); return; }
    setError("");
    setSaving(true);
    const fd = new FormData();
    fd.append("type", form.type);
    fd.append("name", form.name);
    if (form.expiryDate) fd.append("expiryDate", form.expiryDate);
    if (form.notes)      fd.append("notes", form.notes);
    fd.append("file", file);

    const res = await fetch(`/api/employees/${employeeId}/documents`, { method: "POST", body: fd });
    if (res.ok) {
      const doc = await res.json();
      setDocs(prev => [doc, ...prev]);
      setShowForm(false);
      setForm(emptyForm);
      setFile(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "حدث خطأ");
    }
    setSaving(false);
  };

  const isExpired  = (d?: string | null) => d ? new Date(d) < new Date() : false;
  const isExpiring = (d?: string | null) => {
    if (!d) return false;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 30;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">وثائقي</h1>
        <button
          onClick={() => { setShowForm(true); setError(""); setForm(emptyForm); setFile(null); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4 text-white" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── نافذة رفع وثيقة ── */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
              <p className="font-bold text-gray-900 dark:text-white">رفع وثيقة جديدة</p>
            </div>

            <div className="space-y-3">
              {/* نوع الوثيقة */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">النوع</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(docTypeLabel).map(([k, v]) => (
                    <button key={k}
                      onClick={() => setForm(f => ({ ...f, type: k }))}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors text-right ${form.type === k ? "border-gray-900 bg-gray-900 text-white dark:border-gray-500 dark:bg-gray-600" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* الاسم */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">الاسم <span className="text-red-500">*</span></label>
                <input
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: هويتي الوطنية"
                />
              </div>

              {/* تاريخ الانتهاء */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">تاريخ الانتهاء (اختياري)</label>
                <input
                  type="date"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>

              {/* رفع الملف */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">الملف <span className="text-red-500">*</span></label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${file ? "border-gray-400 bg-gray-50 dark:bg-gray-700" : "border-gray-200 hover:border-gray-400"}`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{file.name}</p>
                      <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-gray-300 mx-auto mb-1.5" />
                      <p className="text-sm text-gray-500">اضغط لاختيار ملف</p>
                      <p className="text-xs text-gray-300 mt-0.5">صورة أو PDF — حتى 10 MB</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <button
                onClick={submit}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-gray-900 dark:bg-gray-600 text-white font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? "جارٍ الرفع..." : "رفع الوثيقة"}
              </button>
            </div>
          </div>
        )}

        {/* ── القائمة ── */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
            <FolderOpen className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">لا توجد وثائق بعد</p>
            <p className="text-gray-300 text-xs mt-1">اضغط + لرفع وثيقة جديدة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => {
              const expired  = isExpired(doc.expiryDate);
              const expiring = isExpiring(doc.expiryDate);
              const isPdf    = doc.fileUrl?.toLowerCase().endsWith(".pdf");

              return (
                <div key={doc.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border shadow-sm ${expired ? "border-red-200" : expiring ? "border-amber-200" : "border-gray-100 dark:border-gray-700"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${docTypeColor[doc.type] ?? "bg-gray-100 text-gray-500"}`}>
                      {isPdf ? <FileText className="h-5 w-5" /> : doc.fileUrl ? <ImageIcon className="h-5 w-5" /> : <File className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{docTypeLabel[doc.type] ?? doc.type}</p>
                      {doc.expiryDate && (
                        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${expired ? "text-red-500" : expiring ? "text-amber-500" : "text-gray-400"}`}>
                          {(expired || expiring) && <AlertTriangle className="h-3 w-3" />}
                          {expired ? "منتهية · " : expiring ? "تنتهي قريباً · " : "تنتهي · "}
                          {new Date(doc.expiryDate).toLocaleDateString("ar-SA")}
                        </div>
                      )}
                    </div>
                  </div>

                  {doc.fileUrl && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-600 text-xs font-medium text-white hover:bg-gray-800 transition-colors">
                        <Eye className="h-3.5 w-3.5" /> عرض
                      </a>
                      <a href={doc.fileUrl} download
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Download className="h-3.5 w-3.5" /> تحميل
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
