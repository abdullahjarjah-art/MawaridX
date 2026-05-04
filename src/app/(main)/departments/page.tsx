"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Pencil, Trash2, Users, UserCircle2 } from "lucide-react";

type Department = {
  id: string;
  name: string;
  description?: string | null;
  managerId?: string | null;
  employeeCount: number;
};

type Employee = { id: string; firstName: string; lastName: string; position: string };

const emptyForm = { name: "", description: "", managerId: "" };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDepts = () =>
    fetch("/api/departments").then(r => r.json()).then(data => setDepartments(Array.isArray(data) ? data : []));

  useEffect(() => {
    fetchDepts();
    fetch("/api/employees").then(r => r.json()).then((emps: Employee[]) =>
      setManagers(Array.isArray(emps) ? emps : [])
    );
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description ?? "", managerId: d.managerId ?? "" });
    setError("");
    setOpen(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("اسم القسم مطلوب"); return; }
    setLoading(true);
    const url = editing ? `/api/departments/${editing.id}` : "/api/departments";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "حدث خطأ"); return; }
    setOpen(false);
    fetchDepts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟`)) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    fetchDepts();
  };

  const getManagerName = (managerId: string | null | undefined) => {
    if (!managerId) return null;
    const m = managers.find(e => e.id === managerId);
    return m ? `${m.firstName} ${m.lastName}` : null;
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">الأقسام</h1>
            <p className="text-sm text-gray-500">{departments.length} قسم</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="h-4 w-4" />
          إضافة قسم
        </Button>
      </div>

      {departments.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-gray-500">
            لا توجد أقسام — ابدأ بإضافة قسم جديد
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {departments.map(dept => {
            const managerName = getManagerName(dept.managerId);
            return (
              <Card key={dept.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* شريط لوني في الأعلى */}
                <div className="h-1.5 bg-gradient-to-r from-sky-500 to-sky-400" />
                <CardContent className="p-5">
                  {/* الصف العلوي: أيقونة + أزرار */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100">
                      <Building2 className="h-5 w-5 text-sky-600" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700" onClick={() => openEdit(dept)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(dept.id, dept.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* اسم القسم */}
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{dept.name}</h3>
                  {dept.description
                    ? <p className="text-sm text-gray-500 mb-4 leading-relaxed">{dept.description}</p>
                    : <div className="mb-4" />
                  }

                  {/* مدير القسم */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${managerName ? "bg-sky-50" : "bg-gray-50"}`}>
                    <UserCircle2 className={`h-4 w-4 shrink-0 ${managerName ? "text-sky-500" : "text-gray-400"}`} />
                    <div>
                      <p className="text-xs text-gray-400">مدير القسم</p>
                      <p className={`text-sm font-medium ${managerName ? "text-sky-700" : "text-gray-400"}`}>
                        {managerName ?? "غير محدد"}
                      </p>
                    </div>
                  </div>

                  {/* عدد الموظفين */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{dept.employeeCount}</span> موظف
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>اسم القسم <span className="text-red-500">*</span></Label>
              <Input
                placeholder="مثال: الموارد البشرية"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Input
                placeholder="وصف مختصر للقسم"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>مدير القسم</Label>
              <Select value={form.managerId} onValueChange={v => setForm({ ...form, managerId: v === "none" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="اختر المدير (اختياري)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مدير</SelectItem>
                  {managers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "جارٍ الحفظ..." : editing ? "حفظ التغييرات" : "إضافة القسم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
