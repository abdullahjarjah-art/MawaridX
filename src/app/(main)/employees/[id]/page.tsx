"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  User, Phone, Mail, MapPin, Calendar, Building2, DollarSign,
  ArrowRight, Briefcase, Users, ClipboardList, CalendarCheck, CreditCard,
  Package, CalendarDays, Plane, Monitor, Plus, Trash2, CheckCircle2, XCircle,
  Clock, FileText, Upload, Eye, Download, File, ImageIcon, AlertTriangle,
  Camera, RefreshCw, Send, BanIcon, ShieldAlert, FileSpreadsheet, BadgeCheck,
  Scroll,
} from "lucide-react";
import { generateSalaryCertificate, generateEmploymentLetter, generateExperienceLetter } from "@/lib/letters-pdf";
import { EmployeeAvatar } from "@/components/employee-avatar";

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:     { label: "نشط",       variant: "default" },
  inactive:   { label: "غير نشط",   variant: "secondary" },
  terminated: { label: "منتهي",     variant: "destructive" },
};
const positionMap: Record<string, string> = { manager: "مدير", supervisor: "مشرف", employee: "موظف" };
const typeMap: Record<string, string> = {
  leave: "إجازة", attendance_fix: "تعديل حضور", loan: "سلفة",
  custody: "عهدة", exit_return: "خروج وعودة", resignation: "استقالة", letter: "خطاب",
};
const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة", unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};
const empTypeMap: Record<string, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", contract: "عقد", intern: "متدرب" };

const docTypeLabel: Record<string, string> = {
  national_id: "هوية وطنية", iqama: "إقامة", passport: "جواز سفر",
  contract: "عقد عمل", certificate: "شهادة", medical: "تقرير طبي", other: "أخرى",
};
const docTypeIcon: Record<string, React.ElementType> = {
  national_id: User, iqama: User, passport: User,
  contract: FileText, certificate: FileText, medical: FileText, other: File,
};

type WLocation = { id: string; name: string; address?: string; active: boolean };
type Employee = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  arabicName?: string; photo?: string | null; email: string; phone?: string; nationalId?: string;
  birthDate?: string; gender?: string; maritalStatus?: string; address?: string; city?: string;
  jobTitle?: string; position: string; department?: string; employmentType: string;
  startDate: string; endDate?: string; status: string; nationality?: string;
  basicSalary: number; bankName?: string; iban?: string;
  multiLocation?: boolean;
  manager?: { id: string; firstName: string; lastName: string } | null;
  subordinates?: { id: string; firstName: string; lastName: string; jobTitle?: string; photo?: string | null }[];
  attendances?: { id: string; date: string; status: string; checkIn?: string; checkOut?: string; workHours?: number }[];
  salaries?: { id: string; month: number; year: number; netSalary: number; status: string }[];
  requests?: { id: string; type: string; title: string; status: string; createdAt: string }[];
  leaves?: { id: string; type: string; startDate: string; endDate: string; days: number; status: string }[];
};

type Custody = {
  id: string; type: string; title: string; description?: string;
  quantity?: number; unit?: string; status: string;
  createdBy: string; approvedAt?: string; employeeNote?: string; createdAt: string;
};

type Document = {
  id: string; type: string; name: string; fileUrl?: string | null;
  expiryDate?: string | null; notes?: string | null; createdAt: string;
};

const custodyTypeLabel: Record<string, string> = {
  leave_balance: "رصيد إجازة", travel_ticket: "تذكرة سفر", equipment: "جهاز / معدة", other: "أخرى",
};
const custodyTypeIcon: Record<string, React.ElementType> = {
  leave_balance: CalendarDays, travel_ticket: Plane, equipment: Monitor, other: Package,
};
const custodyStatusMap: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending:  { label: "بانتظار الموظف", icon: Clock,        cls: "text-amber-600" },
  approved: { label: "تمت الموافقة",   icon: CheckCircle2, cls: "text-green-600" },
  rejected: { label: "مرفوضة",         icon: XCircle,      cls: "text-red-500"   },
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

