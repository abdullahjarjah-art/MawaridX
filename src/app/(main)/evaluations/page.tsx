"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Plus, Star, User, Users, Target, Lightbulb, Award,
  ChevronDown, ChevronUp, CheckCircle2, ClipboardList, TrendingUp, Eye,
  ThumbsUp, Clock, ShieldCheck,
} from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

// ══════════════════════════════════════════════
// أسئلة التقييم — 30 سؤال في 5 محاور
// ══════════════════════════════════════════════
export const SECTIONS = [
  {
    id: "performance", label: "الأداء الوظيفي", icon: Target, color: "sky",
    questions: [
      { id: "p1", text: "جودة العمل والدقة في التنفيذ" },
      { id: "p2", text: "الإنتاجية وإنجاز المهام في الوقت المحدد" },
      { id: "p3", text: "الاهتمام بالتفاصيل وتجنّب الأخطاء" },
      { id: "p4", text: "الكفاءة في استخدام الموارد المتاحة" },
      { id: "p5", text: "القدرة على حل المشكلات واتخاذ القرار" },
      { id: "p6", text: "الالتزام بمعايير الجودة المطلوبة" },
      { id: "p7", text: "تحقيق الأهداف والمؤشرات المحددة" },
    ],
  },
  {
    id: "collaboration", label: "التعاون والعلاقات", icon: Users, color: "purple",
    questions: [
      { id: "c1", text: "العمل ضمن الفريق بفاعلية" },
      { id: "c2", text: "التواصل الإيجابي مع الزملاء" },
      { id: "c3", text: "مساعدة الآخرين وتقديم الدعم" },
      { id: "c4", text: "احترام آراء ووجهات نظر الآخرين" },
      { id: "c5", text: "المرونة والتكيّف مع التغييرات" },
      { id: "c6", text: "بناء علاقات مهنية إيجابية" },
    ],
  },
  {
    id: "commitment", label: "الالتزام والانضباط", icon: CheckCircle2, color: "green",
    questions: [
      { id: "d1", text: "الانضباط في الحضور والانصراف" },
      { id: "d2", text: "الالتزام بسياسات وأنظمة الشركة" },
      { id: "d3", text: "الاستجابة للتوجيهات والتعليمات" },
      { id: "d4", text: "تحمّل المسؤولية والمساءلة" },
      { id: "d5", text: "الالتزام بالمواعيد النهائية" },
      { id: "d6", text: "المحافظة على سرية المعلومات" },
    ],
  },
  {
    id: "initiative", label: "المبادرة والإبداع", icon: Lightbulb, color: "amber",
    questions: [
      { id: "i1", text: "طرح الأفكار الجديدة والمبتكرة" },
      { id: "i2", text: "المبادرة في تحسين أساليب العمل" },
      { id: "i3", text: "الرغبة في التطوير الذاتي والتعلم" },
      { id: "i4", text: "الاستباقية في معالجة المشكلات" },
      { id: "i5", text: "التفكير النقدي والتحليلي" },
    ],
  },
  {
    id: "leadership", label: "القيادة والتأثير", icon: Award, color: "rose",
    questions: [
      { id: "l1", text: "القدرة على التأثير الإيجابي في الفريق" },
      { id: "l2", text: "الاهتمام بتطوير مهارات الآخرين" },
      { id: "l3", text: "إدارة الأولويات والوقت بفاعلية" },
      { id: "l4", text: "التعامل الاحترافي مع ضغوط العمل" },
      { id: "l5", text: "الشفافية والوضوح في التواصل" },
      { id: "l6", text: "الالتزام بالقيم والأخلاقيات المهنية" },
    ],
  },
];

const ALL_QUESTIONS = SECTIONS.flatMap(s => s.questions);
const TOTAL_MAX = ALL_QUESTIONS.length * 10;

export function calcFinalScore(answers: Record<string, number>): number {
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  return Math.round((total / TOTAL_MAX) * 5 * 10) / 10;
}

export function scoreToGrade(score: number): { label: string; color: string } {
  if (score >= 4.5) return { label: "ممتاز",       color: "bg-emerald-100 text-emerald-700 border-emerald-300" };
  if (score >= 3.5) return { label: "جيد جداً",    color: "bg-sky-100 text-sky-700 border-sky-300" };
  if (score >= 2.5) return { label: "جيد",          color: "bg-yellow-100 text-yellow-700 border-yellow-300" };
  if (score >= 1.5) return { label: "مقبول",        color: "bg-orange-100 text-orange-700 border-orange-300" };
  return               { label: "يحتاج تحسين",  color: "bg-red-100 text-red-700 border-red-300" };
}

