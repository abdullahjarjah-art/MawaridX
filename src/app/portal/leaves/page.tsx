"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarDays, TrendingUp, Paperclip, FileText } from "lucide-react";

type Leave = {
  id: string; type: string; startDate: string; endDate: string;
  days: number; reason?: string; status: string; attachmentUrl?: string | null;
};

type Balance = {
  annual: number; sick: number; emergency: number;
  usedAnnual: number; usedSick: number; usedEmergency: number;
};

function calcAccruedLeave(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const years = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const accrued = Math.floor(months * 2.5 * 10) / 10;
  return { months, accrued, years };
}

const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة",
  unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};
const leaveStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "بانتظار المدير", variant: "outline" },
  manager_approved: { label: "بانتظار الإدارة", variant: "secondary" },
  approved: { label: "موافق عليها", variant: "default" },
  rejected: { label: "مرفوضة", variant: "destructive" },
};

const emptyForm = { type: "annual", startDate: "", endDate: "", reason: "", attachmentUrl: "" };

export default function PortalLeavesPage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "leaves");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "فشل رفع الملف");
      } else {
        setForm(f => ({ ...f, attachmentUrl: data.url }));
      }
    } catch {
      setUploadError("فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const fetchLeaves = async (empId: string) => {
    const res = await fetch(`/api/leaves?employeeId=${empId}`);
    setLeaves(await res.json());
  };

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.employee?.id) {
        setEmployeeId(data.employee.id);
        setStartDate(data.employee.startDate ?? null);
        fetchLeaves(data.employee.id);
        fetch(`/api/leave-balance?employeeId=${data.employee.id}&year=${new Date().getFullYear()}`)
          .then(r => r.json()).then(b => { if (!b.error) setBalance(b); }).catch(() => {});
      }
    });
  }, []);

  const days = form.startDate && form.endDate
    ? Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1
    : 0;

  const submit = async () => {
    if (!employeeId || days <= 0) return;
    setSubmitError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "حدث خطأ أثناء إرسال الطلب");
        setSaving(false);
        return;
      }
      setSaving(false);
      setOpen(false);
      setForm(emptyForm);
      setUploadError(null);
      setSuccess("تم إرسال طلب الإجازة بنجاح");
      setTimeout(() => setSuccess(null), 4000);
      fetchLeaves(employeeId);
    } catch {
      setSubmitError("تعذّر الاتصال بالخادم — تحقق من اتصالك");
      setSaving(false);
    }
  };

  const approved = leaves.filter(l => l.status === "approved").length;
  const pending = leaves.filter(l => l.status === "pending" || l.status === "manager_approved").length;

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">طلبات الإجازة</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm); setSubmitError(null); setUploadError(null); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> طلب إجازة
        </Button>
      </div>

      {/* الأيام المستحقة بناءً على مدة الخدمة */}
      {/* رسالة النجاح */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          ✅ {success}
        </div>
      )}

      {startDate && (() => {
        const { months, accrued, years } = calcAccruedLeave(startDate);
        const used = balance?.usedAnnual ?? 0;
        const remaining = Math.max(0, accrued - used);
        const nextMonthAccrual = Math.floor((months + 1) * 2.5 * 10) / 10 - accrued;
        return (
          <Card className="mb-4 border-sky-100 bg-gradient-to-br from-sky-50 to-sky-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-600" />
                  <span className="font-bold text-sm text-gray-900">الإجازة السنوية المستحقة</span>
                </div>
                <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">
                  {years > 0 ? `${years} س ` : ""}{months % 12} شهر خدمة
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white rounded-xl p-2 text-center shadow-sm">
                  <p className="text-[10px] text-gray-500">مستحق</p>
                  <p className="text-lg font-bold text-sky-700">{accrued}</p>
                  <p className="text-[10px] text-gray-400">يوم</p>
                </div>
                <div className="bg-white rounded-xl p-2 text-center shadow-sm">
                  <p className="text-[10px] text-gray-500">مستخدم</p>
                  <p className="text-lg font-bold text-orange-600">{used}</p>
                  <p className="text-[10px] text-gray-400">يوم</p>
                </div>
                <div className={`rounded-xl p-2 text-center shadow-sm ${remaining > 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-[10px] text-gray-500">المتبقي</p>
                  <p className={`text-lg font-bold ${remaining > 0 ? "text-green-700" : "text-red-600"}`}>{remaining}</p>
                  <p className="text-[10px] text-gray-400">يوم</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-white/60 rounded-lg px-3 py-1.5">
                <CalendarDays className="h-3 w-3 text-sky-400 shrink-0" />
                <span>معدل الاستحقاق: 2.5 يوم/شهر · في الشهر القادم ستستحق {nextMonthAccrual} يوم إضافي</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* رصيد الإجازات */}
      {balance && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-sky-50 border-sky-100">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-sky-600 font-medium">سنوية</p>
              <p className="text-xl font-bold text-sky-700">{balance.annual - balance.usedAnnual}</p>
              <p className="text-[10px] text-sky-500">من {balance.annual} يوم</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-green-600 font-medium">مرضية</p>
              <p className="text-xl font-bold text-green-700">{balance.sick - balance.usedSick}</p>
              <p className="text-[10px] text-green-500">من {balance.sick} يوم</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-orange-600 font-medium">طارئة</p>
              <p className="text-xl font-bold text-orange-700">{balance.emergency - balance.usedEmergency}</p>
              <p className="text-[10px] text-orange-500">من {balance.emergency} يوم</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{approved}</p>
            <p className="text-sm text-gray-500 mt-1">إجازات موافق عليها</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{pending}</p>
            <p className="text-sm text-gray-500 mt-1">طلبات قيد المراجعة</p>
          </CardContent>
        </Card>
      </div>

      {leaves.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            لا توجد طلبات إجازة — اضغط على زر طلب إجازة للبدء
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{leaveTypeMap[l.type] ?? l.type}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{l.days} يوم</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(l.startDate).toLocaleDateString("ar-SA")} — {new Date(l.endDate).toLocaleDateString("ar-SA")}
                    </p>
                    {l.reason && <p className="text-xs text-gray-500 mt-1">{l.reason}</p>}
                    {l.attachmentUrl && (
                      <a
                        href={l.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 hover:bg-green-100"
                      >
                        <Paperclip className="h-3 w-3" />
                        عذر طبي مرفق
                      </a>
                    )}
                  </div>
                  <Badge variant={leaveStatusMap[l.status]?.variant ?? "outline"}>
                    {leaveStatusMap[l.status]?.label ?? l.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>طلب إجازة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>نوع الإجازة</Label>
              <Select value={form.type} onValueChange={(v) => { setForm({ ...form, type: v ?? "annual", attachmentUrl: "" }); setUploadError(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">سنوية</SelectItem>
                  <SelectItem value="sick">مرضية</SelectItem>
                  <SelectItem value="emergency">طارئة</SelectItem>
                  <SelectItem value="unpaid">بدون راتب</SelectItem>
                  <SelectItem value="maternity">أمومة</SelectItem>
                  <SelectItem value="paternity">أبوة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>من</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>إلى</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            {days > 0 && (
              <div className="bg-sky-50 text-sky-700 text-sm text-center py-2 rounded-lg font-medium">
                {days} يوم
              </div>
            )}
            <div className="space-y-1">
              <Label>السبب</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="اكتب سبب الإجازة..." />
            </div>

            {form.type === "sick" && (
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-green-600" />
                  العذر الطبي (PDF أو صورة)
                </Label>
                <p className="text-[11px] text-gray-500 -mt-1">
                  إرفاق العذر الطبي يمنع الخصم من رصيد الإجازة المرضية. الحد الأقصى 5 ميجابايت.
                </p>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="text-xs"
                />
                {uploading && <p className="text-xs text-sky-600">جارٍ رفع الملف...</p>}
                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                {form.attachmentUrl && !uploading && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 text-green-700">
                      <FileText className="h-4 w-4" />
                      تم رفع المرفق بنجاح
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, attachmentUrl: "" }))}
                      className="text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {submitError && (
            <div className="mx-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              ⚠️ {submitError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submit} disabled={saving || days <= 0 || uploading}>
              {saving ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
