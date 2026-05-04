"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Clock, CheckCircle, XCircle, RefreshCw, Timer } from "lucide-react";
import { useLang } from "@/components/lang-provider";

type Request = {
  id: string; type: string; title: string; details?: string;
  status: string; createdAt: string; managerNote?: string; hrNote?: string;
  startDate?: string; endDate?: string; amount?: number;
};


const emptyForm = { type: "", title: "", details: "", startDate: "", endDate: "", amount: "", returnDate: "", exitTime: "", returnTime: "", checkType: "", fixDate: "", fixTime: "", overtimeDate: "", overtimeHours: "", overtimeMins: "0" };

export default function PortalRequestsPage() {
  const { t } = useLang();

  const requestTypes = [
    { value: "leave",          label: t("طلب إجازة"),         fields: ["dates"] },
    { value: "attendance_fix", label: t("تصحيح بصمة"),        fields: ["attendance_fix", "details"] },
    { value: "loan",           label: t("طلب سلفة"),           fields: ["amount", "returnDate", "details"] },
    { value: "custody",        label: t("طلب عهدة"),           fields: ["details"] },
    { value: "exit_return",    label: t("طلب خروج وعودة"),    fields: ["exitReturn", "details"] },
    { value: "resignation",    label: t("طلب استقالة"),        fields: ["startDate", "details"] },
    { value: "letter",         label: t("طلب خطاب"),           fields: ["details"] },
    { value: "overtime",       label: t("ساعات عمل إضافية"),   fields: ["overtime_fields", "details"] },
  ];

  const statusMap: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary"; icon: React.ReactNode }> = {
    pending:           { label: t("قيد المراجعة"),       variant: "outline",     icon: <Clock className="h-3 w-3" /> },
    manager_approved:  { label: t("بانتظار الإدارة"),    variant: "secondary",   icon: <Clock className="h-3 w-3" /> },
    approved:          { label: t("معتمد"),              variant: "default",     icon: <CheckCircle className="h-3 w-3" /> },
    rejected:          { label: t("مرفوض"),              variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  };

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = (empId: string) => {
    fetch(`/api/requests?employeeId=${empId}`).then(r => r.json()).then(setRequests);
  };

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.employee?.id) {
        setEmployeeId(data.employee.id);
        setManagerId(data.employee.managerId ?? null);
        loadRequests(data.employee.id);
      }
    });
  }, []);

  const selectedType = requestTypes.find(t => t.value === form.type);

  const handleSubmit = async () => {
    setError("");
    if (!form.type) { setError(t("يرجى اختيار نوع الطلب")); return; }
    if (!form.title) { setError(t("يرجى كتابة عنوان الطلب")); return; }
    if (form.type === "attendance_fix") {
      if (!form.fixDate) { setError(t("يرجى تحديد تاريخ البصمة")); return; }
      if (!form.checkType) { setError(t("يرجى اختيار نوع البصمة")); return; }
      if (!form.fixTime) { setError(t("يرجى إدخال الوقت الصحيح")); return; }
    }
    if (form.type === "overtime") {
      if (!form.overtimeDate) { setError(t("يرجى تحديد تاريخ الأوفرتايم")); return; }
      if (!form.overtimeHours && !form.overtimeMins) { setError(t("يرجى إدخال عدد الساعات أو الدقائق")); return; }
    }
    setLoading(true);
    // نجمع التاريخ + الوقت لطلب تصحيح البصمة
    const fixDatetime = form.fixDate && form.fixTime ? `${form.fixDate}T${form.fixTime}` : "";
    // حساب إجمالي دقائق الأوفرتايم
    const overtimeTotalMins = form.type === "overtime"
      ? (parseInt(form.overtimeHours || "0") * 60) + parseInt(form.overtimeMins || "0")
      : 0;
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        employeeId,
        startDate: form.type === "attendance_fix" ? form.fixDate : form.type === "overtime" ? form.overtimeDate : form.startDate,
        exitTime: form.type === "attendance_fix" ? fixDatetime : form.exitTime,
        checkType: form.type === "attendance_fix" ? form.checkType : undefined,
        amount: form.type === "overtime" ? overtimeTotalMins : form.amount,
      }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? t("حدث خطأ")); return; }
    setOpen(false);
    setForm(emptyForm);
    if (employeeId) loadRequests(employeeId);
  };

  // موافقة أو رفض طلب تجديد العقد
  const handleRenewalAction = async (requestId: string, action: "approved" | "rejected") => {
    setActionLoading(requestId + action);
    const res = await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    setActionLoading(null);
    if (res.ok && employeeId) {
      loadRequests(employeeId);
    }
  };

  const typeLabel = (type: string) => {
    if (type === "contract_renewal") return t("تجديد عقد");
    if (type === "overtime") return t("ساعات عمل إضافية");
    return requestTypes.find(t => t.value === type)?.label ?? type;
  };

  // فصل طلبات العقد (من الإدارة للموظف) عن طلبات الموظف العادية
  const contractRequests = requests.filter(r => r.type === "contract_renewal" || r.type === "contract_non_renewal");
  const normalRequests   = requests.filter(r => r.type !== "contract_renewal" && r.type !== "contract_non_renewal");

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("طلباتي")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("تقديم ومتابعة طلباتك")}</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setError(""); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {t("طلب جديد")}
        </Button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t("الكل"), count: normalRequests.length, color: "bg-sky-50 text-sky-700" },
          { label: t("معلقة"), count: normalRequests.filter(r => r.status === "pending" || r.status === "manager_approved").length, color: "bg-yellow-50 text-yellow-700" },
          { label: t("معتمدة"), count: normalRequests.filter(r => r.status === "approved").length, color: "bg-green-50 text-green-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── طلبات العقد الواردة من الإدارة ── */}
      {contractRequests.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            {t("إشعارات العقد من الإدارة")}
          </h2>
          <div className="space-y-3">
            {contractRequests.map(r => {
              const isRenewal    = r.type === "contract_renewal";
              const isPending    = r.status === "pending";
              const isApproved   = r.status === "approved";
              const isRejected   = r.status === "rejected";
              const borderColor  = isPending
                ? (isRenewal ? "border-blue-200 bg-blue-50/30" : "border-orange-200 bg-orange-50/30")
                : isApproved ? "border-green-200 bg-green-50/30"
                : "border-red-200 bg-red-50/30";

              return (
                <Card key={r.id} className={`border-2 ${borderColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isRenewal ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {isRenewal ? t("تجديد عقد") : t("عدم تجديد عقد")}
                          </span>
                          {isPending && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {isRenewal ? t("بانتظار موافقتك") : t("بانتظار تأكيد الاستلام")}
                            </span>
                          )}
                          {isApproved && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {isRenewal ? t("وافقت") : t("تم التأكيد")}
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> {t("رفضت")}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                        {r.details && <p className="text-xs text-gray-500 mt-1">{r.details}</p>}
                      </div>

                      {/* أزرار الإجراء */}
                      {isPending && (
                        <div className="flex gap-2 shrink-0">
                          {isRenewal ? (
                            <>
                              <button
                                onClick={() => handleRenewalAction(r.id, "approved")}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                {actionLoading === r.id + "approved"
                                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle className="h-3.5 w-3.5" />}
                                {t("موافقة")}
                              </button>
                              <button
                                onClick={() => handleRenewalAction(r.id, "rejected")}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                {actionLoading === r.id + "rejected"
                                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  : <XCircle className="h-3.5 w-3.5" />}
                                {t("رفض")}
                              </button>
                            </>
                          ) : (
                            /* عدم تجديد: تأكيد الاستلام فقط */
                            <button
                              onClick={() => handleRenewalAction(r.id, "approved")}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {actionLoading === r.id + "approved"
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCircle className="h-3.5 w-3.5" />}
                              {t("تأكيد الاستلام")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString("ar-SA")}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── الطلبات العادية ── */}
      {normalRequests.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{t("لا توجد طلبات — اضغط \"طلب جديد\" للبدء")}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {normalRequests.map(r => {
            const s = statusMap[r.status] ?? statusMap.pending;
            return (
              <Card key={r.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{typeLabel(r.type)}</span>
                        <Badge variant={s.variant} className="gap-1 text-xs">
                          {s.icon}{s.label}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                      {r.details && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.details}</p>}
                      {(r.managerNote || r.hrNote) && (
                        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                          {r.managerNote && <p className="text-xs text-gray-500">{t("ملاحظة المدير")}: <span className="text-gray-700">{r.managerNote}</span></p>}
                          {r.hrNote && <p className="text-xs text-gray-500">{t("ملاحظة الإدارة")}: <span className="text-gray-700">{r.hrNote}</span></p>}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{new Date(r.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog تقديم طلب */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("طلب جديد")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t("نوع الطلب")} <span className="text-red-500">*</span></Label>
              <Select value={form.type} onValueChange={v => setForm({ ...emptyForm, type: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder={t("اختر نوع الطلب")} /></SelectTrigger>
                <SelectContent>
                  {requestTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.type && (
              <>
                <div className="space-y-1">
                  <Label>{t("العنوان")} <span className="text-red-500">*</span></Label>
                  <Input placeholder={t("عنوان مختصر للطلب")} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                {selectedType?.fields.includes("dates") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("من تاريخ")}</Label>
                      <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("إلى تاريخ")}</Label>
                      <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>
                )}

                {selectedType?.fields.includes("startDate") && (
                  <div className="space-y-1">
                    <Label>{t("التاريخ")}</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                )}

                {selectedType?.fields.includes("amount") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("المبلغ (ر.س)")}</Label>
                      <Input type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("تاريخ السداد")}</Label>
                      <Input type="date" value={form.returnDate} onChange={e => setForm({ ...form, returnDate: e.target.value })} />
                    </div>
                  </div>
                )}

                {selectedType?.fields.includes("exitReturn") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("وقت الخروج")}</Label>
                      <Input type="datetime-local" value={form.exitTime} onChange={e => setForm({ ...form, exitTime: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("وقت العودة")}</Label>
                      <Input type="datetime-local" value={form.returnTime} onChange={e => setForm({ ...form, returnTime: e.target.value })} />
                    </div>
                  </div>
                )}

                {selectedType?.fields.includes("overtime_fields") && (
                  <div className="space-y-3">
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-2">
                      <Timer className="h-4 w-4 text-violet-600 shrink-0" />
                      <p className="text-xs text-violet-700">{t("أدخل تاريخ العمل الإضافي وعدد الساعات — ستُضاف تلقائياً لسجل حضورك عند الموافقة")}</p>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("تاريخ العمل الإضافي")} <span className="text-red-500">*</span></Label>
                      <Input type="date" value={form.overtimeDate}
                        onChange={e => setForm({ ...form, overtimeDate: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>{t("الساعات")}</Label>
                        <Input type="number" min="0" max="23" placeholder="0"
                          value={form.overtimeHours}
                          onChange={e => setForm({ ...form, overtimeHours: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>{t("الدقائق")}</Label>
                        <Select value={form.overtimeMins}
                          onValueChange={v => setForm({ ...form, overtimeMins: v ?? "0" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["0","15","30","45"].map(m => <SelectItem key={m} value={m}>{m} {t("دقيقة")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* معاينة الإجمالي */}
                    {(form.overtimeHours || form.overtimeMins !== "0") && (
                      <div className="bg-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700 font-medium">
                        {t("الإجمالي")}: {form.overtimeHours || "0"} {t("ساعة")} {form.overtimeMins !== "0" ? `${form.overtimeMins} ${t("دقيقة")}` : ""}
                        {" — "}
                        {((parseInt(form.overtimeHours || "0") * 60) + parseInt(form.overtimeMins || "0"))} {t("دقيقة")}
                      </div>
                    )}
                  </div>
                )}

                {selectedType?.fields.includes("attendance_fix") && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>{t("تاريخ البصمة المراد تصحيحها")} <span className="text-red-500">*</span></Label>
                      <Input type="date" value={form.fixDate} onChange={e => setForm({ ...form, fixDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("نوع البصمة")} <span className="text-red-500">*</span></Label>
                      <Select value={form.checkType} onValueChange={v => setForm({ ...form, checkType: v ?? "" })}>
                        <SelectTrigger><SelectValue placeholder={t("اختر نوع البصمة")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">{t("بصمة دخول")}</SelectItem>
                          <SelectItem value="out">{t("بصمة خروج")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("الوقت الصحيح")} <span className="text-red-500">*</span></Label>
                      <Input type="time" value={form.fixTime} onChange={e => setForm({ ...form, fixTime: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label>{t("التفاصيل والملاحظات")}</Label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    rows={3}
                    placeholder={t("اكتب تفاصيل إضافية...")}
                    value={form.details}
                    onChange={e => setForm({ ...form, details: e.target.value })}
                  />
                </div>

                {!managerId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    {t("سيتم إرسال الطلب مباشرة إلى الإدارة")}
                  </div>
                )}
              </>
            )}
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء")}</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.type}>
              {loading ? t("جارٍ الإرسال...") : t("إرسال الطلب")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
