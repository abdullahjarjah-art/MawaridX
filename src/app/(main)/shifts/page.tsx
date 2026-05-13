"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, Plus, Trash2, Users, Pencil, ChevronDown, ChevronUp, X,
  Search, Save, Settings2, AlertTriangle, Info, Timer,
} from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

type ShiftEmployee = {
  id: string;
  customCheckInTime:  string | null;
  customCheckOutTime: string | null;
  customBreakMinutes: number | null;
  exceptionNote:      string | null;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string; photo?: string | null; department?: string };
};
type Shift = {
  id: string; name: string; checkInTime: string; checkOutTime: string;
  breakMinutes: number; workDays: string; color: string; isActive: boolean;
  employees: ShiftEmployee[];
};
type EmpOption = { id: string; firstName: string; lastName: string; employeeNumber: string; photo?: string | null };
type AttSettings = { type: "fixed" | "flexible"; checkInTime: string; checkOutTime: string; requiredHours: number; lateToleranceMinutes: number };

const EMPTY_FORM  = { name: "", checkInTime: "08:00", checkOutTime: "17:00", breakMinutes: "60", workDays: "0,1,2,3,4", color: "#0284c7" };
const DEFAULT_ATT: AttSettings = { type: "fixed", checkInTime: "08:00", checkOutTime: "17:00", requiredHours: 8, lateToleranceMinutes: 15 };

// استثناء موظف (نموذج فارغ)
const EMPTY_EXC = { customCheckInTime: "", customCheckOutTime: "", customBreakMinutes: "", exceptionNote: "" };

