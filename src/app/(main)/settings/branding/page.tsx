"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Trash2, Save, CheckCircle2, AlertCircle, Image as ImageIcon, Palette } from "lucide-react";
import Link from "next/link";
import { useBranding, type Branding } from "@/components/branding-provider";

const DEFAULT: Branding = {
  displayName:   "MawaridX",
  logoUrl:       null,
  primaryColor:  "#0284C7",
  commercialReg: "",
  taxNumber:     "",
  address:       "",
  phone:         "",
  email:         "",
};

export default function BrandingPage() {
  const { branding: ctx, refresh } = useBranding();
  const [form, setForm] = useState<Branding>(DEFAULT);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { setForm(ctx); }, [ctx]);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "حدث خطأ");
      await refresh();
      showMsg("ok", "تم الحفظ بنجاح");
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const onLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/settings/branding/logo", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "فشل رفع الشعار");
      await refresh();
      setForm(p => ({ ...p, logoUrl: data.logoUrl }));
      showMsg("ok", "تم رفع الشعار");
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeLogo = async () => {
    if (!confirm("حذف الشعار الحالي؟")) return;
    try {
      const r = await fetch("/api/settings/branding/logo", { method: "DELETE" });
      if (!r.ok) throw new Error("فشل الحذف");
      await refresh();
      setForm(p => ({ ...p, logoUrl: null }));
      showMsg("ok", "تم حذف الشعار");
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "فشل الحذف");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-primary transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" /> العودة للإعدادات
          </Link>
          <h1 className="text-2xl font-bold">الهوية البصرية</h1>
          <p className="text-sm text-brand-muted">اسم الشركة والشعار والألوان — يظهرون على المستندات وواجهات الموظفين</p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
          message.type === "ok" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}>
          {message.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* الشعار */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-brand-primary" />شعار الشركة</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-brand-border bg-brand-canvas flex items-center justify-center overflow-hidden">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-brand-muted" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-gradient text-white text-sm font-medium px-4 py-2 cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoSelect} disabled={uploading} className="hidden" />
                <Upload className="h-4 w-4" />
                {uploading ? "جاري الرفع..." : "رفع شعار"}
              </label>
              {form.logoUrl && (
                <Button variant="outline" onClick={removeLogo} className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 ml-2" />حذف الشعار
                </Button>
              )}
              <p className="text-xs text-brand-muted">PNG, JPEG, WebP, SVG — حد أقصى 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* اسم الشركة + اللون */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-brand-primary" />الاسم والهوية</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اسم الشركة (الظاهر في الواجهة والمستندات)</Label>
            <Input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="شركة ..." />
          </div>
          <div>
            <Label>اللون الأساسي</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="h-10 w-16 rounded border border-brand-border cursor-pointer" />
              <Input value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="font-mono" />
            </div>
            <p className="text-xs text-brand-muted mt-1">يستخدم في الـ header والمستندات والروابط</p>
          </div>
        </CardContent>
      </Card>

      {/* بيانات قانونية للمستندات */}
      <Card>
        <CardHeader><CardTitle>بيانات الشركة (تظهر في الخطابات والمستندات)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>السجل التجاري</Label>
              <Input value={form.commercialReg} onChange={e => setForm(p => ({ ...p, commercialReg: e.target.value }))} placeholder="1010123456" />
            </div>
            <div>
              <Label>الرقم الضريبي</Label>
              <Input value={form.taxNumber} onChange={e => setForm(p => ({ ...p, taxNumber: e.target.value }))} placeholder="300012345600003" />
            </div>
          </div>
          <div>
            <Label>عنوان الشركة</Label>
            <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="شارع الملك فهد، الرياض" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>هاتف</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+966 11 1234567" dir="ltr" />
            </div>
            <div>
              <Label>بريد إلكتروني</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="info@example.com" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 ml-2" />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
