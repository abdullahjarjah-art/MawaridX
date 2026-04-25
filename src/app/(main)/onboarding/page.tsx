"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Plus, Trash2, UserCheck, UserMinus, Search, ClipboardList } from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

// ── أنواع ──
type TemplateItem = { id: string; title: string; assignedTo: string; order: number };
type Template = { id: string; type: string; items: TemplateItem[] };

type ChecklistItem = { id: string; title: string; assignedTo: string; order: number; done: boolean; doneAt?: string; doneBy?: string };
type Checklist = {
  id: string; type: string; createdAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
  items: ChecklistItem[];
};
type EmpOption = { id: string; firstName: string; lastName: string; employeeNumber: string; photo?: string | null };

const ASSIGNED_LABEL: Record<string, string> = { hr: "HR", manager: "المدير", it: "IT", employee: "الموظف" };
const ASSIGNED_COLOR: Record<string, string> = {
  hr: "bg-sky-100 text-sky-700",
  manager: "bg-purple-100 text-purple-700",
  it: "bg-amber-100 text-amber-700",
  employee: "bg-green-100 text-green-700",
};

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{done}/{total}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const [tab, setTab] = useState<"checklists" | "templates">("checklists");
  const [filterType, setFilterType] = useState<"onboarding" | "offboarding">("onboarding");

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newItemTitle, setNewItemTitle] = useState<Record<string, string>>({});
  const [newItemAssigned, setNewItemAssigned] = useState<Record<string, string>>({});

  // Checklists
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // إنشاء Checklist يدوي
  const [createDialog, setCreateDialog] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [empOptions, setEmpOptions] = useState<EmpOption[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<EmpOption | null>(null);
  const [createType, setCreateType] = useState<"onboarding" | "offboarding">("onboarding");
  const [creating, setCreating] = useState(false);

  const loadTemplates = () =>
    fetch("/api/checklists/templates").then(r => r.json()).then(d => setTemplates(Array.isArray(d) ? d : []));

  const loadChecklists = (type: "onboarding" | "offboarding") =>
    fetch(`/api/checklists?type=${type}`).then(r => r.json()).then(d => setChecklists(Array.isArray(d) ? d : []));

  useEffect(() => { loadTemplates(); }, []);
  useEffect(() => { loadChecklists(filterType); }, [filterType]);

  // بحث موظف
  useEffect(() => {
    if (empSearch.length < 2) { setEmpOptions([]); return; }
    fetch(`/api/employees?all=1&search=${encodeURIComponent(empSearch)}`)
      .then(r => r.json()).then(d => setEmpOptions(Array.isArray(d) ? d : (d.data ?? [])));
  }, [empSearch]);

  // ── تبديل حالة مهمة ──
  const toggleItem = async (checklistId: string, itemId: string, done: boolean) => {
    await fetch(`/api/checklists/${checklistId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    setChecklists(prev => prev.map(c =>
      c.id !== checklistId ? c : {
        ...c,
        items: c.items.map(i => i.id !== itemId ? i : { ...i, done, doneAt: done ? new Date().toISOString() : undefined }),
      }
    ));
  };

  // ── إضافة مهمة للقالب ──
  const addTemplateItem = async (templateId: string) => {
    const title = newItemTitle[templateId]?.trim();
    if (!title) return;
    await fetch(`/api/checklists/templates/${templateId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignedTo: newItemAssigned[templateId] ?? "hr" }),
    });
    setNewItemTitle(p => ({ ...p, [templateId]: "" }));
    loadTemplates();
  };

  // ── حذف مهمة من القالب ──
  const deleteTemplateItem = async (templateId: string, itemId: string) => {
    await fetch(`/api/checklists/templates/${templateId}/items?itemId=${itemId}`, { method: "DELETE" });
    loadTemplates();
  };

  // ── إنشاء checklist يدوي ──
  const handleCreate = async () => {
    if (!selectedEmp) return;
    setCreating(true);
    await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: selectedEmp.id, type: createType }),
    });
    setCreateDialog(false);
    setSelectedEmp(null);
    setEmpSearch("");
    loadChecklists(filterType);
    setCreating(false);
  };

  const onTemplate = templates.find(t => t.type === "onboarding");
  const offTemplate = templates.find(t => t.type === "offboarding");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
          <ClipboardList className="h-6 w-6" /> Onboarding & Offboarding
        </h1>
        <p className="text-white/70 text-sm">
          {checklists.length} قائمة نشطة — {checklists.reduce((s, c) => s + c.items.filter(i => i.done).length, 0)} مهمة منجزة
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["checklists", "templates"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "checklists" ? "قوائم الموظفين" : "القوالب"}
          </button>
        ))}
      </div>

      {/* ══ قوائم الموظفين ══ */}
      {tab === "checklists" && (
        <div className="space-y-4">
          {/* فلتر + زر إنشاء */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              {(["onboarding", "offboarding"] as const).map(type => (
                <button key={type} onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${filterType === type ? "bg-white shadow" : "text-muted-foreground"}`}>
                  {type === "onboarding" ? <UserCheck className="h-3.5 w-3.5 text-green-600" /> : <UserMinus className="h-3.5 w-3.5 text-rose-500" />}
                  {type === "onboarding" ? "استقبال موظف جديد" : "مغادرة موظف"}
                </button>
              ))}
            </div>
            <Button size="sm" className="gap-1.5 mr-auto" onClick={() => { setCreateType(filterType); setCreateDialog(true); }}>
              <Plus className="h-4 w-4" /> إنشاء قائمة
            </Button>
          </div>

          {checklists.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>لا توجد قوائم {filterType === "onboarding" ? "استقبال" : "مغادرة"} نشطة</p>
              <p className="text-xs mt-1">يتم الإنشاء تلقائياً عند إضافة موظف أو إنهاء خدمته</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checklists.map(cl => {
                const doneCount = cl.items.filter(i => i.done).length;
                const isOpen = expanded === cl.id;
                const allDone = doneCount === cl.items.length && cl.items.length > 0;
                return (
                  <div key={cl.id} className={`border rounded-2xl overflow-hidden ${allDone ? "border-green-200 bg-green-50/30" : "bg-card"}`}>
                    <button className="w-full flex items-center gap-4 p-4 text-right hover:bg-muted/30 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : cl.id)}>
                      <EmployeeAvatar firstName={cl.employee.firstName} lastName={cl.employee.lastName} photo={cl.employee.photo} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{cl.employee.firstName} {cl.employee.lastName}</span>
                          <span className="text-xs text-muted-foreground">{cl.employee.employeeNumber}</span>
                          {allDone && <Badge className="bg-green-100 text-green-700 text-[10px]">✓ مكتمل</Badge>}
                        </div>
                        {cl.employee.department && <p className="text-xs text-muted-foreground">{cl.employee.department}</p>}
                        <div className="mt-1.5">
                          <ProgressBar done={doneCount} total={cl.items.length} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(cl.createdAt).toLocaleDateString("ar-SA")}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t bg-muted/20 p-4 space-y-2">
                        {cl.items.map(item => (
                          <button key={item.id} onClick={() => toggleItem(cl.id, item.id, !item.done)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/70 transition-colors text-right group">
                            {item.done
                              ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                              : <Circle className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />}
                            <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.title}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ASSIGNED_COLOR[item.assignedTo] ?? "bg-gray-100 text-gray-600"}`}>
                              {ASSIGNED_LABEL[item.assignedTo] ?? item.assignedTo}
                            </span>
                            {item.done && item.doneBy && (
                              <span className="text-[10px] text-muted-foreground">{item.doneBy}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ القوالب ══ */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[onTemplate, offTemplate].filter(Boolean).map(tmpl => {
            if (!tmpl) return null;
            const isOn = tmpl.type === "onboarding";
            return (
              <div key={tmpl.id} className="border rounded-2xl overflow-hidden">
                <div className={`p-4 ${isOn ? "bg-green-50" : "bg-rose-50"}`}>
                  <div className="flex items-center gap-2">
                    {isOn ? <UserCheck className="h-5 w-5 text-green-600" /> : <UserMinus className="h-5 w-5 text-rose-500" />}
                    <h3 className="font-bold text-sm">{isOn ? "قالب استقبال الموظف" : "قالب مغادرة الموظف"}</h3>
                    <span className="text-xs text-muted-foreground mr-auto">{tmpl.items.length} مهمة</span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {tmpl.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${ASSIGNED_COLOR[item.assignedTo] ?? "bg-gray-100"}`}>
                        {ASSIGNED_LABEL[item.assignedTo]}
                      </span>
                      <span className="flex-1 text-sm text-foreground">{item.title}</span>
                      <button onClick={() => deleteTemplateItem(tmpl.id, item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* إضافة مهمة */}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Input
                      className="h-8 text-sm flex-1"
                      placeholder="مهمة جديدة..."
                      value={newItemTitle[tmpl.id] ?? ""}
                      onChange={e => setNewItemTitle(p => ({ ...p, [tmpl.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addTemplateItem(tmpl.id)}
                    />
                    <Select value={newItemAssigned[tmpl.id] ?? "hr"} onValueChange={v => setNewItemAssigned(p => ({ ...p, [tmpl.id]: v }))}>
                      <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="manager">المدير</SelectItem>
                        <SelectItem value="it">IT</SelectItem>
                        <SelectItem value="employee">الموظف</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 px-2" onClick={() => addTemplateItem(tmpl.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog إنشاء يدوي */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-primary" />
              إنشاء قائمة مهام
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <div className="flex gap-2">
                {(["onboarding", "offboarding"] as const).map(type => (
                  <button key={type} onClick={() => setCreateType(type)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all ${createType === type ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-border text-muted-foreground"}`}>
                    {type === "onboarding" ? <><UserCheck className="h-4 w-4" /> استقبال</> : <><UserMinus className="h-4 w-4" /> مغادرة</>}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">ابحث عن موظف</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pr-9" value={empSearch} placeholder="اسم الموظف..."
                  onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); }} />
              </div>
              {selectedEmp && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {selectedEmp.firstName} {selectedEmp.lastName}
                </p>
              )}
              {!selectedEmp && empOptions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-xl shadow-lg overflow-hidden">
                  {empOptions.slice(0, 5).map(e => (
                    <button key={e.id} onClick={() => { setSelectedEmp(e); setEmpSearch(`${e.firstName} ${e.lastName}`); setEmpOptions([]); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-right">
                      <EmployeeAvatar firstName={e.firstName} lastName={e.lastName} photo={e.photo} size="xs" />
                      <span>{e.firstName} {e.lastName}</span>
                      <span className="text-xs text-muted-foreground mr-auto">{e.employeeNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>إلغاء</Button>
            <Button disabled={!selectedEmp || creating} onClick={handleCreate}>
              {creating ? "جارٍ الإنشاء..." : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
