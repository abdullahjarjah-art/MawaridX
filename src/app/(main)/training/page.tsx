"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Users, Clock } from "lucide-react";

type Training = {
  id: string; title: string; description?: string; instructor?: string;
  startDate?: string; endDate?: string; duration?: number; location?: string;
  type: string; status: string; _count: { employees: number };
};

const typeMap: Record<string, string> = { internal: "داخلي", external: "خارجي", online: "أونلاين" };
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned: { label: "مخطط", variant: "outline" },
  ongoing: { label: "جارٍ", variant: "default" },
  completed: { label: "مكتمل", variant: "secondary" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const emptyForm = {
  title: "", description: "", instructor: "", startDate: "", endDate: "",
  duration: "", location: "", type: "internal", status: "planned",
};

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const res = await fetch("/api/training");
    setTrainings(await res.json());
  };

  useEffect(() => { fetchData(); }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/training", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false); setOpen(false); fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    const t = trainings.find(t => t.id === id)!;
    await fetch(`/api/training/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, status }),
    });
    fetchData();
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">التدريب والتطوير</h1>
          <p className="text-sm text-gray-500 mt-1">{trainings.length} برنامج تدريبي</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }} className="gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="h-4 w-4" /> برنامج تدريبي جديد
        </Button>
      </div>

      {trainings.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-500">لا توجد برامج تدريبية</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4">
          {trainings.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-sm leading-tight">{t.title}</CardTitle>
                  </div>
                  <Badge variant={statusMap[t.status]?.variant ?? "outline"}>
                    {statusMap[t.status]?.label ?? t.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  {t.instructor && <p>المدرب: {t.instructor}</p>}
                  <div className="flex items-center gap-4">
                    {t.duration && (
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.duration} ساعة</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t._count.employees} مشارك</span>
                    <span className="bg-gray-100 text-xs px-2 py-0.5 rounded">{typeMap[t.type] ?? t.type}</span>
                  </div>
                  {t.startDate && (
                    <p className="text-xs text-gray-500">
                      {new Date(t.startDate).toLocaleDateString("ar-SA")}
                      {t.endDate && ` — ${new Date(t.endDate).toLocaleDateString("ar-SA")}`}
                    </p>
                  )}
                  {t.location && <p className="text-xs text-gray-500">📍 {t.location}</p>}
                </div>
                {t.status === "planned" && (
                  <Button size="sm" variant="outline" className="mt-3 w-full text-xs" onClick={() => updateStatus(t.id, "ongoing")}>
                    بدء البرنامج
                  </Button>
                )}
                {t.status === "ongoing" && (
                  <Button size="sm" variant="outline" className="mt-3 w-full text-xs text-green-600 border-green-200" onClick={() => updateStatus(t.id, "completed")}>
                    إنهاء البرنامج
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>برنامج تدريبي جديد</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>عنوان البرنامج *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>المدرب</Label>
                <Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>المدة (ساعات)</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>تاريخ البدء</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>تاريخ الانتهاء</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>المكان</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "internal" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">داخلي</SelectItem>
                    <SelectItem value="external">خارجي</SelectItem>
                    <SelectItem value="online">أونلاين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "planned" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">مخطط</SelectItem>
                    <SelectItem value="ongoing">جارٍ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving || !form.title}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
