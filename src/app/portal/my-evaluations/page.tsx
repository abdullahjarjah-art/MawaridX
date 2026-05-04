"use client";

import { useEffect, useState } from "react";
import { Star, ClipboardList, User, TrendingUp, Target, Users, CheckCircle2, Lightbulb, Award, Sparkles, Crown } from "lucide-react";
import { useLang } from "@/components/lang-provider";

// ────────────── محاور التقييم ──────────────
const SECTION_LABELS: Record<string, string> = {
  performance:   "الأداء الوظيفي",
  collaboration: "التعاون والعلاقات",
  commitment:    "الالتزام والانضباط",
  initiative:    "المبادرة والإبداع",
  leadership:    "القيادة والتأثير",
};
const SECTION_ICONS: Record<string, React.ElementType> = {
  performance: Target, collaboration: Users, commitment: CheckCircle2,
  initiative: Lightbulb, leadership: Award,
};
const SECTION_IDS_ORDER = ["performance", "collaboration", "commitment", "initiative", "leadership"];
const SECTION_Q_IDS: Record<string, string[]> = {
  performance:   ["p1","p2","p3","p4","p5","p6","p7"],
  collaboration: ["c1","c2","c3","c4","c5","c6"],
  commitment:    ["d1","d2","d3","d4","d5","d6"],
  initiative:    ["i1","i2","i3","i4","i5"],
  leadership:    ["l1","l2","l3","l4","l5","l6"],
};

function scoreToGrade(score: number) {
  if (score >= 4.5) return {
    label: "ممتاز", tier: 5,
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    ring: "ring-amber-400/40",
    badge: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    glow: "shadow-[0_0_40px_-8px_oklch(75%_0.15_75_/_0.6)]",
    icon: Crown,
  };
  if (score >= 3.5) return {
    label: "جيد جداً", tier: 4,
    gradient: "from-sky-500 via-indigo-500 to-blue-600",
    ring: "ring-sky-400/40",
    badge: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800",
    glow: "shadow-[0_0_36px_-10px_oklch(55%_0.18_258_/_0.55)]",
    icon: Award,
  };
  if (score >= 2.5) return {
    label: "جيد", tier: 3,
    gradient: "from-emerald-500 via-teal-500 to-green-600",
    ring: "ring-emerald-400/40",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    glow: "shadow-[0_0_32px_-10px_oklch(60%_0.15_160_/_0.5)]",
    icon: Star,
  };
  if (score >= 1.5) return {
    label: "مقبول", tier: 2,
    gradient: "from-orange-500 to-amber-600",
    ring: "ring-orange-400/40",
    badge: "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
    glow: "shadow-[0_0_28px_-10px_oklch(70%_0.15_60_/_0.5)]",
    icon: TrendingUp,
  };
  return {
    label: "يحتاج تحسين", tier: 1,
    gradient: "from-red-500 to-rose-600",
    ring: "ring-red-400/40",
    badge: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
    glow: "shadow-[0_0_24px_-10px_oklch(60%_0.2_25_/_0.5)]",
    icon: TrendingUp,
  };
}

type Evaluation = {
  id: string; year: number; score?: number; grade?: string; answers?: string;
  strengths?: string; improvements?: string; goals?: string;
  evaluatorName?: string;
};

