"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, Download, Sparkles } from "lucide-react";
import { useLang } from "@/components/lang-provider";

type Holiday = { id: string; name: string; date: string; type: string; year: number };

const typeLabel: Record<string, { label: string; color: string }> = {
  official:  { label: "رسمية",  color: "bg-slate-100 text-slate-700" },
  religious: { label: "دينية",  color: "bg-green-100 text-green-700" },
  national:  { label: "وطنية",  color: "bg-sky-100 text-sky-700" },
};

export default function HolidaysPage() {
  const { t } = useLang();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", type: "official" });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetch_ = async (y = year) => {
    const res = await fetch(`/api/holidays?year=${y}`);
    const data = await res.json();
    setHolidays(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetch_(year); }, [year]);

  const handleAdd = async () => {
    if (!form.name || !form.date) return;
    setLoading(true);
    await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ name: "", date: "", type: "official" });
    fetch_(year);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/holidays", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetch_(year);
  };

  const handleImport = async () => {
    setImporting(true);
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importDefaults: true, year: Number(year) }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else fetch_(year);
    setImporting(false);
  };

  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs font-medium">إدارة العطل الرسمية</span>
            </div>
            <h1 className="text-2xl font-black">{t("العطل والإجازات الرسمية")}</h1>
          </div>
          <div className="flex gap-2">
            <Select value={year} onValueChange={v => { if (v) setYear(v); }}>
              <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleImport} disabled={importing} variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5">
              <Download className="h-4 w-4" />
              {t("استيراد عطل السعودية")}
            </Button>
            <Button onClick={() => setOpen(true)} className="bg-white text-brand-primary gap-1.5">
              <Plus className="h-4 w-4" />
              {t("إضافة")}
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand-primary" />
            {t("عطل")} {year} — {holidays.length} {t("يوم")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {holidays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{t("لا توجد عطل مسجّلة لهذه السنة")}</p>
              <p className="text-xs mt-1">{t("اضغط \"استيراد عطل السعودية\" لإضافتها تلقائياً")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {holidays.map(h => {
                const d = new Date(h.date);
                const t_ = typeLabel[h.type] ?? typeLabel.official;
                return (
                  <div key={h.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                    <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xl font-black text-brand-primary leading-none">{d.getDate()}</span>
                      <span className="text-[10px] text-brand-primary/70">{months[d.getMonth()]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{d.toLocaleDateString("ar-SA", { weekday: "long" })}</p>
                    </div>
                    <Badge className={t_.color}>{t_.label}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                      onClick={() => handleDelete(h.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-primary" />
              {t("إضافة عطلة")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1 block">{t("اسم العطلة")}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: اليوم الوطني" />
            </div>
            <div>
              <Label className="mb-1 block">{t("التاريخ")}</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block">{t("النوع")}</Label>
              <Select value={form.type} onValueChange={v => { if (v) setForm(f => ({ ...f, type: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">رسمية</SelectItem>
                  <SelectItem value="religious">دينية</SelectItem>
                  <SelectItem value="national">وطنية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء")}</Button>
            <Button onClick={handleAdd} disabled={loading || !form.name || !form.date}>{t("إضافة")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