const emptyCustodyForm = { type: "equipment", title: "", description: "", quantity: "", unit: "" };
const emptyDocForm = { type: "other", name: "", expiryDate: "", notes: "" };

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [emp, setEmp] = useState<Employee | null>(null);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Photo
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Custody dialog
  const [custodyDialog, setCustodyDialog] = useState(false);
  const [custodyForm, setCustodyForm] = useState(emptyCustodyForm);
  const [custodySaving, setCustodySaving] = useState(false);

  // Document dialog
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  // Disciplinary
  const [disciplinaries, setDisciplinaries] = useState<{ id: string; type: string; reason: string; date: string; issuedBy: string; status: string; penalty?: number; days?: number }[]>([]);
  const [discDialog, setDiscDialog] = useState(false);
  const [discForm, setDiscForm] = useState({ type: "verbal_warning", reason: "", description: "", date: new Date().toISOString().slice(0, 10), penalty: "", days: "" });
  const [discSaving, setDiscSaving] = useState(false);

  // Contract renewal — يجب أن تكون هنا قبل أي return مشروط
  const [renewPopup, setRenewPopup]           = useState(false);
  const [renewing, setRenewing]               = useState(false);
  const [pendingRenewal, setPendingRenewal]     = useState(false);
  const [pendingNonRenewal, setPendingNonRenewal] = useState(false);
  const [renewError, setRenewError]           = useState<string | null>(null);
  const [allLocations, setAllLocations]         = useState<WLocation[]>([]);
  const [empLocations, setEmpLocations]         = useState<WLocation[]>([]);
  const [togglingMultiLoc, setTogglingMultiLoc] = useState(false);
  const [addingLocation, setAddingLocation]     = useState(false);

  const loadContractState = () => {
    fetch(`/api/requests?employeeId=${id}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setPendingRenewal(d.some((r: { type: string; status: string }) => r.type === "contract_renewal" && r.status === "pending"));
          setPendingNonRenewal(d.some((r: { type: string; status: string }) => r.type === "contract_non_renewal" && r.status === "pending"));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch(`/api/employees/${id}?full=1`).then(r => r.json()).then(setEmp).catch(() => {});
    fetch(`/api/employees/${id}/custodies`).then(r => r.json()).then(d => setCustodies(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`/api/employees/${id}/documents`).then(r => r.json()).then(d => setDocuments(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`/api/disciplinary?employeeId=${id}`).then(r => r.json()).then(d => setDisciplinaries(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/locations").then(r => r.json()).then(d => setAllLocations(Array.isArray(d) ? d : (d.data ?? []))).catch(() => {});
    fetch(`/api/employee-locations/${id}`).then(r => r.json()).then(d => setEmpLocations(Array.isArray(d) ? d : [])).catch(() => {});
    loadContractState();
  }, [id]);

  // ── رفع الصورة ──
  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/employees/${id}/photo`, { method: "POST", body: fd });
    if (res.ok) {
      const { photo } = await res.json();
      setEmp(prev => prev ? { ...prev, photo } : prev);
    }
    setPhotoUploading(false);
    e.target.value = "";
  };

  // ── العهد ──
  const addCustody = async () => {
    if (!custodyForm.title.trim()) return;
    setCustodySaving(true);
    const res = await fetch(`/api/employees/${id}/custodies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(custodyForm),
    });
    if (res.ok) {
      const c = await res.json();
      setCustodies(prev => [c, ...prev]);
      setCustodyDialog(false);
      setCustodyForm(emptyCustodyForm);
    }
    setCustodySaving(false);
  };

  const deleteCustody = async (cid: string) => {
    if (!confirm("هل تريد حذف هذه العهدة؟")) return;
    const res = await fetch(`/api/custodies/${cid}`, { method: "DELETE" });
    if (res.ok) setCustodies(prev => prev.filter(c => c.id !== cid));
  };

  // ── الوثائق ──
  const addDocument = async () => {
    if (!docForm.name.trim()) return;
    setDocSaving(true);
    const fd = new FormData();
    fd.append("type", docForm.type);
    fd.append("name", docForm.name);
    if (docForm.expiryDate) fd.append("expiryDate", docForm.expiryDate);
    if (docForm.notes)      fd.append("notes", docForm.notes);
    if (docFile)            fd.append("file", docFile);

    const res = await fetch(`/api/employees/${id}/documents`, { method: "POST", body: fd });
    if (res.ok) {
      const doc = await res.json();
      setDocuments(prev => [doc, ...prev]);
      setDocDialog(false);
      setDocForm(emptyDocForm);
      setDocFile(null);
    }
    setDocSaving(false);
  };

  const deleteDocument = async (did: string) => {
    if (!confirm("هل تريد حذف هذه الوثيقة؟")) return;
    const res = await fetch(`/api/documents/${did}`, { method: "DELETE" });
    if (res.ok) setDocuments(prev => prev.filter(d => d.id !== did));
  };

  const isExpiringSoon = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 30;
  };
  const isExpired = (dateStr?: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  if (!emp) return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );

  const st = statusMap[emp.status] ?? statusMap.active;
  const genderLabel = emp.gender === "male" ? "ذكر" : emp.gender === "female" ? "أنثى" : emp.gender;
  const maritalLabel = emp.maritalStatus === "single" ? "أعزب" : emp.maritalStatus === "married" ? "متزوج" : emp.maritalStatus;

  // حالة العقد
  const contractEnd    = emp.endDate ? new Date((emp as any).endDate) : null;
  const noticeDays     = (emp as any).noticePeriodDays ?? 60;
  const daysLeft       = contractEnd ? Math.ceil((contractEnd.getTime() - Date.now()) / 86400000) : null;
  const noticeDate     = contractEnd ? new Date(contractEnd.getTime() - noticeDays * 86400000) : null;
  const inNotice        = daysLeft !== null && daysLeft >= 0 && noticeDate && new Date() >= noticeDate;
  const contractExpired = daysLeft !== null && daysLeft < 0;

  // ── بصمة متعدد الفروع ──
  const toggleMultiLocation = async () => {
    if (!emp) return;
    setTogglingMultiLoc(true);
    const newVal = !emp.multiLocation;
    await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...emp, multiLocation: newVal }),
    });
    setEmp(prev => prev ? { ...prev, multiLocation: newVal } : prev);
    setTogglingMultiLoc(false);
  };

  const addEmpLocation = async (locationId: string) => {
    if (!locationId) return;
    setAddingLocation(true);
    const res = await fetch(`/api/employee-locations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    if (res.ok) {
      const loc = allLocations.find(l => l.id === locationId);
      if (loc) setEmpLocations(prev => [...prev, loc]);
    }
    setAddingLocation(false);
  };

  const removeEmpLocation = async (locationId: string) => {
    const res = await fetch(`/api/employee-locations/${id}?locationId=${locationId}`, { method: "DELETE" });
    if (res.ok) setEmpLocations(prev => prev.filter(l => l.id !== locationId));
  };

  // إرسال طلب تجديد أو إشعار عدم تجديد
  const sendContractAction = async (action: "renewal" | "non_renewal", years?: 1 | 2) => {
    setRenewing(true); setRenewPopup(false); setRenewError(null);
    const res = await fetch("/api/contracts/renew", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: id, action, years }),
    });
    setRenewing(false);
    if (res.ok) {
      if (action === "renewal")     setPendingRenewal(true);
      if (action === "non_renewal") setPendingNonRenewal(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setRenewError(d.error ?? "حدث خطأ");
      if (action === "renewal") setRenewPopup(true);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <Button variant="ghost" className="mb-4 gap-2 text-gray-600" onClick={() => router.push("/employees")}>
        <ArrowRight className="h-4 w-4" /> العودة للموظفين
      </Button>

      {/* ── بطاقة الموظف الرئيسية ── */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* الصورة مع زر الرفع */}
            <div className="relative shrink-0 group">
              <EmployeeAvatar photo={emp.photo} firstName={emp.firstName} lastName={emp.lastName} size="xl" />
              <button
                onClick={() => photoRef.current?.click()}
                disabled={photoUploading}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {photoUploading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="h-5 w-5 text-white" />}
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{emp.firstName} {emp.lastName}</h1>
                <Badge variant={st.variant}>{st.label}</Badge>
                <Badge variant="outline">{positionMap[emp.position] ?? emp.position}</Badge>
              </div>
              {emp.arabicName && <p className="text-sm text-gray-500 mt-0.5">{emp.arabicName}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                <span className="font-mono">#{emp.employeeNumber}</span>
                {emp.jobTitle && <span>{emp.jobTitle}</span>}
                {emp.department && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {emp.department}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-2">اضغط على الصورة لتغييرها</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── بطاقة العقد (تظهر فقط إذا في endDate) ── */}
      {contractEnd && (
        <Card className={`mb-6 border-2 ${contractExpired ? "border-red-300 bg-red-50" : inNotice ? "border-amber-300 bg-amber-50" : "border-green-200 bg-green-50"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${contractExpired ? "bg-red-100" : inNotice ? "bg-amber-100" : "bg-green-100"}`}>
                  <FileText className={`h-5 w-5 ${contractExpired ? "text-red-600" : inNotice ? "text-amber-600" : "text-green-600"}`} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {contractExpired ? "⛔ العقد منتهي" : inNotice ? "⚠️ فترة الإشعار — يجب التبليغ" : "✅ العقد ساري"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {contractExpired
                      ? `انتهى منذ ${Math.abs(daysLeft!)} يوم (${contractEnd.toLocaleDateString("ar-SA")})`
                      : `ينتهي في ${contractEnd.toLocaleDateString("ar-SA")} — متبقي ${daysLeft} يوم`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {(emp as any).contractDuration && (
                  <p className="text-sm font-medium text-gray-700">مدة العقد: {(emp as any).contractDuration} سنة</p>
                )}
                <p className="text-xs text-gray-400">فترة الإشعار: {noticeDays} يوم</p>
                {noticeDate && !contractExpired && (
                  <p className="text-xs text-gray-400">موعد الإشعار: {noticeDate.toLocaleDateString("ar-SA")}</p>
                )}
              </div>
            </div>
            {inNotice && (
              <div className="mt-3 bg-amber-100 border border-amber-200 rounded-xl px-4 py-2.5">
                <p className="text-sm font-bold text-amber-800">
                  📢 يجب إرسال إشعار إفساخ العقد قبل {contractEnd!.toLocaleDateString("ar-SA")} بـ {noticeDays} يوم — الموعد كان {noticeDate!.toLocaleDateString("ar-SA")}
                </p>
              </div>
            )}

            {/* ── أزرار العقد (فترة الإشعار + منتهي) ── */}
            {(inNotice || contractExpired) && (
              <div className="mt-3" onClick={e => e.stopPropagation()}>

                {/* ── فترة الإشعار: زرّان ── */}
                {inNotice && (
                  <>
                    {pendingRenewal ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold justify-center">
                        <Clock className="h-4 w-4" />
                        ⏳ بانتظار موافقة الموظف على التجديد
                      </div>
                    ) : pendingNonRenewal ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 text-sm font-bold justify-center">
                        <Clock className="h-4 w-4" />
                        تم إرسال إشعار عدم التجديد — بانتظار تأكيد الموظف
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap relative">
                        {/* زر طلب التجديد */}
                        <div className="relative flex-1">
                          <button
                            onClick={() => { setRenewPopup(p => !p); setRenewError(null); }}
                            disabled={renewing}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 w-full justify-center"
                          >
                            {renewing
                              ? <RefreshCw className="h-4 w-4 animate-spin" />
                              : <Send className="h-4 w-4" />}
                            إرسال طلب تجديد
                          </button>

                          {renewPopup && (
                            <div className="absolute bottom-full mb-2 right-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl p-4 w-full min-w-52">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 text-center">اختر مدة التجديد</p>
                              <p className="text-[10px] text-gray-400 text-center mb-3">سيُرسل للموظف للموافقة أو الرفض</p>
                              {renewError && <p className="text-[10px] text-red-500 text-center mb-2">{renewError}</p>}
                              <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => sendContractAction("renewal", 1)}
                                  className="flex flex-col items-center gap-1 py-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                                  <span className="text-3xl font-black text-blue-700">1</span>
                                  <span className="text-xs text-blue-600 font-medium">سنة</span>
                                </button>
                                <button onClick={() => sendContractAction("renewal", 2)}
                                  className="flex flex-col items-center gap-1 py-4 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                                  <span className="text-3xl font-black text-green-700">2</span>
                                  <span className="text-xs text-green-600 font-medium">سنة</span>
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-400 text-center mt-2">
                                يُجدَّد من {contractEnd!.toLocaleDateString("ar-SA")}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* زر إشعار عدم التجديد */}
                        <button
                          onClick={() => sendContractAction("non_renewal")}
                          disabled={renewing}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex-1 justify-center"
                        >
                          {renewing
                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : <BanIcon className="h-4 w-4" />}
                          إشعار عدم التجديد
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* ── منتهي: زر تجديد فقط ── */}
                {contractExpired && (
                  <>
                    {pendingRenewal ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold justify-center">
                        <Clock className="h-4 w-4" />
                        ⏳ بانتظار موافقة الموظف على التجديد
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={() => { setRenewPopup(p => !p); setRenewError(null); }}
                          disabled={renewing}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 w-full justify-center"
                        >
                          {renewing
                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : <RefreshCw className="h-4 w-4" />}
                          {renewing ? "جارٍ الإرسال..." : "🔄 تجديد العقد"}
                        </button>

                        {renewPopup && (
                          <div className="absolute bottom-full mb-2 right-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl p-4 w-full min-w-52">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 text-center">اختر مدة التجديد</p>
                            <p className="text-[10px] text-gray-400 text-center mb-3">سيُرسل للموظف للموافقة</p>
                            {renewError && <p className="text-[10px] text-red-500 text-center mb-2">{renewError}</p>}
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => sendContractAction("renewal", 1)}
                                className="flex flex-col items-center gap-1 py-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                                <span className="text-3xl font-black text-blue-700">1</span>
                                <span className="text-xs text-blue-600 font-medium">سنة</span>
                              </button>
                              <button onClick={() => sendContractAction("renewal", 2)}
                                className="flex flex-col items-center gap-1 py-4 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                                <span className="text-3xl font-black text-green-700">2</span>
                                <span className="text-xs text-green-600 font-medium">سنة</span>
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center mt-2">
                              يُجدَّد من اليوم
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── الوثائق ── */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" /> الوثائق ({documents.length})
            </h3>
            <Button size="sm" className="gap-1.5" onClick={() => setDocDialog(true)}>
              <Plus className="h-4 w-4" /> إضافة وثيقة
            </Button>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد وثائق مرفوعة</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map(doc => {
                const Icon = docTypeIcon[doc.type] ?? File;
                const expired  = isExpired(doc.expiryDate);
                const expiring = isExpiringSoon(doc.expiryDate);
                const isPdf = doc.fileUrl?.endsWith(".pdf");

                return (
                  <div key={doc.id} className={`relative group border rounded-xl p-4 ${expired ? "border-red-200 bg-red-50" : expiring ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
                    {/* حذف */}
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${expired ? "bg-red-100" : expiring ? "bg-amber-100" : "bg-purple-100"}`}>
                        {isPdf
                          ? <FileText className={`h-4 w-4 ${expired ? "text-red-600" : expiring ? "text-amber-600" : "text-purple-600"}`} />
                          : doc.fileUrl
                            ? <ImageIcon className={`h-4 w-4 ${expired ? "text-red-600" : expiring ? "text-amber-600" : "text-purple-600"}`} />
                            : <Icon className={`h-4 w-4 ${expired ? "text-red-600" : expiring ? "text-amber-600" : "text-purple-600"}`} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                        <p className="text-[10px] text-gray-400">{docTypeLabel[doc.type] ?? doc.type}</p>
                      </div>
                    </div>

                    {doc.expiryDate && (
                      <div className={`flex items-center gap-1 mt-2 text-[10px] font-medium ${expired ? "text-red-600" : expiring ? "text-amber-600" : "text-gray-400"}`}>
                        {(expired || expiring) && <AlertTriangle className="h-3 w-3" />}
                        {expired ? "منتهية — " : expiring ? "تنتهي قريباً — " : ""}
                        {new Date(doc.expiryDate).toLocaleDateString("ar-SA")}
                      </div>
                    )}

                    {doc.notes && <p className="text-[10px] text-gray-500 mt-1 truncate">{doc.notes}</p>}

                    {doc.fileUrl && (
                      <div className="flex gap-2 mt-3">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] text-sky-600 hover:underline">
                          <Eye className="h-3 w-3" /> عرض
                        </a>
                        <a href={doc.fileUrl} download
                          className="flex items-center gap-1 text-[10px] text-gray-500 hover:underline">
                          <Download className="h-3 w-3" /> تحميل
                        </a>
                      </div>
                    )}

                    <p className="text-[9px] text-gray-300 mt-1">{new Date(doc.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── العهد ── */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-sky-600" /> العهد ({custodies.length})
            </h3>
            <Button size="sm" className="gap-1.5" onClick={() => setCustodyDialog(true)}>
              <Plus className="h-4 w-4" /> إضافة عهدة
            </Button>
          </div>

          {custodies.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد عهد مسندة لهذا الموظف</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {custodies.map(c => {
                const Icon = custodyTypeIcon[c.type] ?? Package;
                const s = custodyStatusMap[c.status] ?? custodyStatusMap.pending;
                const SIcon = s.icon;
                return (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 relative group">
                    <button onClick={() => deleteCustody(c.id)}
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-400">{custodyTypeLabel[c.type] ?? c.type}</p>
                      </div>
                    </div>
                    {c.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{c.description}</p>}
                    {c.quantity != null && <p className="text-xs font-medium text-sky-700 mb-2">{c.quantity} {c.unit ?? ""}</p>}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${s.cls}`}><SIcon className="h-3 w-3" />{s.label}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── بطاقة بصمة متعدد الفروع ── */}
      <Card className={`border-2 transition-colors ${emp.multiLocation ? "border-indigo-300 bg-indigo-50/40" : "border-gray-200"}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${emp.multiLocation ? "bg-indigo-100" : "bg-gray-100"}`}>
                <Building2 className={`h-5 w-5 ${emp.multiLocation ? "text-indigo-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900">البصمة متعدد الفروع</p>
                <p className="text-xs text-gray-500">تمكين هذا الموظف من البصمة في أكثر من موقع أو فرع</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={toggleMultiLocation}
              disabled={togglingMultiLoc}
              className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${emp.multiLocation ? "bg-indigo-600" : "bg-gray-300"}`}
              style={{ width: "52px" }}
              title={emp.multiLocation ? "تعطيل" : "تفعيل"}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform ${emp.multiLocation ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </div>

          {emp.multiLocation && (
            <div className="mt-4 pt-4 border-t border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">الفروع المُخصصة ({empLocations.length})</p>
                {/* Add location dropdown */}
                <select
                  className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[180px]"
                  defaultValue=""
                  onChange={e => { if (e.target.value) { addEmpLocation(e.target.value); e.target.value = ""; } }}
                  disabled={addingLocation}
                >
                  <option value="">+ إضافة فرع</option>
                  {allLocations.filter(l => !empLocations.some(el => el.id === l.id)).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {empLocations.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">لم يُخصص أي فرع بعد — اختر فرعًا من القائمة أعلاه</p>
              ) : (
                <div className="space-y-2">
                  {empLocations.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between bg-white border border-indigo-100 rounded-xl px-3 py-2.5 group">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-indigo-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                          {loc.address && <p className="text-[11px] text-gray-400">{loc.address}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeEmpLocation(loc.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                        title="إزالة الفرع"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── معلومات تفصيلية ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><User className="h-4 w-4 text-sky-600" /> المعلومات الشخصية</h3>
            <div className="divide-y divide-gray-50">
              <InfoRow icon={Mail}     label="البريد الإلكتروني" value={emp.email} />
              <InfoRow icon={Phone}    label="الهاتف"            value={emp.phone} />
              <InfoRow icon={User}     label="رقم الهوية"        value={emp.nationalId} />
              <InfoRow icon={Calendar} label="تاريخ الميلاد"     value={emp.birthDate ? new Date(emp.birthDate).toLocaleDateString("ar-SA") : null} />
              <InfoRow icon={User}     label="الجنس"             value={genderLabel} />
              <InfoRow icon={User}     label="الحالة الاجتماعية" value={maritalLabel} />
              <InfoRow icon={MapPin}   label="العنوان"           value={[emp.address, emp.city].filter(Boolean).join("، ") || null} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4 text-green-600" /> المعلومات الوظيفية</h3>
            <div className="divide-y divide-gray-50">
              <InfoRow icon={Briefcase}  label="نوع التوظيف"          value={empTypeMap[emp.employmentType] ?? emp.employmentType} />
              <InfoRow icon={Calendar}   label="تاريخ التعيين"         value={new Date(emp.startDate).toLocaleDateString("ar-SA")} />
              {emp.endDate && <InfoRow icon={Calendar} label="انتهاء العقد" value={new Date(emp.endDate).toLocaleDateString("ar-SA")} />}
              <InfoRow icon={DollarSign} label="الراتب الأساسي"        value={`${emp.basicSalary.toLocaleString("ar-SA")} ر.س`} />
              <InfoRow icon={CreditCard} label="البنك"                 value={emp.bankName} />
              <InfoRow icon={CreditCard} label="IBAN"                  value={emp.iban} />
              {emp.manager && <InfoRow icon={Users} label="المدير المباشر" value={`${emp.manager.firstName} ${emp.manager.lastName}`} />}
            </div>
            {emp.subordinates && emp.subordinates.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">المرؤوسون ({emp.subordinates.length})</p>
                <div className="space-y-1.5">
                  {emp.subordinates.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-sky-600" onClick={() => router.push(`/employees/${s.id}`)}>
                      <EmployeeAvatar photo={s.photo} firstName={s.firstName} lastName={s.lastName} size="xs" />
                      <span>{s.firstName} {s.lastName}</span>
                      {s.jobTitle && <span className="text-xs text-gray-400">— {s.jobTitle}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-green-600" /> آخر الحضور</h3>
              {!emp.attendances?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">لا توجد سجلات</p>
              ) : (
                <div className="space-y-2">
                  {emp.attendances.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{new Date(a.date).toLocaleDateString("ar-SA")}</span>
                      <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "outline"} className="text-xs">
                        {a.status === "present" ? "حاضر" : a.status === "absent" ? "غائب" : a.status === "late" ? "متأخر" : a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /> آخر الرواتب</h3>
              {!emp.salaries?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">لا توجد رواتب</p>
              ) : (
                <div className="space-y-2">
                  {emp.salaries.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{monthNames[s.month - 1]} {s.year}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.netSalary.toLocaleString("ar-SA")} ر.س</span>
                        <Badge variant={s.status === "paid" ? "default" : "outline"} className="text-[10px]">
                          {s.status === "paid" ? "مصروف" : "معلق"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-purple-600" /> آخر الطلبات</h3>
              {!emp.requests?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">لا توجد طلبات</p>
              ) : (
                <div className="space-y-2">
                  {emp.requests.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-700">{r.title}</p>
                        <p className="text-[10px] text-gray-400">{typeMap[r.type] ?? r.type}</p>
                      </div>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"} className="text-[10px]">
                        {r.status === "approved" ? "موافق" : r.status === "rejected" ? "مرفوض" : "معلق"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialog إضافة وثيقة ── */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600" /> إضافة وثيقة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={docForm.type} onValueChange={v => setDocForm({ ...docForm, type: v ?? "other" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">🪪 هوية وطنية</SelectItem>
                  <SelectItem value="iqama">🪪 إقامة</SelectItem>
                  <SelectItem value="passport">🛂 جواز سفر</SelectItem>
                  <SelectItem value="contract">📄 عقد عمل</SelectItem>
                  <SelectItem value="certificate">🎓 شهادة</SelectItem>
                  <SelectItem value="medical">🏥 تقرير طبي</SelectItem>
                  <SelectItem value="other">📁 أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الاسم <span className="text-red-500">*</span></label>
              <Input value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} placeholder="مثال: هوية وطنية — عبدالله عرجة" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">تاريخ الانتهاء</label>
              <Input type="date" value={docForm.expiryDate} onChange={e => setDocForm({ ...docForm, expiryDate: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <Textarea rows={2} value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} placeholder="ملاحظة اختيارية..." className="text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الملف (صورة أو PDF)</label>
              <div
                onClick={() => docFileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
              >
                {docFile ? (
                  <p className="text-sm text-purple-700 font-medium">{docFile.name}</p>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6 text-gray-300" />
                    <p className="text-xs text-gray-400">اضغط لاختيار ملف</p>
                    <p className="text-[10px] text-gray-300">صور أو PDF — حتى 10 MB</p>
                  </div>
                )}
              </div>
              <input ref={docFileRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)}>إلغاء</Button>
            <Button disabled={docSaving || !docForm.name.trim()} onClick={addDocument}>
              {docSaving ? "جارٍ الرفع..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog إضافة عهدة ── */}
      {/* ═══════════════════════════════════════
          فترة التجربة + مكافأة نهاية الخدمة
      ═══════════════════════════════════════ */}
      {emp && (() => {
        const startDate = new Date(emp.startDate);
        const probEnd = (emp as any).probationEndDate ? new Date((emp as any).probationEndDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        const today = new Date();
        const probDaysLeft = Math.ceil((probEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isOnProbation = probDaysLeft > 0;

        // حساب مكافأة نهاية الخدمة (نظام العمل السعودي)
        const yearsOfService = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        const basicSalary = emp.basicSalary;
        let eosByResign = 0;
        let eosByTermination = 0;
        if (yearsOfService >= 2) {
          // بالاستقالة
          const first5 = Math.min(yearsOfService, 5);
          const beyond5 = Math.max(yearsOfService - 5, 0);
          const fullAmt = (first5 * basicSalary / 2) + (beyond5 * basicSalary);
          if (yearsOfService < 5) eosByResign = fullAmt / 3;
          else if (yearsOfService < 10) eosByResign = fullAmt * 2 / 3;
          else eosByResign = fullAmt;
          // بإنهاء العقد من صاحب العمل
          eosByTermination = (Math.min(yearsOfService, 5) * basicSalary / 2) + (Math.max(yearsOfService - 5, 0) * basicSalary);
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* فترة التجربة */}
            <div className={`rounded-2xl border p-4 ${isOnProbation ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}`}>
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck className={`h-5 w-5 ${isOnProbation ? "text-amber-500" : "text-green-500"}`} />
                <h3 className="font-semibold text-sm">فترة التجربة</h3>
              </div>
              {isOnProbation ? (
                <>
                  <p className="text-2xl font-black text-amber-600">{probDaysLeft} يوم</p>
                  <p className="text-xs text-amber-600/70 mt-1">متبقٍ — تنتهي في {probEnd.toLocaleDateString("ar-SA")}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-green-700">اجتاز فترة التجربة</p>
                  <p className="text-xs text-green-600/70 mt-1">انتهت في {probEnd.toLocaleDateString("ar-SA")}</p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">مدة الخدمة: {yearsOfService >= 1 ? `${Math.floor(yearsOfService)} سنة` : `${Math.floor(yearsOfService * 12)} شهر`}</p>
            </div>

            {/* مكافأة نهاية الخدمة */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-sky-500" />
                <h3 className="font-semibold text-sm">مكافأة نهاية الخدمة</h3>
              </div>
              {yearsOfService < 2 ? (
                <p className="text-xs text-muted-foreground">لا يستحق المكافأة (أقل من سنتين)</p>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">عند الاستقالة</p>
                    <p className="text-lg font-black text-sky-700">{Math.round(eosByResign).toLocaleString("ar-SA")} ر.س</p>
                  </div>
                  <div className="border-t border-sky-200 pt-2">
                    <p className="text-xs text-muted-foreground">عند إنهاء العقد من صاحب العمل</p>
                    <p className="text-lg font-black text-sky-700">{Math.round(eosByTermination).toLocaleString("ar-SA")} ر.س</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">بناءً على الراتب الأساسي — {Math.floor(yearsOfService)} سنة خدمة</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════
          خطابات التعريف
      ═══════════════════════════════════════ */}
      {emp && (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Scroll className="h-5 w-5 text-violet-500" />
            <h3 className="font-semibold text-sm">خطابات التعريف</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "شهادة راتب", fn: () => generateSalaryCertificate({ employeeName: `${emp.firstName} ${emp.lastName}`, arabicName: (emp as any).arabicName, employeeNumber: emp.employeeNumber, jobTitle: emp.jobTitle, department: emp.department, nationality: emp.nationality, startDate: emp.startDate, basicSalary: emp.basicSalary, housingAllowance: (emp as any).housingAllowance ?? 0, transportAllowance: (emp as any).transportAllowance ?? 0, otherAllowance: (emp as any).otherAllowance ?? 0 }) },
              { label: "خطاب توظيف", fn: () => generateEmploymentLetter({ employeeName: `${emp.firstName} ${emp.lastName}`, employeeNumber: emp.employeeNumber, jobTitle: emp.jobTitle, department: emp.department, startDate: emp.startDate }) },
              { label: "شهادة خبرة", fn: () => generateExperienceLetter({ employeeName: `${emp.firstName} ${emp.lastName}`, employeeNumber: emp.employeeNumber, jobTitle: emp.jobTitle, department: emp.department, startDate: emp.startDate, endDate: emp.endDate }) },
            ].map(({ label, fn }) => (
              <Button key={label} variant="outline" size="sm" className="gap-1.5" onClick={fn}>
                <Download className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          الجزاءات والإنذارات
      ═══════════════════════════════════════ */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h3 className="font-semibold text-sm">الجزاءات والإنذارات</h3>
            {disciplinaries.length > 0 && <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">{disciplinaries.length}</span>}
          </div>
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setDiscDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> إضافة
          </Button>
        </div>
        {disciplinaries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">لا توجد جزاءات مسجّلة</p>
        ) : (
          <div className="space-y-2">
            {disciplinaries.map(d => {
              const typeLabels: Record<string, { label: string; color: string }> = {
                verbal_warning:  { label: "إنذار شفهي",   color: "bg-amber-100 text-amber-700" },
                written_warning: { label: "إنذار كتابي",  color: "bg-orange-100 text-orange-700" },
                final_warning:   { label: "إنذار نهائي",  color: "bg-red-100 text-red-700" },
                suspension:      { label: "وقف عن العمل", color: "bg-slate-100 text-slate-700" },
                deduction:       { label: "خصم مالي",     color: "bg-rose-100 text-rose-700" },
              };
              const t_ = typeLabels[d.type] ?? { label: d.type, color: "bg-gray-100 text-gray-700" };
              return (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${t_.color}`}>{t_.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.reason}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString("ar-SA")} · {d.issuedBy}</p>
                    {d.penalty && <p className="text-xs text-rose-600">خصم: {d.penalty} ر.س</p>}
                    {d.days && <p className="text-xs text-slate-600">أيام الوقف: {d.days}</p>}
                  </div>
                  {d.status === "active" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 shrink-0"
                      onClick={async () => { await fetch(`/api/disciplinary/${d.id}`, { method: "DELETE" }); fetch(`/api/disciplinary?employeeId=${id}`).then(r => r.json()).then(x => setDisciplinaries(Array.isArray(x) ? x : [])); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Disciplinary Dialog ── */}
      <Dialog open={discDialog} onOpenChange={setDiscDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              إضافة جزاء / إنذار
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={discForm.type} onValueChange={v => { if (v) setDiscForm(f => ({ ...f, type: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verbal_warning">إنذار شفهي</SelectItem>
                  <SelectItem value="written_warning">إنذار كتابي</SelectItem>
                  <SelectItem value="final_warning">إنذار نهائي</SelectItem>
                  <SelectItem value="suspension">وقف عن العمل</SelectItem>
                  <SelectItem value="deduction">خصم مالي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">السبب *</label>
              <Input value={discForm.reason} onChange={e => setDiscForm(f => ({ ...f, reason: e.target.value }))} placeholder="سبب الجزاء" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التفاصيل</label>
              <Input value={discForm.description} onChange={e => setDiscForm(f => ({ ...f, description: e.target.value }))} placeholder="تفاصيل إضافية (اختياري)" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ</label>
              <Input type="date" value={discForm.date} onChange={e => setDiscForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            {discForm.type === "deduction" && (
              <div>
                <label className="text-sm font-medium mb-1 block">مبلغ الخصم (ر.س)</label>
                <Input type="number" min="0" value={discForm.penalty} onChange={e => setDiscForm(f => ({ ...f, penalty: e.target.value }))} />
              </div>
            )}
            {discForm.type === "suspension" && (
              <div>
                <label className="text-sm font-medium mb-1 block">عدد الأيام</label>
                <Input type="number" min="1" value={discForm.days} onChange={e => setDiscForm(f => ({ ...f, days: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscDialog(false)}>إلغاء</Button>
            <Button disabled={discSaving || !discForm.reason} onClick={async () => {
              setDiscSaving(true);
              await fetch("/api/disciplinary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId: id, ...discForm }) });
              setDiscDialog(false);
              setDiscForm({ type: "verbal_warning", reason: "", description: "", date: new Date().toISOString().slice(0, 10), penalty: "", days: "" });
              fetch(`/api/disciplinary?employeeId=${id}`).then(r => r.json()).then(x => setDisciplinaries(Array.isArray(x) ? x : []));
              setDiscSaving(false);
            }}>
              {discSaving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={custodyDialog} onOpenChange={setCustodyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة عهدة للموظف</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={custodyForm.type} onValueChange={v => setCustodyForm({ ...custodyForm, type: v ?? "equipment" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">🖥️ جهاز / معدة</SelectItem>
                  <SelectItem value="leave_balance">📅 رصيد إجازة</SelectItem>
                  <SelectItem value="travel_ticket">✈️ تذكرة سفر</SelectItem>
                  <SelectItem value="other">📦 أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">العنوان <span className="text-red-500">*</span></label>
              <Input value={custodyForm.title} onChange={e => setCustodyForm({ ...custodyForm, title: e.target.value })}
                placeholder={custodyForm.type === "equipment" ? "لابتوب Dell XPS" : "وصف العهدة"} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التفاصيل</label>
              <Textarea value={custodyForm.description} onChange={e => setCustodyForm({ ...custodyForm, description: e.target.value })}
                placeholder="تفاصيل إضافية..." rows={2} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">الكمية</label>
                <Input type="number" min="0" step="0.5" value={custodyForm.quantity}
                  onChange={e => setCustodyForm({ ...custodyForm, quantity: e.target.value })} placeholder="1" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الوحدة</label>
                <Input value={custodyForm.unit} onChange={e => setCustodyForm({ ...custodyForm, unit: e.target.value })} placeholder="قطعة" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustodyDialog(false)}>إلغاء</Button>
            <Button disabled={custodySaving || !custodyForm.title.trim()} onClick={addCustody}>
              {custodySaving ? "جارٍ الحفظ..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
