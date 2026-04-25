"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, TrendingUp, AlertCircle, CheckCircle2, Users, UserCheck } from "lucide-react";

type Band = { id: string; name: string; minPercent: number; color: string };
type Stats = {
  total: number;
  saudis: number;
  nonSaudis: number;
  percent: number;
  currentBand: Band;
  targetBand: Band;
  isAtTarget: boolean;
  saudisNeeded: number;
  bands: Band[];
};

export default function SaudizationPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/saudization").then(r => r.json()).then(setStats);

  useEffect(() => { load(); }, []);

  const updateTarget = async (band: string) => {
    setSaving(true);
    await fetch("/api/saudization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetBand: band }),
    });
    await load();
    setSaving(false);
  };

  if (!stats) return <div className="p-6 text-muted-foreground">جارٍ التحميل...</div>;

  const saudiPct = stats.percent;
  const nonSaudiPct = stats.total === 0 ? 0 : 100 - saudiPct;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-brand-gradient p-6 text-white">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
          <Flag className="h-6 w-6" /> نطاقات السعودة
        </h1>
        <p className="text-white/70 text-sm">حساب تلقائي لنسبة السعودة وتحديد نطاق المنشأة</p>
      </div>

      {/* النسبة الكبيرة */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-sm text-muted-foreground mb-2">نسبة السعودة الحالية</div>
          <div className="text-7xl font-black mb-2" style={{ color: stats.currentBand.color }}>
            {saudiPct}%
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ background: `${stats.currentBand.color}20`, color: stats.currentBand.color }}>
            <Flag className="h-4 w-4" />
            النطاق الحالي: {stats.currentBand.name}
          </div>

          {/* شريط التقدم */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 right-0 transition-all"
                style={{ width: `${Math.min(saudiPct, 100)}%`, background: stats.currentBand.color }} />
              {/* خط النطاق المستهدف */}
              <div className="absolute inset-y-0" style={{ right: `${stats.targetBand.minPercent}%`, width: "2px", background: "#0f172a" }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0%</span>
              <span style={{ color: "#0f172a", fontWeight: 700 }}>المستهدف: {stats.targetBand.minPercent}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* الحالة */}
          <div className="mt-6">
            {stats.isAtTarget ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold">
                <CheckCircle2 className="h-5 w-5" />
                ممتاز — نسبتك تتجاوز النطاق المستهدف ({stats.targetBand.name})
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold">
                <AlertCircle className="h-5 w-5" />
                تحتاج توظيف <b className="text-amber-800 mx-1">{stats.saudisNeeded}</b> سعودي إضافي للوصول لنطاق {stats.targetBand.name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* تفاصيل العدد */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الموظفين النشطين</p>
                <p className="text-2xl font-black">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">سعوديون</p>
                <p className="text-2xl font-black text-green-700">{stats.saudis}</p>
                <p className="text-[11px] text-muted-foreground">{saudiPct}% من الإجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">غير سعوديين</p>
                <p className="text-2xl font-black text-slate-700">{stats.nonSaudis}</p>
                <p className="text-[11px] text-muted-foreground">{nonSaudiPct.toFixed(1)}% من الإجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* النطاقات المتاحة */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-primary" />
              النطاقات والأهداف
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">النطاق المستهدف:</span>
              <Select value={stats.targetBand.id} onValueChange={updateTarget} disabled={saving}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stats.bands.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.minPercent}%+)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {stats.bands.map(b => {
              const reached = saudiPct >= b.minPercent;
              const isCurrent = b.id === stats.currentBand.id;
              const isTarget = b.id === stats.targetBand.id;
              return (
                <div key={b.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCurrent ? "border-2" : "border"}`}
                  style={{ borderColor: isCurrent ? b.color : "#e2e8f0", background: isCurrent ? `${b.color}10` : "white" }}>
                  <div className="w-2 h-10 rounded-full shrink-0" style={{ background: b.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{b.name}</span>
                      {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: b.color, color: "white" }}>الحالي</span>}
                      {isTarget && !isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-white">المستهدف</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">يبدأ من {b.minPercent}% فأكثر</p>
                  </div>
                  {reached
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    : <span className="text-xs text-muted-foreground shrink-0">لم يُدرَك</span>}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
            * النسب الموضحة هي قيم متوسطة استرشادية — النسبة المطلوبة قانونياً تختلف حسب نشاط المنشأة وعدد الموظفين.
            راجع برنامج نطاقات في وزارة الموارد البشرية لتحديد النسبة الدقيقة لمنشأتك.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
