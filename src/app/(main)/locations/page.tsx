"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, Users, Cpu, CheckCircle2, XCircle, Navigation, Radio } from "lucide-react";

const MapPicker = dynamic(() => import("@/components/map-picker").then(m => ({ default: m.MapPicker })), { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 text-sm">تحميل الخريطة...</div> });

type WorkLocation = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  radius: number;
  active: boolean;
  _count: { employees: number };
  createdAt: string;
};

const emptyForm = { name: "", description: "", address: "", deviceId: "", latitude: null as number | null, longitude: null as number | null, radius: 200 };

export default function LocationsPage() {
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLocation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchLocations = () =>
    fetch("/api/locations").then((r) => r.json()).then((d) => setLocations(Array.isArray(d) ? d : []));

  useEffect(() => { fetchLocations(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (loc: WorkLocation) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      description: loc.description ?? "",
      address: loc.address ?? "",
      deviceId: loc.deviceId ?? "",
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
      radius: loc.radius ?? 200,
    });
    setError("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("اسم الموقع مطلوب"); return; }
    setSaving(true);
    const url = editing ? `/api/locations/${editing.id}` : "/api/locations";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "حدث خطأ"); return; }
    setOpen(false);
    fetchLocations();
  };

  const toggleActive = async (loc: WorkLocation) => {
    await fetch(`/api/locations/${loc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !loc.active }),
    });
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الموقع؟")) return;
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    fetchLocations();
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
      () => alert("تعذّر الوصول إلى موقعك — تأكد من منح الصلاحية")
    );
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">مواقع العمل</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة فروع البصمة الجغرافية</p>
        </div>
        <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> إضافة موقع</Button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MapPin className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد مواقع عمل</p>
          <p className="text-sm mt-1">أضف موقعاً وحدد نطاق البصمة الجغرافي</p>
          <Button className="mt-4 gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> إضافة موقع</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <Card key={loc.id} className={`relative transition-all ${!loc.active ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${loc.active ? "bg-sky-100" : "bg-gray-100"}`}>
                      <MapPin className={`h-5 w-5 ${loc.active ? "text-sky-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{loc.name}</h3>
                      <Badge variant={loc.active ? "default" : "secondary"} className="text-[10px] mt-0.5">{loc.active ? "نشط" : "غير نشط"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-sky-600" onClick={() => openEdit(loc)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => handleDelete(loc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {loc.description && <p className="text-sm text-gray-500 mb-3">{loc.description}</p>}

                <div className="space-y-1.5 text-xs text-gray-500">
                  {loc.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="truncate">{loc.address}</span></div>}
                  {loc.deviceId && <div className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="font-mono">{loc.deviceId}</span></div>}
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span>{loc._count.employees} موظف مرتبط</span></div>
                  {loc.latitude ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Radio className="h-3.5 w-3.5 shrink-0" />
                      <span>نطاق البصمة: {loc.radius} متر ✓</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-500">
                      <Navigation className="h-3.5 w-3.5 shrink-0" />
                      <span>لم يُحدد موقع جغرافي</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => toggleActive(loc)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${loc.active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}>
                    {loc.active ? <><XCircle className="h-3.5 w-3.5" /> تعطيل</> : <><CheckCircle2 className="h-3.5 w-3.5" /> تفعيل</>}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog إضافة / تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الموقع" : "إضافة موقع عمل جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">اسم الموقع / الفرع <span className="text-red-500">*</span></label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: المقر الرئيسي، فرع الرياض..." />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">الوصف</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر..." rows={2} className="text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">العنوان</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="مثال: الرياض، حي العليا" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /> معرف جهاز البصمة (Device ID)</label>
              <Input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="FP-001" className="font-mono" />
            </div>

            {/* الخريطة */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Navigation className="h-3.5 w-3.5 text-sky-600" /> موقع المكتب على الخريطة
                </label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={useMyLocation}>
                  <Navigation className="h-3 w-3" /> موقعي الحالي
                </Button>
              </div>
              <p className="text-xs text-gray-400 mb-2">اضغط على الخريطة لتحديد موقع المكتب أو اسحب العلامة</p>
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                radius={form.radius}
                onChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))}
              />
              {form.latitude && (
                <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  تم تحديد الموقع: {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
                </p>
              )}
            </div>

            {/* نطاق البصمة */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-sky-600" /> نطاق البصمة
                </label>
                <span className="text-sm font-bold text-sky-600">{form.radius} متر</span>
              </div>
              <input
                type="range"
                min={50} max={1000} step={50}
                value={form.radius}
                onChange={(e) => setForm(f => ({ ...f, radius: Number(e.target.value) }))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50م (داخل البناية)</span>
                <span>500م</span>
                <span>1كم</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {form.radius <= 100 ? "🏢 مناسب لداخل البناية فقط" :
                 form.radius <= 300 ? "🏙️ مناسب للمجمع أو الحديقة" :
                 form.radius <= 600 ? "🗺️ مناسب للحي أو المنطقة" : "📍 نطاق واسع"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button disabled={saving} onClick={handleSave}>{saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
