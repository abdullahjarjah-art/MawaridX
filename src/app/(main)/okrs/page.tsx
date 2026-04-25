"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Target, Plus, Trash2, Building2, User as UserIcon, Search, ChevronDown, ChevronUp, CheckCircle2, X } from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

type KR = { id: string; title: string; unit?: string; startValue: number; targetValue: number; currentValue: number };
type EmpLite = { id: string; firstName: string; lastName: string; employeeNumber: string; photo?: string | null; department?: string };
type Obj = {
  id: string; title: string; description?: string; period: string; status: string;
  employee?: EmpLite | null; keyResults: KR[]; createdAt: string;
};

const PERIODS = (() => {
  const y = new Date().getFullYear();
  return [`${y}-Q1`, `${y}-Q2`, `${y}-Q3`, `${y}-Q4`, `${y}-H1`, `${y}-H2`, `${y}`, `${y + 1}`];
})();

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:    { label: "نشط",      cls: "bg-sky-100 text-sky-700" },
  completed: { label: "مكتمل",   cls: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغى",    cls: "bg-gray-100 text-gray-600" },
};

function calcProgress(kr: KR): number {
  const range = kr.targetValue - kr.startValue;
  if (range === 0) return 100;
  const p = ((kr.currentValue - kr.startValue) / range) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}

function objProgress(o: Obj): number {
  if (o.keyResults.length === 0) return 0;
  return Math.round(o.keyResults.reduce((s, kr) => s + calcProgress(kr), 0) / o.keyResults.length);
}