export default function ShiftsPage() {
  const [tab, setTab] = useState<"shifts" | "settings">("shifts");

  // ── Shifts ──────────────────────────────────────────
  const [shifts, setShifts]     = useState<Shift[]>([]);
  const [dialog, setDialog]     = useState(false);
  const [editing, setEditing]   = useState<Shift | null>(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // بحث موظف
  const [empSearch, setEmpSearch]         = useState<Record<string, string>>({});
  const [empOptions, setEmpOptions]       = useState<EmpOption[]>([]);
  const [empSearchShift, setEmpSearchShift] = useState<string | null>(null);

  // ── استثناء موظف ─────────────────────────────────────
  const [excDialog, setExcDialog]   = useState(false);
  const [excTarget, setExcTarget]   = useState<{ shiftId: string; se: ShiftEmployee } | null>(null);
  const [excForm, setExcForm]       = useState(EMPTY_EXC);
  const [excSaving, setExcSaving]   = useState(false);

  // ── Global Settings ──────────────────────────────────
  const [att, setAtt]         = useState<AttSettings>(DEFAULT_ATT);
  const [attSaved, setAttSaved] = useState(false);
  const [attSaving, setAttSaving] = useState(false);

  // ── Loaders ──────────────────────────────────────────
  const loadShifts = () =>
    fetch("/api/shifts").then(r => r.json()).then(d => setShifts(Array.isArray(d) ? d : []));

  const loadAtt = () =>
    fetch("/api/settings/attendance").then(r => r.json()).then(d => { if (d && !d.error) setAtt(d); });

  useEffect(() => { loadShifts(); loadAtt(); }, []);

  useEffect(() => {
    const q = empSearchShift ? empSearch[empSearchShift] : "";
    if (!q || q.length < 2) { setEmpOptions([]); return; }
    fetch(`/api/employees?all=1&search=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => setEmpOptions(Array.isArray(d) ? d : (d.data ?? [])));
  }, [empSearch, empSearchShift]);

  // ── Helpers ───────────────────────────────────────────
  const calcHours = (inT: string, outT: string, brk: string | number) => {
    const [ih, im] = inT.split(":").map(Number);
    const [oh, om] = outT.split(":").map(Number);
    const total = (oh * 60 + om) - (ih * 60 + im) - Number(brk || 0);
    return total > 0 ? `${Math.floor(total / 60)}س ${total % 60 > 0 ? total % 60 + "د" : ""}`.trim() : "—";
  };

  const toggleDay = (day: string) => {
    const days = form.workDays ? form.workDays.split(",").filter(Boolean) : [];
    const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setForm(f => ({ ...f, workDays: updated.join(",") }));
  };

  // ── Shift CRUD ────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialog(true); };
  const openEdit   = (s: Shift) => {
    setEditing(s);
    setForm({ name: s.name, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, breakMinutes: String(s.breakMinutes), workDays: s.workDays, color: s.color });
    setDialog(true);
  };

  const saveShift = async () => {
    if (!form.name || !form.checkInTime || !form.checkOutTime) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/shifts/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await loadShifts();
    setDialog(false); setSaving(false);
  };

  const deleteShift = async (id: string) => {
    if (!confirm("حذف هذا الشيفت؟ سيُزال من جميع الموظفين.")) return;
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    loadShifts();
  };

  // ── Employee assign / remove ──────────────────────────
  const assignEmployee = async (shiftId: string, employeeId: string) => {
    await fetch(`/api/shifts/${shiftId}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    setEmpSearch(s => ({ ...s, [shiftId]: "" }));
    setEmpOptions([]); setEmpSearchShift(null);
    await loadShifts();
  };

  const removeEmployee = async (shiftId: string, employeeId: string) => {
    await fetch(`/api/shifts/${shiftId}/employees?employeeId=${employeeId}`, { method: "DELETE" });
    loadShifts();
  };

  // ── Exception dialog ──────────────────────────────────
  const openException = (shiftId: string, se: ShiftEmployee) => {
    setExcTarget({ shiftId, se });
    setExcForm({
      customCheckInTime:  se.customCheckInTime  ?? "",
      customCheckOutTime: se.customCheckOutTime ?? "",
      customBreakMinutes: se.customBreakMinutes != null ? String(se.customBreakMinutes) : "",
      exceptionNote:      se.exceptionNote ?? "",
    });
    setExcDialog(true);
  };

  const saveException = async () => {
    if (!excTarget) return;
    setExcSaving(true);
    const body = {
      employeeId:         excTarget.se.employee.id,
      customCheckInTime:  excForm.customCheckInTime  || null,
      customCheckOutTime: excForm.customCheckOutTime || null,
      customBreakMinutes: excForm.customBreakMinutes ? Number(excForm.customBreakMinutes) : null,
      exceptionNote:      excForm.exceptionNote || null,
    };
    await fetch(`/api/shifts/${excTarget.shiftId}/employees`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await loadShifts();
    setExcDialog(false); setExcSaving(false); setExcTarget(null);
  };

  const clearException = async () => {
    if (!excTarget) return;
    setExcSaving(true);
    await fetch(`/api/shifts/${excTarget.shiftId}/employees`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: excTarget.se.employee.id,
        customCheckInTime: null, customCheckOutTime: null,
        customBreakMinutes: null, exceptionNote: null,
      }),
    });
    await loadShifts();
    setExcDialog(false); setExcSaving(false); setExcTarget(null);
  };

  // ── Global Settings save ──────────────────────────────
  const saveAtt = async () => {
    setAttSaving(true);
    await fetch("/api/settings/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(att),
    });
    setAttSaved(true);
    setTimeout(() => setAttSaved(false), 2500);
    setAttSaving(false);
  };

  const totalEmployees = shifts.reduce((s, x) => s + x.employees.length, 0);
  const exceptionsCount = shifts.reduce((s, x) => s + x.employees.filter(e => e.customCheckInTime || e.customCheckOutTime).length, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Clock className="h-6 w-6" /> جداول الدوام
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {shifts.length} شيفت · {totalEmployees} موظف مُعيَّن
              {exceptionsCount > 0 && ` · ${exceptionsCount} استثناء`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tab === "shifts" && (
              <Button onClick={openCreate} className="bg-white text-brand-primary gap-1.5">
                <Plus className="h-4 w-4" /> إضافة شيفت
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-white/10 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("shifts")}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === "shifts" ? "bg-white text-brand-primary shadow" : "text-white/80 hover:text-white")}
          >
            <Clock className="h-3.5 w-3.5 inline ml-1.5" />
            الشيفتات
          </button>
          <button
            onClick={() => setTab("settings")}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === "settings" ? "bg-white text-brand-primary shadow" : "text-white/80 hover:text-white")}
          >
            <Settings2 className="h-3.5 w-3.5 inline ml-1.5" />
            الإعدادات العامة
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: الشيفتات
      ══════════════════════════════════════════════════════ */}
      {tab === "shifts" && (
        <>
          {shifts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد شيفتات بعد</p>
              <p className="text-sm mt-1">اضغط "إضافة شيفت" لإنشاء جدول دوام</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.map(shift => {
                const days  = shift.workDays.split(",").filter(Boolean);
                const isOpen = expanded === shift.id;
                const excCount = shift.employees.filter(e => e.customCheckInTime || e.customCheckOutTime).length;

                return (
                  <div key={shift.id} className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                    {/* رأس الشيفت */}
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-1 h-14 rounded-full shrink-0" style={{ background: shift.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">{shift.name}</span>
                          {!shift.isActive && <Badge variant="secondary" className="text-[10px]">معطل</Badge>}
                          {excCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">
                              {excCount} استثناء
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="font-mono font-medium">{shift.checkInTime} — {shift.checkOutTime}</span>
                          <span>·</span>
                          <span>{calcHours(shift.checkInTime, shift.checkOutTime, shift.breakMinutes)} عمل فعلي</span>
                          <span>·</span>
                          <span className="flex gap-0.5 flex-wrap">
                            {[0,1,2,3,4,5,6].map(d => (
                              <span key={d} className={`text-[10px] px-1 py-0.5 rounded ${days.includes(String(d)) ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                                {DAY_LABELS[d]}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpanded(isOpen ? null : shift.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          {shift.employees.length}
                          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => openEdit(shift)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteShift(shift.id)} className="p-2 rounded-lg hover:bg-rose-50 transition-colors text-rose-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* قسم الموظفين */}
                    {isOpen && (
                      <div className="border-t bg-muted/30 p-4 space-y-3">
                        {/* بحث لإضافة موظف */}
                        <div className="relative max-w-xs">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            className="pr-8 h-8 text-sm"
                            placeholder="ابحث عن موظف لإضافته..."
                            value={empSearch[shift.id] ?? ""}
                            onFocus={() => setEmpSearchShift(shift.id)}
                            onChange={e => setEmpSearch(s => ({ ...s, [shift.id]: e.target.value }))}
                          />
                          {empSearchShift === shift.id && empOptions.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                              {empOptions.slice(0, 6).map(e => {
                                const alreadyIn = shift.employees.some(se => se.employee.id === e.id);
                                return (
                                  <button
                                    key={e.id}
                                    disabled={alreadyIn}
                                    onClick={() => assignEmployee(shift.id, e.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-right disabled:opacity-40"
                                  >
                                    <EmployeeAvatar firstName={e.firstName} lastName={e.lastName} photo={e.photo} size="xs" />
                                    <span className="flex-1">{e.firstName} {e.lastName}</span>
                                    <span className="text-xs text-muted-foreground">{e.employeeNumber}</span>
                                    {alreadyIn && <span className="text-[10px] text-green-600">مُعيَّن</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* قائمة الموظفين */}
                        {shift.employees.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">لا يوجد موظفون في هذا الشيفت — ابحث أعلاه لإضافتهم</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {shift.employees.map(se => {
                              const hasException = !!(se.customCheckInTime || se.customCheckOutTime);
                              const effIn  = se.customCheckInTime  ?? shift.checkInTime;
                              const effOut = se.customCheckOutTime ?? shift.checkOutTime;
                              const effBrk = se.customBreakMinutes != null ? se.customBreakMinutes : shift.breakMinutes;
                              return (
                                <div key={se.id} className={cn(
                                  "flex items-start gap-2 border rounded-xl px-3 py-2 group transition-colors",
                                  hasException ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700" : "bg-white dark:bg-gray-800 border-border"
                                )}>
                                  <EmployeeAvatar firstName={se.employee.firstName} lastName={se.employee.lastName} photo={se.employee.photo} size="xs" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{se.employee.firstName} {se.employee.lastName}</p>
                                    <p className="text-[10px] text-muted-foreground">{se.employee.department ?? se.employee.employeeNumber}</p>
                                    {hasException && (
                                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
                                        ⏰ {effIn} — {effOut} · {calcHours(effIn, effOut, effBrk)}
                                      </p>
                                    )}
                                    {se.exceptionNote && (
                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 italic truncate">{se.exceptionNote}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => openException(shift.id, se)}
                                      className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500 hover:text-amber-700"
                                      title="تعيين استثناء"
                                    >
                                      <Timer className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => removeEmployee(shift.id, se.employee.id)}
                                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 hover:text-rose-600"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {excCount > 0 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {excCount} موظف لديه ساعات مخصصة تختلف عن الشيفت الأساسي
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: الإعدادات العامة
      ══════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="space-y-4 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-brand-primary" />
                إعدادات الحضور الافتراضية
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                تُطبَّق على الموظفين الذين لم يُعيَّن لهم شيفت محدد
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1 block">نوع دوام الحضور الافتراضي</Label>
                <Select value={att.type} onValueChange={v => setAtt(a => ({ ...a, type: v as "fixed" | "flexible" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">ثابت — دخول وخروج محددان</SelectItem>
                    <SelectItem value="flexible">مرن — عدد ساعات فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {att.type === "fixed" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">وقت الدخول الافتراضي</Label>
                    <Input type="time" value={att.checkInTime} onChange={e => setAtt(a => ({ ...a, checkInTime: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">وقت الخروج الافتراضي</Label>
                    <Input type="time" value={att.checkOutTime} onChange={e => setAtt(a => ({ ...a, checkOutTime: e.target.value }))} />
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-1 block">ساعات العمل المطلوبة يومياً</Label>
                <Input
                  type="number" min={1} max={24}
                  value={att.requiredHours}
                  onChange={e => setAtt(a => ({ ...a, requiredHours: Number(e.target.value) }))}
                />
              </div>

              <div>
                <Label className="mb-1 block">مهلة التأخير (بالدقائق)</Label>
                <Input
                  type="number" min={0} max={120}
                  value={att.lateToleranceMinutes}
                  onChange={e => setAtt(a => ({ ...a, lateToleranceMinutes: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  الموظف يُعدّ متأخراً إذا تجاوز وقت الدخول بأكثر من {att.lateToleranceMinutes} دقيقة
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={saveAtt} disabled={attSaving} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {attSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                </Button>
                {attSaved && (
                  <span className="text-sm text-green-600 dark:text-green-400">✓ تم الحفظ</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 text-sky-500 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">أولوية تطبيق الإعدادات</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li><span className="text-amber-700 dark:text-amber-400 font-medium">استثناء الموظف</span> — ساعات مخصصة في بطاقة الموظف داخل الشيفت</li>
                    <li><span className="text-brand-primary font-medium">الشيفت المُعيَّن</span> — أوقات الشيفت الأساسي</li>
                    <li><span className="text-muted-foreground font-medium">الإعدادات الافتراضية</span> — هذه الصفحة (للموظفين بدون شيفت)</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ Dialog: إنشاء / تعديل شيفت ══ */}
      <Dialog open={dialog} onOpenChange={v => { if (!v) setDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-primary" />
              {editing ? "تعديل الشيفت" : "إضافة شيفت جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block">اسم الشيفت *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: صباحي، مسائي، ليلي" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">وقت الدخول *</Label>
                <Input type="time" value={form.checkInTime} onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">وقت الخروج *</Label>
                <Input type="time" value={form.checkOutTime} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label className="mb-1 block">فترة الاستراحة (دقيقة)</Label>
              <Input type="number" min={0} max={120} value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: e.target.value }))} />
              {form.checkInTime && form.checkOutTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  ساعات العمل الفعلية: {calcHours(form.checkInTime, form.checkOutTime, form.breakMinutes)}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-2 block">أيام العمل</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, i) => {
                  const active = form.workDays.split(",").includes(String(i));
                  return (
                    <button key={i} type="button" onClick={() => toggleDay(String(i))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-1 block">لون الشيفت</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={saveShift} disabled={saving || !form.name || !form.checkInTime || !form.checkOutTime}>
              {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء الشيفت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog: استثناء موظف ══ */}
      <Dialog open={excDialog} onOpenChange={v => { if (!v) { setExcDialog(false); setExcTarget(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-500" />
              ساعات مخصصة — استثناء
            </DialogTitle>
          </DialogHeader>

          {excTarget && (
            <div className="space-y-4 py-2">
              {/* اسم الموظف */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                <EmployeeAvatar
                  firstName={excTarget.se.employee.firstName}
                  lastName={excTarget.se.employee.lastName}
                  photo={excTarget.se.employee.photo}
                  size="xs"
                />
                <div>
                  <p className="text-sm font-medium">{excTarget.se.employee.firstName} {excTarget.se.employee.lastName}</p>
                  <p className="text-xs text-muted-foreground">{excTarget.se.employee.employeeNumber}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 text-sky-500 shrink-0" />
                اتركها فارغة لاستخدام أوقات الشيفت الأساسي. اذا ملأت الوقت سيُطبَّق على هذا الموظف فقط.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs">دخول مخصص</Label>
                  <Input
                    type="time"
                    value={excForm.customCheckInTime}
                    onChange={e => setExcForm(f => ({ ...f, customCheckInTime: e.target.value }))}
                    placeholder="--:--"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">خروج مخصص</Label>
                  <Input
                    type="time"
                    value={excForm.customCheckOutTime}
                    onChange={e => setExcForm(f => ({ ...f, customCheckOutTime: e.target.value }))}
                    placeholder="--:--"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs">استراحة مخصصة (دقيقة)</Label>
                <Input
                  type="number" min={0} max={120}
                  value={excForm.customBreakMinutes}
                  onChange={e => setExcForm(f => ({ ...f, customBreakMinutes: e.target.value }))}
                  placeholder="اتركه فارغاً لاستخدام قيمة الشيفت"
                />
              </div>

              {excForm.customCheckInTime && excForm.customCheckOutTime && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-300 font-mono">
                  ساعات العمل الفعلية: {calcHours(excForm.customCheckInTime, excForm.customCheckOutTime, excForm.customBreakMinutes || 0)}
                </div>
              )}

              <div>
                <Label className="mb-1 block text-xs">سبب الاستثناء (اختياري)</Label>
                <Input
                  value={excForm.exceptionNote}
                  onChange={e => setExcForm(f => ({ ...f, exceptionNote: e.target.value }))}
                  placeholder="مثال: مريض، دوام جزئي، ترتيب خاص..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {(excTarget?.se.customCheckInTime || excTarget?.se.customCheckOutTime) && (
              <Button variant="outline" onClick={clearException} disabled={excSaving} className="text-rose-500 hover:text-rose-600">
                مسح الاستثناء
              </Button>
            )}
            <Button variant="outline" onClick={() => setExcDialog(false)}>إلغاء</Button>
            <Button onClick={saveException} disabled={excSaving}>
              {excSaving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