// ── شريط التقييم 1-10 ──
function RatingBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-lg text-sm font-bold border-2 transition-all ${
            value === n
              ? n >= 8 ? "bg-emerald-500 border-emerald-500 text-white scale-110"
              : n >= 5 ? "bg-sky-500 border-sky-500 text-white scale-110"
              : "bg-red-400 border-red-400 text-white scale-110"
              : value > 0 && n <= value
              ? n >= 8 ? "bg-emerald-100 border-emerald-300 text-emerald-700"
              : n >= 5 ? "bg-sky-100 border-sky-300 text-sky-700"
              : "bg-red-50 border-red-200 text-red-500"
              : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-100"
          }`}>
          {n}
        </button>
      ))}
      {value > 0 && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg border mr-1 ${
          value >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : value >= 5 ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-red-50 text-red-600 border-red-200"
        }`}>
          {value >= 9 ? "ممتاز" : value >= 7 ? "جيد جداً" : value >= 5 ? "جيد" : value >= 3 ? "مقبول" : "ضعيف"}
        </span>
      )}
    </div>
  );
}

function StatBar({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-sky-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-14 text-left">{score.toFixed(1)}/{max}</span>
    </div>
  );
}

// ══════════════════════════
// أنواع
// ══════════════════════════
type Employee = { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
type Evaluation = {
  id: string; employeeId: string; period: string; year: number;
  score?: number; grade?: string; answers?: string;
  strengths?: string; improvements?: string; goals?: string;
  evaluatorName?: string; status: string;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
};

const statusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "مسودة",    color: "bg-gray-100 text-gray-600 border-gray-200",       icon: ClipboardList },
  submitted: { label: "بانتظار الاعتماد", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  approved:  { label: "معتمد",    color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
};

const emptyAnswers = () => Object.fromEntries(ALL_QUESTIONS.map(q => [q.id, 0]));

const SECTION_COLORS: Record<string, { card: string; header: string; icon: string }> = {
  sky:    { card: "border-sky-200 bg-sky-50/30",       header: "bg-sky-50 border-sky-100",    icon: "bg-sky-100 text-sky-600" },
  purple: { card: "border-purple-200 bg-purple-50/30", header: "bg-purple-50 border-purple-100", icon: "bg-purple-100 text-purple-600" },
  green:  { card: "border-green-200 bg-green-50/30",   header: "bg-green-50 border-green-100",  icon: "bg-green-100 text-green-600" },
  amber:  { card: "border-amber-200 bg-amber-50/30",   header: "bg-amber-50 border-amber-100",  icon: "bg-amber-100 text-amber-600" },
  rose:   { card: "border-rose-200 bg-rose-50/30",     header: "bg-rose-50 border-rose-100",    icon: "bg-rose-100 text-rose-600" },
};

export default function EvaluationsPage() {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen]             = useState(false);
  const [viewEval, setViewEval]     = useState<Evaluation | null>(null);
  const [approving, setApproving]   = useState<string | null>(null);

  // نموذج
  const [empId, setEmpId]       = useState("");
  const period                  = "Annual"; // التقييم سنوي دائماً
  const [year, setYear]         = useState(String(new Date().getFullYear()));
  const [answers, setAnswers]   = useState<Record<string, number>>(emptyAnswers());
  const [strengths, setStrengths]   = useState("");
  const [improvements, setImprovements] = useState("");
  const [goals, setGoals]       = useState("");
  const [status, setStatus]     = useState("draft");
  const [saving, setSaving]     = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map(s => [s.id, true]))
  );

  const fetchData = async () => {
    const [empRes, evRes] = await Promise.all([
      fetch("/api/employees?all=1"),
      fetch("/api/evaluations"),
    ]);
    const empData = await empRes.json();
    setEmployees(Array.isArray(empData) ? empData : (empData.data ?? []));
    const evData = await evRes.json();
    setEvaluations(Array.isArray(evData) ? evData : []);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEmpId(""); setYear(String(new Date().getFullYear()));
    setAnswers(emptyAnswers()); setStrengths(""); setImprovements(""); setGoals("");
    setStatus("draft");
    setOpenSections(Object.fromEntries(SECTIONS.map(s => [s.id, true])));
    setOpen(true);
  };

  const answered   = Object.values(answers).filter(v => v > 0).length;
  const finalScore = answered === ALL_QUESTIONS.length ? calcFinalScore(answers) : 0;
  const gradeInfo  = finalScore > 0 ? scoreToGrade(finalScore) : null;

  const sectionScore = (sectionId: string) => {
    const sec  = SECTIONS.find(s => s.id === sectionId)!;
    const vals = sec.questions.map(q => answers[q.id] ?? 0).filter(v => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const handleSave = async () => {
    if (!empId) return;
    setSaving(true);
    const score = answered === ALL_QUESTIONS.length ? calcFinalScore(answers) : null;
    const grade = score ? scoreToGrade(score).label : null;
    await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: empId, period, year: parseInt(year),
        score, grade, answers: JSON.stringify(answers),
        strengths, improvements, goals, status,
      }),
    });
    setSaving(false); setOpen(false); fetchData();
  };

  const approveEval = async (id: string) => {
    setApproving(id);
    await fetch(`/api/evaluations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    setApproving(null);
    fetchData();
    if (viewEval?.id === id) setViewEval(prev => prev ? { ...prev, status: "approved" } : null);
  };

  const toggleSection = (id: string) =>
    setOpenSections(p => ({ ...p, [id]: !p[id] }));

  // فلتر الحالة
  const counts = {
    all:       evaluations.length,
    draft:     evaluations.filter(e => e.status === "draft").length,
    submitted: evaluations.filter(e => e.status === "submitted").length,
    approved:  evaluations.filter(e => e.status === "approved").length,
  };
  const filtered = filterStatus === "all" ? evaluations : evaluations.filter(e => e.status === filterStatus);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* ── رأس الصفحة ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" /> تقييم الأداء السنوي
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">نموذج 30 سؤال — النتيجة من 5</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="h-4 w-4" /> تقييم جديد
        </Button>
      </div>

      {/* ── فلتر الحالة ── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all",       label: "الكل",               color: "bg-gray-900 text-white",                     inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
          { key: "submitted", label: "بانتظار الاعتماد",   color: "bg-amber-500 text-white",                    inactive: "bg-white text-amber-600 border-amber-200 hover:bg-amber-50" },
          { key: "approved",  label: "معتمد",               color: "bg-emerald-600 text-white",                  inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
          { key: "draft",     label: "مسودة",               color: "bg-gray-500 text-white",                     inactive: "bg-white text-gray-500 border-gray-200 hover:bg-gray-50" },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filterStatus === f.key ? f.color : f.inactive
            }`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              filterStatus === f.key ? "bg-white/20" : "bg-gray-100"
            }`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── قائمة التقييمات ── */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد تقييمات</p>
          <p className="text-sm mt-1 text-gray-400">
            {filterStatus !== "all" ? "لا توجد تقييمات بهذه الحالة" : "ابدأ بإضافة تقييم جديد"}
          </p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ev => {
            const g  = ev.score != null ? scoreToGrade(ev.score) : null;
            const st = statusMap[ev.status] ?? statusMap.draft;
            const StatusIcon = st.icon;
            const parsedAnswers: Record<string, number> = ev.answers ? JSON.parse(ev.answers) : {};
            const isPending = ev.status === "submitted";

            return (
              <Card key={ev.id}
                className={`hover:shadow-md transition-shadow cursor-pointer relative ${isPending ? "ring-2 ring-amber-300" : ""}`}
                onClick={() => setViewEval(ev)}>
                {isPending && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    يحتاج اعتماد
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar photo={ev.employee.photo} firstName={ev.employee.firstName} lastName={ev.employee.lastName} size="sm" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{ev.employee.firstName} {ev.employee.lastName}</p>
                        <p className="text-xs text-gray-400">{ev.employee.department}</p>
                      </div>
                    </div>
                    {g && (
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-xl border ${g.color}`}>{g.label}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">تقييم سنوي {ev.year}</span>
                    <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border ${st.color}`}>
                      <StatusIcon className="h-3 w-3" />{st.label}
                    </span>
                  </div>

                  {ev.evaluatorName && (
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <User className="h-3 w-3" /> المقيِّم: {ev.evaluatorName}
                    </p>
                  )}

                  {ev.score != null && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">النتيجة النهائية</span>
                          <span className="text-lg font-bold text-gray-900">{ev.score}<span className="text-sm text-gray-400">/5</span></span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ev.score >= 4 ? "bg-emerald-500" : ev.score >= 3 ? "bg-sky-500" : ev.score >= 2 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${(ev.score / 5) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(ev.score!) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* محاور مصغّرة */}
                  {Object.keys(parsedAnswers).length > 0 && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100">
                      {SECTIONS.map(sec => {
                        const vals = sec.questions.map(q => parsedAnswers[q.id] ?? 0).filter(v => v > 0);
                        if (!vals.length) return null;
                        const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
                        const pct = (avg / 10) * 100;
                        return (
                          <div key={sec.id} className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 w-24 shrink-0">{sec.label}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                              <div className={`h-full rounded-full ${pct>=80?"bg-emerald-400":pct>=60?"bg-sky-400":pct>=40?"bg-yellow-400":"bg-red-400"}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500">{avg.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* زر الاعتماد */}
                  {isPending && (
                    <button
                      onClick={e => { e.stopPropagation(); approveEval(ev.id); }}
                      disabled={approving === ev.id}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-60">
                      {approving === ev.id
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <ThumbsUp className="h-3.5 w-3.5" />}
                      اعتماد التقييم
                    </button>
                  )}
                  {!isPending && (
                    <button className="mt-3 text-xs text-sky-600 flex items-center gap-1 hover:underline">
                      <Eye className="h-3 w-3" /> عرض التفاصيل
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          نموذج إضافة تقييم — حجم كبير ومحسَّن
         ═══════════════════════════════════════════ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[98vw] w-full h-[97vh] flex flex-col p-0 gap-0 rounded-xl" dir="rtl">

          {/* ── رأس ثابت ── */}
          <div className="shrink-0 bg-white border-b px-6 py-4 space-y-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ClipboardList className="h-5 w-5 text-sky-600" />
                نموذج تقييم الأداء السنوي
              </DialogTitle>
            </DialogHeader>

            {/* بيانات التقييم */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">الموظف <span className="text-red-500">*</span></Label>
                <Select value={empId} onValueChange={v => v && setEmpId(v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} — {e.department ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">سنة التقييم</Label>
                <Input className="h-9" type="number" value={year} onChange={e => setYear(e.target.value)} />
              </div>
            </div>

            {/* شريط التقدم */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                <div className="bg-sky-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${(answered / ALL_QUESTIONS.length) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-500 shrink-0 font-medium">{answered}/{ALL_QUESTIONS.length} سؤال</span>
              {finalScore > 0 && gradeInfo && (
                <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${gradeInfo.color}`}>
                  {finalScore}/5 — {gradeInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* ── محتوى قابل للتمرير ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
            {SECTIONS.map((sec, si) => {
              const Icon   = sec.icon;
              const secScr = sectionScore(sec.id);
              const isOpen = openSections[sec.id];
              const clr    = SECTION_COLORS[sec.color];

              return (
                <Card key={sec.id} className={`border-2 ${clr.card}`}>
                  {/* رأس المحور */}
                  <button type="button" className={`w-full flex items-center justify-between p-4 rounded-t-xl ${clr.header} border-b`}
                    onClick={() => toggleSection(sec.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${clr.icon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{si + 1}. {sec.label}</p>
                        <p className="text-xs text-gray-500">{sec.questions.length} أسئلة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {secScr !== null && (
                        <span className="text-sm font-bold text-gray-700 bg-white px-3 py-1 rounded-lg border">{secScr.toFixed(1)}/10</span>
                      )}
                      {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                    </div>
                  </button>

                  {/* الأسئلة — عمودان */}
                  {isOpen && (
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {sec.questions.map((q, qi) => (
                        <div key={q.id} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-gray-400 shrink-0 mt-0.5">{qi + 1}.</span>
                            <p className="text-sm font-semibold text-gray-800 leading-snug">{q.text}</p>
                          </div>
                          <RatingBar
                            value={answers[q.id] ?? 0}
                            onChange={v => setAnswers(p => ({ ...p, [q.id]: v }))}
                          />
                          {(answers[q.id] ?? 0) === 0 && (
                            <p className="text-[11px] text-gray-400">اضغط رقماً من 1 (ضعيف) إلى 10 (ممتاز)</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* ملاحظات نصية — ثلاثة أعمدة */}
            <Card className="border">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-600" /> ملاحظات المقيِّم
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 font-semibold">✅ نقاط القوة</Label>
                    <Textarea value={strengths} onChange={e => setStrengths(e.target.value)}
                      placeholder="أبرز نقاط القوة لدى الموظف..." rows={4} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 font-semibold">🔧 مجالات التحسين</Label>
                    <Textarea value={improvements} onChange={e => setImprovements(e.target.value)}
                      placeholder="المجالات التي يحتاج تطويرها..." rows={4} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 font-semibold">🎯 الأهداف القادمة</Label>
                    <Textarea value={goals} onChange={e => setGoals(e.target.value)}
                      placeholder="أهداف وخطط التطوير المقترحة..." rows={4} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── تذييل ثابت ── */}
          <div className="shrink-0 bg-white border-t px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Select value={status} onValueChange={v => v && setStatus(v)}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">حفظ مسودة</SelectItem>
                  <SelectItem value="submitted">إرسال للاعتماد</SelectItem>
                  <SelectItem value="approved">اعتماد مباشر</SelectItem>
                </SelectContent>
              </Select>
              {finalScore > 0 && gradeInfo && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm ${gradeInfo.color}`}>
                  <Star className="h-4 w-4" />
                  {finalScore}/5 — {gradeInfo.label}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving || !empId} className="bg-sky-600 hover:bg-sky-700 gap-2 px-6">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />}
                حفظ التقييم
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════ Dialog: عرض تفاصيل تقييم ════════════════ */}
      {viewEval && (
        <Dialog open={!!viewEval} onOpenChange={() => setViewEval(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                تقييم {viewEval.employee.firstName} {viewEval.employee.lastName} — {viewEval.year}
              </DialogTitle>
            </DialogHeader>

            {/* الحالة + المقيّم */}
            <div className="flex items-center gap-3 flex-wrap">
              {(() => { const st = statusMap[viewEval.status] ?? statusMap.draft; const SI = st.icon; return (
                <span className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full border font-medium ${st.color}`}>
                  <SI className="h-3.5 w-3.5" />{st.label}
                </span>
              ); })()}
              {viewEval.evaluatorName && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="h-3 w-3" /> المقيِّم: {viewEval.evaluatorName}
                </span>
              )}
            </div>

            {viewEval.score != null && (
              <div className="text-center py-4 border-b border-t mt-2">
                <p className="text-6xl font-black text-gray-900 mb-1">{viewEval.score}<span className="text-2xl text-gray-400">/5</span></p>
                {(() => { const g = scoreToGrade(viewEval.score!); return (
                  <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${g.color}`}>{g.label}</span>
                ); })()}
                <div className="flex justify-center gap-1 mt-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-7 w-7 ${s <= Math.round(viewEval.score!) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
            )}

            {viewEval.answers && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900">النتيجة حسب المحور</h3>
                {SECTIONS.map(sec => {
                  const parsed = JSON.parse(viewEval.answers!);
                  const vals = sec.questions.map(q => parsed[q.id] ?? 0).filter((v: number) => v > 0);
                  if (!vals.length) return null;
                  const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
                  return <StatBar key={sec.id} label={sec.label} score={avg} />;
                })}
              </div>
            )}

            {(viewEval.strengths || viewEval.improvements || viewEval.goals) && (
              <div className="space-y-3 pt-3 border-t">
                {viewEval.strengths && (
                  <div><p className="text-xs font-bold text-green-700 mb-1">✅ نقاط القوة</p>
                  <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{viewEval.strengths}</p></div>
                )}
                {viewEval.improvements && (
                  <div><p className="text-xs font-bold text-amber-700 mb-1">🔧 مجالات التحسين</p>
                  <p className="text-sm text-gray-700 bg-amber-50 rounded-lg p-3">{viewEval.improvements}</p></div>
                )}
                {viewEval.goals && (
                  <div><p className="text-xs font-bold text-sky-700 mb-1">🎯 الأهداف القادمة</p>
                  <p className="text-sm text-gray-700 bg-sky-50 rounded-lg p-3">{viewEval.goals}</p></div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              {viewEval.status === "submitted" && (
                <Button onClick={() => approveEval(viewEval.id)} disabled={approving === viewEval.id}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                  {approving === viewEval.id
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <ThumbsUp className="h-4 w-4" />}
                  اعتماد التقييم
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewEval(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
