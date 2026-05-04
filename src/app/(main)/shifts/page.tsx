"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus, Trash2, Users, Pencil, ChevronDown, ChevronUp, X, Search } from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

const DAY_LABELS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

type ShiftEmployee = {
  id: string;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string; photo?: string | null; department?: string };
};
type Shift = {
  id: string; name: string; checkInTime: string; checkOutTime: string;
  breakMinutes: number; workDays: string; color: string; isActive: boolean;
  employees: ShiftEmployee[];
};
type EmpOption = { id: string; firstName: string; lastName: string; employeeNumber: string; photo?: string | null };

const EMPTY_FORM = { name: "", checkInTime: "08:00", checkOutTime: "17:00", breakMinutes: "60", workDays: "0,1,2,3,4", color: "#0284c7" };

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // بحث موظف للتعيين
  const [empSearch, setEmpSearch] = useState<Record<string, string>>({});
  const [empOptions, setEmpOptions] = useState<EmpOption[]>([]);
  const [empSearchShift, setEmpSearchShift] = useState<string | null>(null);

  const load = () =>
    fetch("/api/shifts").then(r => r.json()).then(d => setShifts(Array.isArray(d) ? d : []));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = empSearchShift ? empSearch[empSearchShift] : "";
    if (!q || q.length < 2) { setEmpOptions([]); return; }
    fetch(`/api/employees?all=1&search=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => setEmpOptions(Array.isArray(d) ? d : (d.data ?? [])));
  }, [empSearch, empSearchShift]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialog(true); };
  const openEdit = (s: Shift) => {
    setEditing(s);
    setForm({ name: s.name, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, breakMinutes: String(s.breakMinutes), workDays: s.workDays, color: s.color });
    setDialog(true);
  };

  const save = async () => {
    if (!form.name || !form.checkInTime || !form.checkOutTime) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/shifts/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
    setDialog(false);
    setSaving(false);
  };

  const deleteShift = async (id: string) => {
    if (!confirm("حذف هذا الشيفت؟ سيُزال من جميع الموظفين.")) return;
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    load();
  };

  const assignEmployee = async (shiftId: string, employeeId: string, empName: string) => {
    await fetch(`/api/shifts/${shiftId}/employees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId }) });
    setEmpSearch(s => ({ ...s, [shiftId]: "" }));
    setEmpOptions([]);
    setEmpSearchShift(null);
    await load();
  };

  const removeEmployee = async (shiftId: string, employeeId: string) => {
    await fetch(`/api/shifts/${shiftId}/employees?employeeId=${employeeId}`, { method: "DELETE" });
    load();
  };

  const toggleDay = (day: string) => {
    const days = form.workDays ? form.workDays.split(",").filter(Boolean) : [];
    const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setForm(f => ({ ...f, workDays: updated.join(",") }));
  };

  const calcHours = (inT: string, outT: string, brk: string) => {
    const [ih, im] = inT.split(":").map(Number);
    const [oh, om] = outT.split(":").map(Number);
    const total = (oh * 60 + om) - (ih * 60 + im) - Number(brk || 0);
    return total > 0 ? `${Math.floor(total / 60)}س ${total % 60}د` : "—";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Clock className="h-6 w-6" /> جداول الدوام
            </h1>
            <p className="text-white/70 text-sm mt-1">{shifts.length} شيفت — {shifts.reduce((s, x) => s + x.employees.length, 0)} موظف مُعيَّن</p>
          </div>
          <Button onClick={openCreate} className="bg-white text-brand-primary gap-1.5">
            <Plus className="h-4 w-4" /> إضافة شيفت
          </Button>
        </div>
      </div>

      {/* قائمة الشيفتات */}
      {shifts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">لا توجد شيفتات بعد</p>
          <p className="text-sm mt-1">اضغط "إضافة شيفت" لإنشاء جدول دوام</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map(shift => {
            const days = shift.workDays.split(",").filter(Boolean);
            const isOpen = expanded === shift.id;
            return (
              <div key={shift.id} className="border rounded-2xl overflow-hidden bg-card">
                {/* شريط اللون */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-1 h-12 rounded-full shrink-0" style={{ background: shift.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{shift.name}</span>
                      {!shift.isActive && <Badge variant="secondary" className="text-[10px]">معطل</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono font-medium">{shift.checkInTime} — {shift.checkOutTime}</span>
                      <span>·</span>
                      <span>{calcHours(shift.checkInTime, shift.checkOutTime, String(shift.breakMinutes))} عمل فعلي</span>
                      <span>·</span>
                      <span className="flex gap-0.5">
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

                {/* قسم الموظفين (قابل للطي) */}
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
                        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {empOptions.slice(0, 6).map(e => {
                            const alreadyIn = shift.employees.some(se => se.employee.id === e.id);
                            return (
                              <button
                                key={e.id}
                                disabled={alreadyIn}
                                onClick={() => assignEmployee(shift.id, e.id, `${e.firstName} ${e.lastName}`)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 text-right disabled:opacity-40"
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
                        {shift.employees.map(se => (
                          <div key={se.id} className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-2 group">
                            <EmployeeAvatar firstName={se.employee.firstName} lastName={se.employee.lastName} photo={se.employee.photo} size="xs" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{se.employee.firstName} {se.employee.lastName}</p>
                              <p className="text-[10px] text-muted-foreground">{se.employee.department ?? se.employee.employeeNumber}</p>
                            </div>
                            <button
                              onClick={() => removeEmployee(shift.id, se.employee.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 p-1 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog إنشاء / تعديل */}
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
            <Button onClick={save} disabled={saving || !form.name || !form.checkInTime || !form.checkOutTime}>
              {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء الشيفت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
