"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Pencil, Trash2, Globe, Building2, AlertTriangle } from "lucide-react";

type Announcement = {
  id: string; title: string; content: string;
  scope: string; department?: string;
  authorId: string; authorName: string;
  priority: string; active: boolean;
  createdAt: string;
};

type Department = { id: string; name: string };

const priorityMap: Record<string, { label: string; color: string }> = {
  normal:    { label: "عادي",  color: "bg-sky-100 text-sky-700" },
  important: { label: "مهم",   color: "bg-yellow-100 text-yellow-700" },
  urgent:    { label: "عاجل", color: "bg-red-100 text-red-700" },
};

const emptyForm = {
  title: "", content: "", scope: "company", department: "", priority: "normal",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [user, setUser] = useState<{ id: string; employee?: { id: string; firstName: string; lastName: string } } | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/announcements?all=1").then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/auth/me").then(r => r.json()).then(setUser).catch(() => {});
  }, []);

  const refresh = () => {
    fetch("/api/announcements?all=1").then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : []));
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditId(a.id);
    setForm({
      title: a.title, content: a.content,
      scope: a.scope, department: a.department ?? "",
      priority: a.priority,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    const authorName = user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : "مدير الموارد البشرية";
    const authorId = user?.employee?.id ?? user?.id ?? "";

    if (editId) {
      await fetch(`/api/announcements/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, authorId, authorName }),
      });
    }
    setSaving(false);
    setOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    refresh();
  };

  const toggleActive = async (a: Announcement) => {
    await fetch(`/api/announcements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, active: !a.active }),
    });
    refresh();
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">الإعلانات</h1>
            <p className="text-sm text-gray-500">{announcements.length} إعلان</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="h-4 w-4" /> إعلان جديد
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد إعلانات حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const p = priorityMap[a.priority] ?? priorityMap.normal;
            return (
              <Card key={a.id} className={`transition-shadow hover:shadow-sm ${!a.active ? "opacity-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>
                          {p.label}
                        </span>
                        {a.scope === "company" ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Globe className="h-3 w-3" /> الشركة كاملة
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" /> {a.department}
                          </Badge>
                        )}
                        {!a.active && (
                          <Badge variant="secondary" className="text-xs">متوقف</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{a.title}</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{a.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        بواسطة {a.authorName} — {new Date(a.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleActive(a)}>
                        {a.active ? "⏸" : "▶"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog إضافة/تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل الإعلان" : "إعلان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>عنوان الإعلان *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان واضح ومختصر" />
            </div>
            <div className="space-y-1">
              <Label>نص الإعلان *</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} placeholder="تفاصيل الإعلان..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>نطاق الإعلان</Label>
                <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v ?? "company" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">الشركة كاملة</SelectItem>
                    <SelectItem value="department">قسم معين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v ?? "normal" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">عادي</SelectItem>
                    <SelectItem value="important">مهم</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.scope === "department" && (
              <div className="space-y-1">
                <Label>القسم المستهدف</Label>
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.content}>
              {saving ? "جارٍ الحفظ..." : editId ? "حفظ التعديلات" : "نشر الإعلان"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