export default function PortalMyEvaluationsPage() {
  const { t } = useLang();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (!data.employee?.id) { setLoading(false); return; }
        fetch(`/api/evaluations?employeeId=${data.employee.id}`)
          .then(r => r.json())
          .then(d => { setEvaluations(Array.isArray(d) ? d : []); setLoading(false); });
      });
  }, []);

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1,2].map(i => <div key={i} className="h-52 skeleton-brand" />)}
    </div>
  );

  const bestScore = evaluations.reduce((max, ev) => (ev.score ?? 0) > max ? (ev.score ?? 0) : max, 0);
  const bestGrade = bestScore > 0 ? scoreToGrade(bestScore) : null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ─── Hero Header موقّع ─── */}
      <div className="relative rounded-2xl overflow-hidden border border-brand-border shadow-soft">
        <div className="absolute inset-0 bg-brand-gradient" />
        <div className="absolute inset-0 pattern-islamic opacity-[0.18]" />
        <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full bg-amber-300/25 blur-3xl animate-float" />
        <div className="absolute -bottom-16 -right-12 w-64 h-64 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative p-5 sm:p-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] text-white font-semibold">سجل إنجازاتك</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
              <Star className="h-7 w-7 text-amber-300 fill-amber-300" />
              <span>{t("تقييماتي")}</span>
            </h1>
            <p className="text-sm text-white/80 mt-2">{evaluations.length > 0
              ? `لديك ${evaluations.length} تقييم معتمد — رحلتك في التطوّر مستمرّة`
              : "ستظهر هنا تقييماتك بعد اعتمادها من الإدارة"}
            </p>
          </div>

          {bestGrade && (
            <div className="glass rounded-2xl px-5 py-3 text-white flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bestGrade.gradient} flex items-center justify-center shadow-lg`}>
                <bestGrade.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/70">أعلى تقييم لك</p>
                <p className="text-xl font-black">{bestScore}<span className="text-sm text-white/60">/5</span></p>
                <p className="text-[10px] font-semibold text-amber-300">{bestGrade.label}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── القائمة ─── */}
      {evaluations.length === 0 ? (
        <div className="card-brand relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-50" />
          <div className="relative py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-primary-soft mb-4">
              <ClipboardList className="h-10 w-10 text-brand-primary opacity-70" />
            </div>
            <p className="font-bold text-brand-ink text-base">لا توجد تقييمات معتمدة بعد</p>
            <p className="text-sm text-brand-muted mt-2 max-w-sm mx-auto">
              يعمل مديرك على تقييم أدائك. ستظهر هنا فور اعتماده من الإدارة.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 stagger">
          {evaluations.map(ev => {
            const g          = ev.score != null ? scoreToGrade(ev.score) : null;
            const isExpanded = expanded === ev.id;
            const parsed: Record<string, number> = ev.answers ? JSON.parse(ev.answers) : {};
            const Icon       = g?.icon ?? Star;

            return (
              <div key={ev.id} className={`relative card-brand overflow-hidden ${g?.glow ?? ""}`}>
                {/* شريط علوي متدرج */}
                {g && (
                  <div className={`h-2 w-full bg-gradient-to-l ${g.gradient}`} />
                )}

                {/* نمط هندسي للتقييمات الممتازة */}
                {g && g.tier >= 5 && (
                  <div className="absolute inset-0 pattern-islamic opacity-[0.05] pointer-events-none" />
                )}

                <div className="relative p-5 sm:p-6 space-y-5">
                  {/* العنوان والنتيجة */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-brand-ink text-lg">تقييم سنوي {ev.year}</h3>
                        {g && g.tier >= 5 && (
                          <span className="inline-flex items-center gap-1 bg-gold-gradient text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-gold">
                            <Crown className="h-3 w-3" /> أداء استثنائي
                          </span>
                        )}
                      </div>
                      {ev.evaluatorName && (
                        <p className="text-xs text-brand-muted flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> المقيِّم: <span className="font-semibold text-brand-ink">{ev.evaluatorName}</span>
                        </p>
                      )}
                    </div>

                    {ev.score != null && g && (
                      <div className="text-center shrink-0">
                        <div className={`relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${g.gradient} shadow-lg ${g.ring} ring-4 star-shine`}>
                          <span className="text-3xl font-black text-white leading-none">{ev.score}</span>
                          <Icon className="absolute -top-2 -right-2 h-6 w-6 text-white bg-gradient-to-br from-amber-400 to-amber-600 rounded-full p-1 shadow-lg" />
                        </div>
                        <p className="text-[10px] text-brand-muted mt-1">من 5</p>
                        <span className={`mt-1 inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${g.badge}`}>{g.label}</span>
                      </div>
                    )}
                  </div>

                  {/* شريط النتيجة + النجوم */}
                  {ev.score != null && g && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`h-5 w-5 transition-all ${
                              s <= Math.round(ev.score!)
                                ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
                                : "text-brand-border"
                            }`} />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-brand-muted tabular-nums">{Math.round((ev.score / 5) * 100)}%</span>
                      </div>
                      <div className="relative h-3 bg-brand-border/50 rounded-full overflow-hidden">
                        <div className={`absolute inset-y-0 right-0 bg-gradient-to-l ${g.gradient} transition-all`}
                          style={{ width: `${(ev.score / 5) * 100}%` }}>
                          <div className="absolute inset-0 animate-shimmer opacity-30" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* محاور التقييم */}
                  {Object.keys(parsed).length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-brand-border">
                      <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">النتيجة حسب المحور</p>
                      {SECTION_IDS_ORDER.map(secId => {
                        const qIds = SECTION_Q_IDS[secId] ?? [];
                        const vals = qIds.map(id => parsed[id] ?? 0).filter(v => v > 0);
                        if (!vals.length) return null;
                        const avg  = vals.reduce((a, b) => a + b, 0) / vals.length;
                        const pct  = (avg / 10) * 100;
                        const Ico  = SECTION_ICONS[secId] ?? TrendingUp;
                        const col  = pct >= 80 ? "from-emerald-400 to-emerald-600"
                                   : pct >= 60 ? "from-sky-400 to-sky-600"
                                   : pct >= 40 ? "from-amber-400 to-amber-600"
                                   : "from-red-400 to-red-600";
                        return (
                          <div key={secId} className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${col} flex items-center justify-center shrink-0 shadow-soft`}>
                              <Ico className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-xs text-brand-ink w-28 shrink-0 font-semibold">{SECTION_LABELS[secId]}</span>
                            <div className="flex-1 h-2 bg-brand-border/50 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-l ${col} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-brand-ink w-12 text-left tabular-nums">{avg.toFixed(1)}/10</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ملاحظات — قابلة للطي */}
                  {(ev.strengths || ev.improvements || ev.goals) && (
                    <>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : ev.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:gap-2 transition-all">
                        {isExpanded ? "إخفاء ملاحظات المقيّم ▲" : "عرض ملاحظات المقيّم ▼"}
                      </button>
                      {isExpanded && (
                        <div className="space-y-3 pt-3 border-t border-brand-border animate-fade-up">
                          {ev.strengths && (
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">نقاط قوتك</p>
                              </div>
                              <p className="text-sm text-brand-ink leading-relaxed">{ev.strengths}</p>
                            </div>
                          )}
                          {ev.improvements && (
                            <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center">
                                  <TrendingUp className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">مجالات التحسين</p>
                              </div>
                              <p className="text-sm text-brand-ink leading-relaxed">{ev.improvements}</p>
                            </div>
                          )}
                          {ev.goals && (
                            <div className="relative overflow-hidden rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                                  <Target className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-xs font-bold text-sky-700 dark:text-sky-300">أهدافك القادمة</p>
                              </div>
                              <p className="text-sm text-brand-ink leading-relaxed">{ev.goals}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