export default function OkrsPage() {
  const [period, setPeriod] = useState(`${new Date().getFullYear()}-Q1`);
  const [scope, setScope] = useState<"company" | "all">("all");
  const [items, setItems] = useState<Obj[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Dialog إنشاء هدف
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", isCompany: false, employeeId: "", empName: "" });
  const [krList, setKrList] = useState<{ title: string; unit: string; targetValue: string; currentValue: string }[]>([
    { title: "", unit: "", targetValue: "", currentValue: "0" },
  ]);
  const [empSearch, setEmpSearch] = useState("");
  const [empOptions, setEmpOptions] = useState<EmpLite[]>([]);
  const [saving, setSaving] = useState(false);

  // إضافة KR لهدف موجود
  const [addKrFor, setAddKrFor] = useState<string | null>(null);
  const [newKr, setNewKr] = useState({ title: "", unit: "", targetValue: "", currentValue: "0" });

  const load = () => {
    const params = new URLSearchParams({ period });
    if (scope === "company") params.set("scope", "company");
    fetch(`/api/objectives?${params}`).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : []));
  };

  useEffect(() => { load(); }, [period, scope]);

  useEffect(() => {
    if (empSearch.length < 2) { setEmpOptions([]); return; }
    fetch(`/api/employees?all=1&search=${encodeURIComponent(empSearch)}`)
      .then(r => r.json()).then(d => setEmpOptions(Array.isArray(d) ? d : (d.data ?? [])));
  }, [empSearch]);

  const createObjective = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const validKrs = krList.filter(kr => kr.title.trim() && kr.targetValue.trim());
    await fetch("/api/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        period,
        employeeId: form.isCompany ? null : (form.employeeId || null),
        keyResults: validKrs.map(kr => ({
          title: kr.title,
          unit: kr.unit,
          targetValue: parseFloat(kr.targetValue),
          currentValue: parseFloat(kr.currentValue || "0"),
        })),
      }),
    });
    setDlgOpen(false);
    setForm({ title: "", description: "", isCompany: false, employeeId: "", empName: "" });
    setKrList([{ title: "", unit: "", targetValue: "", currentValue: "0" }]);
    setEmpSearch("");
    load();
    setSaving(false);
  };

  const updateKR = async (objId: string, krId: string, currentValue: number) => {
    await fetch(`/api/objectives/${objId}/key-results/${krId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentValue }),
    });
    setItems(prev => prev.map(o =>
      o.id !== objId ? o : { ...o, keyResults: o.keyResults.map(k => k.id !== krId ? k : { ...k, currentValue }) }
    ));
  };

  const deleteKR = async (objId: string, krId: string) => {
    await fetch(`/api/objectives/${objId}/key-results/${krId}`, { method: "DELETE" });
    load();
  };

  const addKR = async (objId: string) => {
    if (!newKr.title.trim() || !newKr.targetValue.trim()) return;
    await fetch(`/api/objectives/${objId}/key-results`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newKr.title,
        unit: newKr.unit,
        targetValue: parseFloat(newKr.targetValue),
        currentValue: parseFloat(newKr.currentValue || "0"),
      }),
    });
    setNewKr({ title: "", unit: "", targetValue: "", currentValue: "0" });
    setAddKrFor(null);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/objectives/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteObjective = async (id: string) => {
    if (!confirm("حذف هذا الهدف؟ سيتم حذف جميع النتائج المرتبطة.")) return;
    await fetch(`/api/objectives/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
              <Target className="h-6 w-6" /> الأهداف ومؤشرات الأداء (OKRs)
            </h1>
            <p className="text-white/70 text-sm">{items.length} هدف لفترة {period}</p>
          </div>
          <Button onClick={() => setDlgOpen(true)} className="bg-white text-brand-primary gap-1.5">
            <Plus className="h-4 w-4" /> هدف جديد
          </Button>
        </div>
      </div>

      {/* فلاتر */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button onClick={() => setScope("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${scope === "all" ? "bg-white shadow" : "text-muted-foreground"}`}>
            الكل
          </button>
          <button onClick={() => setScope("company")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium ${scope === "company" ? "bg-white shadow" : "text-muted-foreground"}`}>
            <Building2 className="h-3.5 w-3.5" /> أهداف الشركة
          </button>
        </div>
      </div>

      {/* القائمة */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>لا توجد أهداف لفترة {period}</p>
          <p className="text-xs mt-1">اضغط "هدف جديد" لإنشاء أول هدف</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(o => {
            const progress = objProgress(o);
            const isOpen = expanded === o.id;
            const st = STATUS_LABEL[o.status] ?? STATUS_LABEL.active;
            return (
              <div key={o.id} className="border rounded-2xl overflow-hidden bg-card">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Owner */}
                    <div className="shrink-0">
                      {o.employee ? (
                        <EmployeeAvatar firstName={o.employee.firstName} lastName={o.employee.lastName} photo={o.employee.photo} size="md" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-brand-primary" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base">{o.title}</h3>
                        <Badge className={`${st.cls} text-[10px]`}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {o.employee ? `${o.employee.firstName} ${o.employee.lastName}` : "هدف على مستوى الشركة"}
                        {o.employee?.department && ` · ${o.employee.department}`}
                        {" · "}
                        {o.keyResults.length} نتيجة رئيسية
                      </p>
                      {o.description && <p className="text-sm text-muted-foreground mt-2">{o.description}</p>}

                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full transition-all" style={{
                            width: `${progress}%`,
                            background: progress >= 100 ? "#10b981" : progress >= 70 ? "#0284c7" : progress >= 40 ? "#eab308" : "#ef4444",
                          }} />
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{
                          color: progress >= 100 ? "#10b981" : progress >= 70 ? "#0284c7" : progress >= 40 ? "#eab308" : "#ef4444",
                        }}>{progress}%</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setExpanded(isOpen ? null : o.id)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {o.status === "active" && progress >= 100 && (
                        <button onClick={() => setStatus(o.id, "completed")}
                          title="تحديد كمكتمل"
                          className="p-2 rounded-lg hover:bg-green-50 text-green-500 hover:text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => deleteObjective(o.id)}
                        className="p-2 rounded-lg hover:bg-rose-50 text-rose-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Key Results */}
                {isOpen && (
                  <div className="border-t bg-muted/20 p-4 space-y-2">
                    {o.keyResults.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">لا توجد نتائج رئيسية بعد</p>
                    )}
                    {o.keyResults.map(kr => {
                      const p = calcProgress(kr);
                      return (
                        <div key={kr.id} className="bg-white border rounded-xl p-3 group">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{kr.title}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-primary transition-all" style={{ width: `${p}%` }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{p}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Input
                                type="number" step="0.01"
                                value={kr.currentValue}
                                onChange={e => updateKR(o.id, kr.id, parseFloat(e.target.value) || 0)}
                                className="w-20 h-8 text-sm text-center"
                              />
                              <span className="text-xs text-muted-foreground tabular-nums">/ {kr.targetValue} {kr.unit ?? ""}</span>
                              <button onClick={() => deleteKR(o.id, kr.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-rose-400 hover:text-rose-600">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* إضافة KR */}
                    {addKrFor === o.id ? (
                      <div className="bg-white border rounded-xl p-3 space-y-2">
                        <Input placeholder="عنوان النتيجة الرئيسية" value={newKr.title}
                          onChange={e => setNewKr(p => ({ ...p, title: e.target.value }))} className="h-8 text-sm" />
                        <div className="grid grid-cols-3 gap-2">
                          <Input placeholder="الحالي" type="number" value={newKr.currentValue}
                            onChange={e => setNewKr(p => ({ ...p, currentValue: e.target.value }))} className="h-8 text-sm" />
                          <Input placeholder="الهدف" type="number" value={newKr.targetValue}
                            onChange={e => setNewKr(p => ({ ...p, targetValue: e.target.value }))} className="h-8 text-sm" />
                          <Input placeholder="الوحدة" value={newKr.unit}
                            onChange={e => setNewKr(p => ({ ...p, unit: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddKrFor(null)}>إلغاء</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => addKR(o.id)}>إضافة</Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddKrFor(o.id)}
                        className="w-full py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:text-brand-primary hover:border-brand-primary transition-colors">
                        + إضافة نتيجة رئيسية
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog إنشاء هدف */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-primary" /> هدف جديد — {period}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* الملكية */}
            <div className="flex gap-2">
              <button onClick={() => setForm(f => ({ ...f, isCompany: false }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium ${!form.isCompany ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-border text-muted-foreground"}`}>
                <UserIcon className="h-4 w-4" /> هدف موظف
              </button>
              <button onClick={() => setForm(f => ({ ...f, isCompany: true, employeeId: "", empName: "" }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium ${form.isCompany ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-border text-muted-foreground"}`}>
                <Building2 className="h-4 w-4" /> هدف الشركة
              </button>
            </div>

            {!form.isCompany && (
              <div className="relative">
                <Label className="mb-1 block">الموظف</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pr-9" placeholder="ابحث عن موظف..."
                    value={form.empName || empSearch}
                    onChange={e => { setEmpSearch(e.target.value); setForm(f => ({ ...f, employeeId: "", empName: "" })); }} />
                </div>
                {!form.employeeId && empOptions.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-xl shadow-lg overflow-hidden">
                    {empOptions.slice(0, 5).map(e => (
                      <button key={e.id}
                        onClick={() => { setForm(f => ({ ...f, employeeId: e.id, empName: `${e.firstName} ${e.lastName}` })); setEmpOptions([]); setEmpSearch(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-right">
                        <EmployeeAvatar firstName={e.firstName} lastName={e.lastName} photo={e.photo} size="xs" />
                        <span>{e.firstName} {e.lastName}</span>
                        <span className="text-xs text-muted-foreground mr-auto">{e.employeeNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="mb-1 block">عنوان الهدف *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="مثال: زيادة المبيعات في الربع الأول" />
            </div>

            <div>
              <Label className="mb-1 block">الوصف</Label>
              <Textarea rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="تفاصيل اختيارية..." className="text-sm" />
            </div>

            {/* النتائج الرئيسية */}
            <div>
              <Label className="mb-2 block">النتائج الرئيسية (Key Results)</Label>
              <div className="space-y-2">
                {krList.map((kr, i) => (
                  <div key={i} className="space-y-1.5 p-3 bg-muted/30 rounded-xl">
                    <Input placeholder={`نتيجة ${i + 1}`} value={kr.title}
                      onChange={e => setKrList(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                      className="h-8 text-sm" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="حالي" value={kr.currentValue}
                        onChange={e => setKrList(prev => prev.map((x, j) => j === i ? { ...x, currentValue: e.target.value } : x))}
                        className="h-8 text-sm" />
                      <Input type="number" placeholder="الهدف *" value={kr.targetValue}
                        onChange={e => setKrList(prev => prev.map((x, j) => j === i ? { ...x, targetValue: e.target.value } : x))}
                        className="h-8 text-sm" />
                      <Input placeholder="الوحدة (%, ر.س)" value={kr.unit}
                        onChange={e => setKrList(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                        className="h-8 text-sm" />
                    </div>
                    {krList.length > 1 && (
                      <button onClick={() => setKrList(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs text-rose-500 hover:text-rose-700">حذف هذه النتيجة</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setKrList(prev => [...prev, { title: "", unit: "", targetValue: "", currentValue: "0" }])}
                  className="w-full py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:text-brand-primary hover:border-brand-primary transition-colors">
                  + نتيجة أخرى
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>إلغاء</Button>
            <Button disabled={saving || !form.title.trim() || (!form.isCompany && !form.employeeId)} onClick={createObjective}>
              {saving ? "جارٍ الحفظ..." : "إنشاء الهدف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
