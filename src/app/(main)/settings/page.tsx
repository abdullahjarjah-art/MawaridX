"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Save, Clock, Timer, Mail, Send, ArrowLeft, CalendarCheck, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Users, User, Database, Download, Trash2, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useLang } from "@/components/lang-provider";

type SmtpSettings = {
  smtp_host: string; smtp_port: string; smtp_secure: string;
  smtp_user: string; smtp_pass: string; smtp_from: string; smtp_enabled: string;
};
type AttendanceSettings = {
  type: "fixed" | "flexible";
  checkInTime: string;
  checkOutTime: string;
  requiredHours: number;
  lateToleranceMinutes: number;
};

const DEFAULT_SMTP: SmtpSettings = { smtp_host: "", smtp_port: "587", smtp_secure: "false", smtp_user: "", smtp_pass: "", smtp_from: "", smtp_enabled: "false" };
const DEFAULT_ATT: AttendanceSettings = { type: "fixed", checkInTime: "08:00", checkOutTime: "17:00", requiredHours: 8, lateToleranceMinutes: 15 };

export default function SettingsPage() {
  const { t } = useLang();
  const [att, setAtt] = useState<AttendanceSettings>(DEFAULT_ATT);
  const [attSaved, setAttSaved] = useState(false);
  const [smtp, setSmtp] = useState<SmtpSettings>(DEFAULT_SMTP);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  // ترحيل رصيد الإجازات
  const currentYear = new Date().getFullYear();
  const [carryFromYear, setCarryFromYear] = useState(String(currentYear - 1));
  const [carryToYear, setCarryToYear] = useState(String(currentYear));
  const [maxCarryAnnual, setMaxCarryAnnual] = useState("15");
  const [maxCarrySick, setMaxCarrySick] = useState("0");
  const [maxCarryEmergency, setMaxCarryEmergency] = useState("0");
  const [carryLoading, setCarryLoading] = useState(false);
  const [carryResult, setCarryResult] = useState<{ message: string; carried: number; skipped: number; results: { name: string; carriedAnnual: number; newAnnual: number; skipped?: boolean }[] } | null>(null);
  const [carryError, setCarryError] = useState<string | null>(null);
  const [showCarryDetails, setShowCarryDetails] = useState(false);
  const [carryPreview, setCarryPreview] = useState<{ name: string; remainAnnual: number; remainSick: number; remainEmergency: number }[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // النسخ الاحتياطية
  type BackupItem = { name: string; sizeBytes: number; createdAt: string };
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadBackups = () =>
    fetch("/api/admin/backup").then(r => r.json()).then(d => setBackups(Array.isArray(d) ? d : []));

  const doBackup = async () => {
    setBackupLoading(true); setBackupMsg(null);
    const res = await fetch("/api/admin/backup", { method: "POST" });
    const data = await res.json();
    setBackupMsg({ text: res.ok ? data.message : data.error, ok: res.ok });
    if (res.ok) loadBackups();
    setBackupLoading(false);
  };

  const doDelete = async (name: string) => {
    if (!confirm(`حذف "${name}"؟`)) return;
    await fetch(`/api/admin/backup?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    loadBackups();
  };

  const fmtSize = (b: number) => b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

  // وضع الترحيل: للجميع أو موظف محدد
  const [carryMode, setCarryMode] = useState<"all" | "single">("all");
  const [carryEmpSearch, setCarryEmpSearch] = useState("");
  const [carryEmpId, setCarryEmpId] = useState("");
  const [carryEmpList, setCarryEmpList] = useState<{ id: string; firstName: string; lastName: string; employeeNumber: string }[]>([]);
  const [carryEmpDropdown, setCarryEmpDropdown] = useState(false);

  useEffect(() => {
    if (carryMode === "single" && carryEmpSearch.length >= 2) {
      fetch(`/api/employees?all=1&search=${encodeURIComponent(carryEmpSearch)}`)
        .then(r => r.json())
        .then(d => setCarryEmpList(Array.isArray(d) ? d : (d.data ?? [])));
      setCarryEmpDropdown(true);
    } else {
      setCarryEmpDropdown(false);
    }
  }, [carryEmpSearch, carryMode]);

  const previewCarryover = async () => {
    setPreviewLoading(true);
    setCarryPreview(null);
    try {
      const params = new URLSearchParams({ fromYear: carryFromYear });
      if (carryMode === "single" && carryEmpId) params.set("employeeId", carryEmpId);
      const res = await fetch(`/api/leave-balance/carryover?${params}`);
      const data = await res.json();
      setCarryPreview(data.employees ?? []);
    } catch { setCarryPreview(null); }
    setPreviewLoading(false);
  };

  const executeCarryover = async () => {
    if (carryMode === "single" && !carryEmpId) return;
    setCarryLoading(true);
    setCarryResult(null);
    setCarryError(null);
    try {
      const body: Record<string, unknown> = {
        fromYear: Number(carryFromYear),
        toYear: Number(carryToYear),
        maxCarryAnnual: Number(maxCarryAnnual),
        maxCarrySick: Number(maxCarrySick),
        maxCarryEmergency: Number(maxCarryEmergency),
      };
      if (carryMode === "single" && carryEmpId) body.employeeId = carryEmpId;
      const res = await fetch("/api/leave-balance/carryover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setCarryError(data.error ?? t("حدث خطأ")); }
      else { setCarryResult(data); setCarryPreview(null); }
    } catch { setCarryError(t("فشل الاتصال بالسيرفر")); }
    setCarryLoading(false);
  };

  useEffect(() => {
    fetch("/api/settings/attendance").then(r => r.json()).then(d => { if (d) setAtt(d); });
    fetch("/api/settings/smtp").then(r => r.json()).then(d => { if (d) setSmtp(s => ({ ...s, ...d })); });
    loadBackups();
  }, []);

  const saveAtt = async () => {
    await fetch("/api/settings/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(att) });
    setAttSaved(true);
    setTimeout(() => setAttSaved(false), 3000);
  };

  const saveSmtp = async () => {
    await fetch("/api/settings/smtp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(smtp) });
    setSmtpSaved(true);
    setTimeout(() => setSmtpSaved(false), 3000);
  };

  const testSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/settings/smtp/test", { method: "POST" });
      const data = await res.json();
      setSmtpTestResult(data.success ? t("تم إرسال رسالة تجريبية بنجاح!") : `${t("فشل")}: ${data.error ?? t("خطأ غير معروف")}`);
    } catch {
      setSmtpTestResult(t("فشل الاتصال"));
    }
    setSmtpTesting(false);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("إعدادات النظام")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("إعدادات الموقع والدوام")}</p>
      </div>

      {/* ===== إعدادات الدوام ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" />
            {t("إعدادات الدوام")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* نوع الدوام */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setAtt(a => ({ ...a, type: "fixed" }))}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${att.type === "fixed" ? "border-sky-600 bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Clock className={`h-6 w-6 ${att.type === "fixed" ? "text-sky-600" : "text-gray-400"}`} />
              <div className="text-center">
                <p className={`font-semibold text-sm ${att.type === "fixed" ? "text-sky-700" : "text-gray-700"}`}>{t("دوام ثابت")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("وقت دخول وخروج محدد")}</p>
              </div>
            </button>
            <button
              onClick={() => setAtt(a => ({ ...a, type: "flexible" }))}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${att.type === "flexible" ? "border-sky-600 bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Timer className={`h-6 w-6 ${att.type === "flexible" ? "text-sky-600" : "text-gray-400"}`} />
              <div className="text-center">
                <p className={`font-semibold text-sm ${att.type === "flexible" ? "text-sky-700" : "text-gray-700"}`}>{t("دوام مرن")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("عدد ساعات يومية فقط")}</p>
              </div>
            </button>
          </div>

          {att.type === "fixed" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t("وقت الحضور")}</Label>
                <Input type="time" value={att.checkInTime} onChange={e => setAtt(a => ({ ...a, checkInTime: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("وقت الانصراف")}</Label>
                <Input type="time" value={att.checkOutTime} onChange={e => setAtt(a => ({ ...a, checkOutTime: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("مهلة التأخير (دقيقة)")}</Label>
                <Input
                  type="number" min={0} max={60}
                  value={att.lateToleranceMinutes}
                  onChange={e => setAtt(a => ({ ...a, lateToleranceMinutes: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-400">{t("يُحسب متأخراً بعد هذه الدقائق")}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-xs space-y-1">
              <Label>{t("عدد ساعات العمل اليومية المطلوبة")}</Label>
              <Input
                type="number" min={1} max={24}
                value={att.requiredHours}
                onChange={e => setAtt(a => ({ ...a, requiredHours: parseFloat(e.target.value) || 8 }))}
              />
              <p className="text-xs text-gray-400">{t("الموظف يجب أن يكمل هذا العدد من الساعات يومياً")}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={saveAtt} className="gap-2">
              <Save className="h-4 w-4" />
              {attSaved ? `✓ ${t("تم الحفظ!")}` : t("حفظ إعدادات الدوام")}
            </Button>
            {attSaved && <span className="text-sm text-green-600">{t("تم حفظ إعدادات الدوام بنجاح")}</span>}
          </div>
        </CardContent>
      </Card>

      {/* ===== إعدادات البريد الإلكتروني ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-600" />
            {t("إعدادات البريد الإلكتروني (SMTP)")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Label>{t("تفعيل إرسال البريد")}:</Label>
            <Select value={smtp.smtp_enabled} onValueChange={v => setSmtp(s => ({ ...s, smtp_enabled: v ?? s.smtp_enabled }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("مفعل")}</SelectItem>
                <SelectItem value="false">{t("معطل")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <Label>{t("خادم SMTP")}</Label>
              <Input dir="ltr" value={smtp.smtp_host} onChange={e => setSmtp(s => ({ ...s, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-1">
              <Label>{t("المنفذ (Port)")}</Label>
              <Input dir="ltr" type="number" value={smtp.smtp_port} onChange={e => setSmtp(s => ({ ...s, smtp_port: e.target.value }))} placeholder="587" />
            </div>
            <div className="space-y-1">
              <Label>{t("تشفير SSL")}</Label>
              <Select value={smtp.smtp_secure} onValueChange={v => setSmtp(s => ({ ...s, smtp_secure: v ?? s.smtp_secure }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">TLS (Port 587)</SelectItem>
                  <SelectItem value="true">SSL (Port 465)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("البريد / اسم المستخدم")}</Label>
              <Input dir="ltr" value={smtp.smtp_user} onChange={e => setSmtp(s => ({ ...s, smtp_user: e.target.value }))} placeholder="user@company.com" />
            </div>
            <div className="space-y-1">
              <Label>{t("كلمة المرور / App Password")}</Label>
              <Input dir="ltr" type="password" value={smtp.smtp_pass} onChange={e => setSmtp(s => ({ ...s, smtp_pass: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <Label>{t("عنوان المرسل")}</Label>
              <Input dir="ltr" value={smtp.smtp_from} onChange={e => setSmtp(s => ({ ...s, smtp_from: e.target.value }))} placeholder="hr@company.com" />
              <p className="text-xs text-gray-400">{t("اختياري — إذا مختلف عن اسم المستخدم")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={saveSmtp} className="gap-2">
              <Save className="h-4 w-4" />
              {smtpSaved ? `✓ ${t("تم الحفظ!")}` : t("حفظ إعدادات البريد")}
            </Button>
            <Button variant="outline" onClick={testSmtp} disabled={smtpTesting} className="gap-2">
              <Send className="h-4 w-4" />
              {smtpTesting ? t("جارٍ الإرسال...") : t("إرسال رسالة تجريبية")}
            </Button>
            {smtpTestResult && (
              <span className={`text-sm ${smtpTestResult.includes(t("بنجاح")) ? "text-green-600" : "text-red-600"}`}>
                {smtpTestResult}
              </span>
            )}
            {smtpSaved && <span className="text-sm text-green-600">{t("تم حفظ الإعدادات بنجاح")}</span>}
          </div>
        </CardContent>
      </Card>

      {/* ===== ترحيل رصيد الإجازات ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-green-600" />
            {t("ترحيل رصيد الإجازات")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">{t("نقل الرصيد المتبقي من السنة السابقة إلى السنة الجديدة")}</p>

          {/* toggle: للجميع / موظف محدد */}
          <div className="inline-flex rounded-lg border border-gray-200 p-1 mb-4 bg-gray-50">
            <button
              onClick={() => { setCarryMode("all"); setCarryEmpId(""); setCarryEmpSearch(""); setCarryPreview(null); setCarryResult(null); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${carryMode === "all" ? "bg-white shadow text-brand-primary" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Users className="h-3.5 w-3.5" />
              {t("جميع الموظفين")}
            </button>
            <button
              onClick={() => { setCarryMode("single"); setCarryPreview(null); setCarryResult(null); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${carryMode === "single" ? "bg-white shadow text-brand-primary" : "text-gray-500 hover:text-gray-700"}`}
            >
              <User className="h-3.5 w-3.5" />
              {t("موظف محدد")}
            </button>
          </div>

          {/* بحث موظف */}
          {carryMode === "single" && (
            <div className="relative mb-4">
              <Label className="mb-1 block text-sm">{t("ابحث عن موظف")}</Label>
              <Input
                value={carryEmpSearch}
                onChange={e => { setCarryEmpSearch(e.target.value); if (!e.target.value) { setCarryEmpId(""); } }}
                placeholder={t("اسم الموظف أو رقمه...")}
                className="max-w-sm"
              />
              {carryEmpId && (
                <p className="text-xs text-green-600 mt-1">✓ {carryEmpSearch}</p>
              )}
              {carryEmpDropdown && carryEmpList.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {carryEmpList.slice(0, 8).map(emp => (
                    <button
                      key={emp.id}
                      className="w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                      onClick={() => { setCarryEmpId(emp.id); setCarryEmpSearch(`${emp.firstName} ${emp.lastName}`); setCarryEmpDropdown(false); }}
                    >
                      <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                      <span className="text-gray-400 text-xs">{emp.employeeNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="space-y-1">
              <Label>{t("من سنة")}</Label>
              <Select value={carryFromYear} onValueChange={v => setCarryFromYear(v ?? carryFromYear)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("إلى سنة")}</Label>
              <Select value={carryToYear} onValueChange={v => setCarryToYear(v ?? carryToYear)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("أقصى ترحيل سنوي")}</Label>
              <Input type="number" min={0} max={30} value={maxCarryAnnual} onChange={e => setMaxCarryAnnual(e.target.value)} />
              <p className="text-xs text-gray-400">{t("يوم")}</p>
            </div>
            <div className="space-y-1">
              <Label>{t("أقصى ترحيل مرضي")}</Label>
              <Input type="number" min={0} max={15} value={maxCarrySick} onChange={e => setMaxCarrySick(e.target.value)} />
              <p className="text-xs text-gray-400">{t("يوم")}</p>
            </div>
            <div className="space-y-1">
              <Label>{t("أقصى ترحيل طارئ")}</Label>
              <Input type="number" min={0} max={5} value={maxCarryEmergency} onChange={e => setMaxCarryEmergency(e.target.value)} />
              <p className="text-xs text-gray-400">{t("يوم")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={previewCarryover} disabled={previewLoading} className="gap-2">
              {previewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
              {t("معاينة الأرصدة")}
            </Button>
            <Button onClick={executeCarryover} disabled={carryLoading} className="gap-2 bg-green-600 hover:bg-green-700">
              {carryLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("تنفيذ الترحيل")}
            </Button>
          </div>

          {/* معاينة */}
          {carryPreview && carryPreview.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                {t("معاينة أرصدة")} {carryFromYear} — {carryPreview.length} {t("موظف")}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">{t("الموظف")}</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">{t("متبقي سنوي")}</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">{t("متبقي مرضي")}</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">{t("متبقي طارئ")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carryPreview.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{e.name}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.remainAnnual > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {e.remainAnnual} {t("يوم")}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.remainSick > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                          {e.remainSick} {t("يوم")}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.remainEmergency > 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                          {e.remainEmergency} {t("يوم")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* نتيجة الترحيل */}
          {carryError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{carryError}</p>
            </div>
          )}
          {carryResult && (
            <div className="mt-4 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">{carryResult.message}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {t("تم ترحيل")} {carryResult.carried} {t("موظف")} — {t("تم تخطي")} {carryResult.skipped} {t("موظف (لديهم رصيد مُستخدم)")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCarryDetails(!showCarryDetails)}
                className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-800"
              >
                {showCarryDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showCarryDetails ? t("إخفاء التفاصيل") : t("عرض التفاصيل")}
              </button>
              {showCarryDetails && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">{t("الموظف")}</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600">{t("مُرحّل سنوي")}</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600">{t("الرصيد الجديد")}</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600">{t("الحالة")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {carryResult.results.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-2 text-center">
                            {r.skipped ? "—" : <span className="text-green-700 font-medium">+{r.carriedAnnual}</span>}
                          </td>
                          <td className="px-4 py-2 text-center font-medium">{r.newAnnual} {t("يوم")}</td>
                          <td className="px-4 py-2 text-center">
                            {r.skipped
                              ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{t("تم تخطيه")}</span>
                              : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t("تم الترحيل")}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== النسخ الاحتياطية ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-600" />
            {t("النسخ الاحتياطية")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <p className="font-medium">نسخ تلقائية كل 24 ساعة</p>
              <p className="text-xs text-emerald-600 mt-0.5">يحتفظ النظام بآخر 14 نسخة — يمكنك أيضاً إنشاء نسخة يدوية في أي وقت</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <Button onClick={doBackup} disabled={backupLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {backupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {backupLoading ? t("جارٍ الإنشاء...") : t("إنشاء نسخة الآن")}
            </Button>
            {backupMsg && (
              <span className={`text-sm flex items-center gap-1.5 ${backupMsg.ok ? "text-green-600" : "text-red-600"}`}>
                {backupMsg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {backupMsg.text}
              </span>
            )}
          </div>

          {backups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد نسخ احتياطية بعد</p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 border-b flex items-center justify-between">
                <span>{backups.length} نسخة احتياطية</span>
                <span>آخر نسخة: {new Date(backups[0].createdAt).toLocaleString("ar-SA")}</span>
              </div>
              <div className="divide-y max-h-72 overflow-y-auto">
                {backups.map(b => (
                  <div key={b.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <Database className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-700 truncate">{b.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(b.createdAt).toLocaleString("ar-SA")} · {fmtSize(b.sizeBytes)}
                      </p>
                    </div>
                    <a
                      href={`/api/admin/backup/download?name=${encodeURIComponent(b.name)}`}
                      download={b.name}
                      className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 transition-colors"
                      title="تحميل"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => doDelete(b.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== مواقع العمل ===== */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{t("مواقع العمل والبصمة الجغرافية")}</p>
              <p className="text-sm text-gray-500">{t("إضافة الفروع وتحديد مواقعها على الخريطة ونطاق البصمة")}</p>
            </div>
          </div>
          <Link href="/locations">
            <Button variant="outline" className="gap-2 shrink-0">
              {t("إدارة المواقع")}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* الهوية البصرية */}
      <Card className="card-glass border-brand-border shadow-soft">
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{t("الهوية البصرية")}</p>
              <p className="text-sm text-gray-500">{t("اسم الشركة، الشعار، الألوان، وبيانات المستندات")}</p>
            </div>
          </div>
          <Link href="/settings/branding">
            <Button variant="outline" className="gap-2 shrink-0">
              {t("تخصيص الهوية")}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
