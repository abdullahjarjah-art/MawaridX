"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, RefreshCw, Cpu, Wifi, WifiOff, Clock } from "lucide-react";

type Location = { id: string; name: string };

type FingerprintDevice = {
  id: string;
  name: string;
  ip: string;
  port: number;
  serial: string | null;
  password: number;
  locationId: string | null;
  location: Location | null;
  mode: string;
  admsKey: string | null;
  lastSync: string | null;
  syncStatus: string;
  syncError: string | null;
  active: boolean;
  createdAt: string;
};

const emptyForm = {
  name: "",
  ip: "",
  port: "4370",
  serial: "",
  password: "0",
  locationId: "",
  mode: "tcp",
  admsKey: "",
  active: true,
};

function syncStatusBadge(status: string) {
  switch (status) {
    case "syncing":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">جارٍ المزامنة</Badge>;
    case "ok":
      return <Badge className="bg-green-100 text-green-700 border-green-200">متزامن</Badge>;
    case "error":
      return <Badge className="bg-red-100 text-red-700 border-red-200">خطأ</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-500 border-gray-200">خامل</Badge>;
  }
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<FingerprintDevice[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FingerprintDevice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; synced: number; errors: string[] } | null>(null);

  const fetchDevices = async () => {
    const res = await fetch("/api/devices");
    if (res.ok) {
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    }
  };

  const fetchLocations = async () => {
    const res = await fetch("/api/locations");
    if (res.ok) {
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchLocations();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (device: FingerprintDevice) => {
    setEditing(device);
    setForm({
      name: device.name,
      ip: device.ip,
      port: String(device.port),
      serial: device.serial ?? "",
      password: String(device.password),
      locationId: device.locationId ?? "",
      mode: device.mode,
      admsKey: device.admsKey ?? "",
      active: device.active,
    });
    setError("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("اسم الجهاز مطلوب"); return; }
    if (!form.ip.trim()) { setError("عنوان IP مطلوب"); return; }
    setSaving(true);
    const url = editing ? `/api/devices/${editing.id}` : "/api/devices";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        port: Number(form.port) || 4370,
        password: Number(form.password) || 0,
        locationId: form.locationId || null,
        serial: form.serial || null,
        admsKey: form.admsKey || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "حدث خطأ");
      return;
    }
    setOpen(false);
    fetchDevices();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/devices/${id}`, { method: "DELETE" });
    setDeleteConfirmId(null);
    fetchDevices();
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/devices/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ id, synced: data.synced, errors: data.errors ?? [] });
      } else {
        setSyncResult({ id, synced: 0, errors: [data.error ?? "خطأ في المزامنة"] });
      }
    } catch {
      setSyncResult({ id, synced: 0, errors: ["فشل الاتصال بالخادم"] });
    } finally {
      setSyncingId(null);
      fetchDevices();
    }
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">أجهزة البصمة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة أجهزة ZKTeco ومزامنة سجلات الحضور</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> إضافة جهاز
        </Button>
      </div>

      {/* نتيجة المزامنة */}
      {syncResult && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-start gap-2 ${syncResult.errors.length > 0 ? "bg-yellow-50 border-yellow-200 text-yellow-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          <RefreshCw className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">تمت المزامنة: {syncResult.synced} سجل</p>
            {syncResult.errors.length > 0 && (
              <ul className="mt-1 list-disc list-inside text-xs text-yellow-700">
                {syncResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {syncResult.errors.length > 5 && <li>و {syncResult.errors.length - 5} أخطاء أخرى...</li>}
              </ul>
            )}
          </div>
          <button className="mr-auto text-gray-400 hover:text-gray-600" onClick={() => setSyncResult(null)}>✕</button>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Cpu className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد أجهزة بصمة</p>
          <p className="text-sm mt-1">أضف جهاز ZKTeco لمزامنة سجلات الحضور تلقائياً</p>
          <Button className="mt-4 gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> إضافة جهاز
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <Card key={device.id} className={`relative transition-all ${!device.active ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                {/* رأس البطاقة */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${device.active ? "bg-sky-100" : "bg-gray-100"}`}>
                      <Cpu className={`h-5 w-5 ${device.active ? "text-sky-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{device.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {syncStatusBadge(device.syncStatus)}
                        <Badge variant={device.active ? "default" : "secondary"} className="text-[10px]">
                          {device.active ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-sky-600" onClick={() => openEdit(device)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => setDeleteConfirmId(device.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* تفاصيل الجهاز */}
                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    {device.active ? <Wifi className="h-3.5 w-3.5 shrink-0 text-sky-500" /> : <WifiOff className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                    <span className="font-mono">{device.ip}:{device.port}</span>
                    <Badge variant="outline" className="text-[10px] py-0">{device.mode.toUpperCase()}</Badge>
                  </div>
                  {device.serial && (
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="font-mono">{device.serial}</span>
                    </div>
                  )}
                  {device.location && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📍</span>
                      <span>{device.location.name}</span>
                    </div>
                  )}
                  {device.lastSync ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>آخر مزامنة: {new Date(device.lastSync).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>لم تتم المزامنة بعد</span>
                    </div>
                  )}
                  {device.syncError && (
                    <div className="mt-1 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded p-1.5 break-all">
                      {device.syncError}
                    </div>
                  )}
                </div>

                {/* زر المزامنة */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  disabled={syncingId === device.id || !device.active}
                  onClick={() => handleSync(device.id)}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingId === device.id ? "animate-spin" : ""}`} />
                  {syncingId === device.id ? "جارٍ المزامنة..." : "مزامنة الآن"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog إضافة / تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الجهاز" : "إضافة جهاز بصمة جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}

            <div className="space-y-1">
              <Label>اسم الجهاز <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: جهاز الرئيسي - الطابق الأول"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>عنوان IP <span className="text-red-500">*</span></Label>
                <Input
                  value={form.ip}
                  onChange={(e) => setForm({ ...form, ip: e.target.value })}
                  placeholder="192.168.1.201"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>المنفذ (Port)</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  placeholder="4370"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>بروتوكول الاتصال</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v ?? "tcp" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcp">TCP (اتصال مباشر)</SelectItem>
                  <SelectItem value="adms">ADMS (الجهاز يتصل بالخادم)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.mode === "adms" && (
              <div className="space-y-1">
                <Label>مفتاح ADMS</Label>
                <Input
                  value={form.admsKey}
                  onChange={(e) => setForm({ ...form, admsKey: e.target.value })}
                  placeholder="اختياري — مفتاح الأمان"
                  className="font-mono"
                />
                <p className="text-xs text-gray-400">
                  رابط ADMS للجهاز: <span className="font-mono text-sky-600">{typeof window !== "undefined" ? window.location.origin : ""}/api/devices/adms</span>
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label>موقع العمل</Label>
              <Select value={form.locationId || "_none"} onValueChange={(v) => setForm({ ...form, locationId: (v ?? "_none") === "_none" ? "" : (v ?? "") })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موقع العمل (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">بدون موقع</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>الرقم التسلسلي (Serial)</Label>
                <Input
                  value={form.serial}
                  onChange={(e) => setForm({ ...form, serial: e.target.value })}
                  placeholder="اختياري"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>كلمة مرور الجهاز</Label>
                <Input
                  type="number"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="0"
                  className="font-mono"
                />
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Label className="flex-1">حالة الجهاز</Label>
                <Select
                  value={form.active ? "active" : "inactive"}
                  onValueChange={(v) => setForm({ ...form, active: v === "active" })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog تأكيد الحذف */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            هل تريد حذف هذا الجهاز؟ لن يتأثر سجل الحضور المزامَن مسبقاً.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
