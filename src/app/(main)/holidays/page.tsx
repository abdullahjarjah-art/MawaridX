"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, Plus, Trash2, Download, Sparkles, Pencil,
  ChevronRight, ChevronLeft, LayoutList, CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type Holiday = { id: string; name: string; date: string; type: string; year: number };

const typeLabel: Record<string, { label: string; color: string; bg: string }> = {
  official:  { label: "رسمية",  color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",  bg: "bg-slate-200/80 dark:bg-slate-600/60" },
  religious: { label: "دينية",  color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", bg: "bg-green-200/80 dark:bg-green-800/50" },
  national:  { label: "وطنية",  color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",        bg: "bg-sky-200/80 dark:bg-sky-800/50" },
};

const EMPTY_FORM = { name: "", date: "", type: "official" };

export default function HolidaysPage() {
  const { t } = useLang();
  const currentYear = new Date().getFullYear();
  const now = new Date();

  const [year, setYear]           = useState(String(currentYear));
  const [holidays, setHolidays]   = useState<Holiday[]>([]);
  const [view, setView]           = useState<"list" | "calendar">("list");

  // Dialog state
  const [open, setOpen]           = useState(false);
  const [editTarget, setEditTarget] = useState<Holiday | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState(false);

  // Calendar state
  const [calMonth, setCalMonth]   = useState(now.getMonth());
  const [calYear, setCalYear]     = useState(now.getFullYear());

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const dayNames   = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

  const reload = async (y = year) => {
    const res = await fetch(`/api/holidays?year=${y}`);
    const data = await res.json();
    setHolidays(Array.isArray(data) ? data : []);
  };

  useEffect(() => { reload(year); }, [year]);

  // When calendar month changes, also load that year's holidays if different
  useEffect(() => {
    if (String(calYear) !== year) reload(String(calYear));
  }, [calYear]);

  // ── Handlers ──────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditTarget(h);
    setForm({ name: h.name, date: h.date.slice(0, 10), type: h.type });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date) return;
    setLoading(true);
    let ok = true;
    try {
      if (editTarget) {
        const res = await fetch(`/api/holidays/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        ok = res.ok;
      } else {
        const res = await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        ok = res.ok;
      }
    } catch {
      ok = false;
    }
    setLoading(false);
    if (!ok) {
      alert("تعذّر حفظ العطلة");
      return;
    }
    // sync calendar to the holiday's month/year then switch view
    const d = new Date(form.date);
    setCalMonth(d.getMonth());
    setCalYear(d.getFullYear());
    setYear(String(d.getFullYear()));
    setOpen(false);
    setForm(EMPTY_FORM);
    setEditTarget(null);
    await reload(String(d.getFullYear()));
    setView("calendar");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذه العطلة؟")) return;
    await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    reload(year);
  };

  const handleImport = async () => {
    setImporting(true);
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importDefaults: true, year: Number(year) }),
    });
    const data = await res.json();
    setImporting(false);
    if (data.error) { alert(data.error); return; }
    if (data.note) alert(`تم استيراد ${data.count ?? ""} عطلة\n${data.note}`);
    await reload(year);
    setCalYear(Number(year));
    setView("calendar");
  };

  // ── Calendar helpers ───────────────────────────────────────
  const prevCal = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextCal = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Build a map: "YYYY-MM-DD" → Holiday
  const holidayMap: Record<string, Holiday> = {};
  holidays.forEach(h => {
    const key = h.date.slice(0, 10);
    holidayMap[key] = h;
  });
  // Also load next/prev year if calendar spans two years
  const allYearHolidays = holidays; // already filtered by year state — reload handles cross-year

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs font-medium">إدارة العطل الرسمية</span>
            </div>
            <h1 className="text-2xl font-black">{t("العطل والإجازات الرسمية")}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/20">
              <button
                onClick={() => setView("list")}
                className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition",
                  view === "list" ? "bg-white text-brand-primary" : "bg-white/10 text-white hover:bg-white/20")}
              >
                <LayoutList className="h-3.5 w-3.5" /> قائمة
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition",
                  view === "calendar" ? "bg-white text-brand-primary" : "bg-white/10 text-white hover:bg-white/20")}
              >
                <CalendarRange className="h-3.5 w-3.5" /> تقويم
              </button>
            </div>

            <Select value={year} onValueChange={v => { if (v) setYear(v); }}>
              <SelectTrigger className="w-24 bg-white/10 border-white/20 text-white">
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

            <Button onClick={openAdd} className="bg-white text-brand-primary gap-1.5">
              <Plus className="h-4 w-4" />
              {t("إضافة")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── LIST VIEW ───────────────────────────────────── */}
      {view === "list" && (
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
                  const d   = new Date(h.date);
                  const tp  = typeLabel[h.type] ?? typeLabel.official;
                  return (
                    <div key={h.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                      <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xl font-black text-brand-primary leading-none">{d.getDate()}</span>
                        <span className="text-[10px] text-brand-primary/70">{monthNames[d.getMonth()]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{d.toLocaleDateString("ar-SA", { weekday: "long" })}</p>
                      </div>
                      <Badge className={tp.color}>{tp.label}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                        onClick={() => openEdit(h)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
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
      )}

      {/* ── CALENDAR VIEW ───────────────────────────────── */}
      {view === "calendar" && (
        <Card>
          <CardContent className="p-0">
            {/* Nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <Button variant="ghost" size="icon" onClick={nextCal}><ChevronRight className="h-5 w-5" /></Button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {monthNames[calMonth]} {calYear}
              </h2>
              <Button variant="ghost" size="icon" onClick={prevCal}><ChevronLeft className="h-5 w-5" /></Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {dayNames.map(d => (
                <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="min-h-24 border-b border-l border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day    = i + 1;
                const key    = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const holiday = holidayMap[key];
                const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                const dow    = new Date(calYear, calMonth, day).getDay();
                const isWeekend = dow === 5 || dow === 6;
                const tp     = holiday ? (typeLabel[holiday.type] ?? typeLabel.official) : null;

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-24 border-b border-l border-gray-100 dark:border-gray-700/50 p-1.5 transition-colors",
                      holiday ? tp!.bg : (
                        isToday ? "bg-sky-50/70 dark:bg-sky-900/20" :
                        isWeekend ? "bg-red-50/40 dark:bg-red-900/10" :
                        "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      )
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday ? "text-sky-600 dark:text-sky-400 font-bold" :
                      holiday ? "text-gray-900 dark:text-white font-bold" :
                      isWeekend ? "text-red-500 dark:text-red-400" :
                      "text-gray-700 dark:text-gray-300"
                    )}>
                      {day}
                    </div>

                    {holiday && (
                      <div className="space-y-0.5">
                        <div className="text-[9px] sm:text-[10px] font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2">
                          {holiday.name}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <span className={cn("text-[8px] px-1 py-0.5 rounded font-medium", tp!.color)}>
                            {typeLabel[holiday.type]?.label}
                          </span>
                          <button
                            onClick={() => openEdit(holiday)}
                            className="text-[8px] px-1 py-0.5 rounded bg-white/60 hover:bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                          >
                            تعديل
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-wrap text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200" /> رسمية
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-200" /> دينية
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-200" /> وطنية
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-100" /> عطلة أسبوعية
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add / Edit Dialog ───────────────────────────── */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditTarget(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-primary" />
              {editTarget ? t("تعديل العطلة") : t("إضافة عطلة")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1 block">{t("اسم العطلة")}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="مثال: اليوم الوطني"
              />
            </div>
            <div>
              <Label className="mb-1 block">{t("التاريخ")}</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
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
            <Button onClick={handleSave} disabled={loading || !form.name || !form.date} className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {loading ? t("جارٍ الحفظ...") : (editTarget ? t("حفظ التعديلات") : t("حفظ وإضافة للتقويم"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
