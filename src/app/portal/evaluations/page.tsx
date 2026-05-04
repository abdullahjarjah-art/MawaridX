"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Plus, Star, Users, Target, Lightbulb, Award,
  ChevronDown, ChevronUp, CheckCircle2, ClipboardList, TrendingUp, Eye,
  Send, Clock, ShieldCheck, Pencil,
} from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { useLang } from "@/components/lang-provider";

// ══════════════════════════════════════════════
// نفس تعريفات أسئلة التقييم
// ══════════════════════════════════════════════
const SECTIONS = [
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
const TOTAL_MAX     = ALL_QUESTIONS.length * 10;

function calcFinalScore(answers: Record<string, number>) {
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  return Math.round((total / TOTAL_MAX) * 5 * 10) / 10;
}

function scoreToGrade(score: number) {
  if (score >= 4.5) return { label: "ممتاز",      color: "bg-emerald-100 text-emerald-700 border-emerald-300" };
  if (score >= 3.5) return { label: "جيد جداً",   color: "bg-sky-100 text-sky-700 border-sky-300" };
  if (score >= 2.5) return { label: "جيد",         color: "bg-yellow-100 text-yellow-700 border-yellow-300" };
  if (score >= 1.5) return { label: "مقبول",       color: "bg-orange-100 text-orange-700 border-orange-300" };
  return               { label: "يحتاج تحسين", color: "bg-red-100 text-red-700 border-red-300" };
}

function RatingBar({ value, onChange, readOnly }: { value: number; onChange: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button key={n} type="button" onClick={() => !readOnly && onChange(n)} disabled={readOnly}
          className={`h-9 w-9 rounded-lg text-sm font-bold border-2 transition-all ${readOnly ? "cursor-default" : ""}  ${
            value === n
              ? n >= 8 ? "bg-emerald-500 border-emerald-500 text-white scale-105"
              : n >= 5 ? "bg-sky-500 border-sky-500 text-white scale-105"
              : "bg-red-400 border-red-400 text-white scale-105"
              : value > 0 && n <= value
              ? n >= 8 ? "bg-emerald-100 border-emerald-300 text-emerald-700"
              : n >= 5 ? "bg-sky-100 border-sky-300 text-sky-700"
              : "bg-red-50 border-red-200 text-red-500"
              : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"
          }`}>
          {n}
        </button>
      ))}
      {value > 0 && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
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

const SECTION_COLORS: Record<string, { card: string; header: string; icon: string }> = {
  sky:    { card: "border-sky-200",    header: "bg-sky-50 border-sky-100",       icon: "bg-sky-100 text-sky-600" },
  purple: { card: "border-purple-200", header: "bg-purple-50 border-purple-100", icon: "bg-purple-100 text-purple-600" },
  green:  { card: "border-green-200",  header: "bg-green-50 border-green-100",   icon: "bg-green-100 text-green-600" },
  amber:  { card: "border-amber-200",  header: "bg-amber-50 border-amber-100",   icon: "bg-amber-100 text-amber-600" },
  rose:   { card: "border-rose-200",   header: "bg-rose-50 border-rose-100",     icon: "bg-rose-100 text-rose-600" },
};

type Subordinate = { id: string; firstName: string; lastName: string; employeeNumber: string; department?: string; photo?: string | null };
type Evaluation  = {
  id: string; employeeId: string; period: string; year: number;
  score?: number; grade?: string; answers?: string;
  strengths?: string; improvements?: string; goals?: string;
  status: string;
  employee: { firstName: string; lastName: string; department?: string; photo?: string | null };
};

const statusMap = {
  draft:     { label: "مسودة",           color: "bg-gray-100 text-gray-600 border-gray-200",          icon: ClipboardList },
  submitted: { label: "بانتظار الاعتماد", color: "bg-amber-100 text-amber-700 border-amber-200",       icon: Clock },
  approved:  { label: "معتمد",            color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
};

const emptyAnswers = () => Object.fromEntries(ALL_QUESTIONS.map(q => [q.id, 0]));

export default function PortalEvaluationsPage() {
  const { t } = useLang();
  const [manager, setManager] = useState<{ id: string; name: string } | null>(null);
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [evaluations,  setEvaluations]  = useState<Evaluation[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [open,         setOpen]         = useState(false);
  const [editEval,     setEditEval]     = useState<Evaluation | null>(null);
  const [viewEval,     setViewEval]     = useState<Evaluation | null>(null);

  // نموذج
  const [empId, setEmpId]   = useState("");
  const period              = "Annual"; // التقييم سنوي دائماً
  const [year, setYear]     = useState(String(new Date().getFullYear()));
  const [answers,   setAnswers]   = useState<Record<string, number>>(emptyAnswers());
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [goals, setGoals]   = useState("");
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map(s => [s.id, true]))
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (!data.employee?.id) return;
        const id   = data.employee.id as string;
        const name = `${data.employee.firstName} ${data.employee.lastName}`;
        setManager({ id, name });
        // جلب المرؤوسين والتقييمات
        return Promise.all([
          fetch(`/api/employees?managerId=${id}&all=1`).then(r => r.json()),
          fetch(`/api/evaluations?managerId=${id}`).then(r => r.json()),
        ]);
      })
      .then(results => {
        if (!results) return;
        const [empData, evData] = results;
        setSubordinates(Array.isArray(empData) ? empData : (empData.data ?? []));
        setEvaluations(Array.isArray(evData)  ? evData  : []);
        setLoading(false);
      });
  }, []);

  const openNew = () => {
    setEditEval(null);
    setEmpId(""); setYear(String(new Date().getFullYear()));
    setAnswers(emptyAnswers()); setStrengths(""); setImprovements(""); setGoals("");
    setOpenSections(Object.fromEntries(SECTIONS.map(s => [s.id, true])));
    setOpen(true);
  };

  const openEdit = (ev: Evaluation) => {
    if (ev.status !== "draft") return; // لا يمكن تعديل المُرسَل أو المعتمد
    setEditEval(ev);
    setEmpId(ev.employeeId);
    setYear(String(ev.year));
    setAnswers(ev.answers ? JSON.parse(ev.answers) : emptyAnswers());
    setStrengths(ev.strengths ?? "");
    setImprovements(ev.improvements ?? "");
    setGoals(ev.goals ?? "");
    setOpenSections(Object.fromEntries(SECTIONS.map(s => [s.id, true])));
    setOpen(true);
  };

  const answered    = Object.values(answers).filter(v => v > 0).length;
  const finalScore  = answered === ALL_QUESTIONS.length ? calcFinalScore(answers) : 0;
  const gradeInfo   = finalScore > 0 ? scoreToGrade(finalScore) : null;

  const sectionScore = (sectionId: string) => {
    const sec  = SECTIONS.find(s => s.id === sectionId)!;
    const vals = sec.questions.map(q => answers[q.id] ?? 0).filter(v => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const saveEval = async (targetStatus: "draft" | "submitted") => {
    if (!empId || !manager) return;
    setSaving(true);
    const score = answered === ALL_QUESTIONS.length ? calcFinalScore(answers) : null;
    const grade = score ? scoreToGrade(score).label : null;
    const body  = JSON.stringify({
      employeeId: empId, period, year: parseInt(year),
      score, grade, answers: JSON.stringify(answers),
      strengths, improvements, goals,
      evaluatorId: manager.id, evaluatorName: manager.name,
      status: targetStatus,
    });

    if (editEval) {
      await fetch(`/api/evaluations/${editEval.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body,
      });
    } else {
      await fetch("/api/evaluations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
    }

    setSaving(false); setOpen(false);
    // إعادة تحميل
    if (manager) {
      const evData = await fetch(`/api/evaluations?managerId=${manager.id}`).then(r => r.json());
      setEvaluations(Array.isArray(evData) ? evData : []);
    }
  };

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!subordinates.length && !loading) return (
    <div className="p-6 text-center text-gray-400 space-y-3">
      <Users className="h-12 w-12 mx-auto opacity-30" />
      <p className="font-semibold text-gray-600">لا يوجد موظفون مرتبطون بك</p>
      <p className="text-sm">يظهر هنا الموظفون الذين أنت مديرهم المباشر</p>
    </div>
  );

  const counts = {
    draft:     evaluations.filter(e => e.status === "draft").length,
    submitted: evaluations.filter(e => e.status === "submitted").length,
    approved:  evaluations.filter(e => e.status === "approved").length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* رأس */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" /> {t("تقييم الفريق")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{subordinates.length} موظف تحت إدارتك</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700">
          <Plus className="h-4 w-4" /> تقييم جديد
        </Button>
      </div>

      {/* إحصاءات */}
      {evaluations.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "مسودة",            count: counts.draft,     color: "bg-gray-50 border-gray-200 text-gray-600",          icon: ClipboardList },
            { label: "بانتظار الاعتماد", count: counts.submitted, color: "bg-amber-50 border-amber-200 text-amber-700",       icon: Clock },
            { label: "معتمدة",           count: counts.approved,  color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: ShieldCheck },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className={`rounded-xl p-3 border text-center ${color}`}>
              <Icon className="h-5 w-5 mx-auto mb-1" />
              <p className="text-xl font-bold">{count}</p>
              <p className="text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* قائمة التقييمات */}
      {evaluations.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لم تُنشئ أي تقييمات بعد</p>
          <p className="text-sm mt-1">ابدأ بتقييم أحد موظفيك</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {evaluations.map(ev => {
            const g  = ev.score != null ? scoreToGrade(ev.score) : null;
            const st = statusMap[ev.status as keyof typeof statusMap] ?? statusMap.draft;
            const StatusIcon = st.icon;
            const canEdit    = ev.status === "draft";
            return (
              <Card key={ev.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <EmployeeAvatar photo={ev.employee.photo} firstName={ev.employee.firstName} lastName={ev.employee.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{ev.employee.firstName} {ev.employee.lastName}</p>
                          <p className="text-xs text-gray-400">{ev.employee.department}</p>
                        </div>
                        {g && <span className={`text-xs font-bold px-2 py-0.5 rounded-xl border shrink-0 ${g.color}`}>{g.label}</span>}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">تقييم سنوي {ev.year}</span>
                        <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border ${st.color}`}>
                          <StatusIcon className="h-3 w-3" />{st.label}
                        </span>
                        {ev.score != null && (
                          <span className="text-xs font-bold text-gray-700">{ev.score}/5</span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setViewEval(ev)}
                          className="flex items-center gap-1 text-xs text-sky-600 hover:underline">
                          <Eye className="h-3.5 w-3.5" /> عرض
                        </button>
                        {canEdit && (
                          <button onClick={() => openEdit(ev)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                            <Pencil className="h-3.5 w-3.5" /> تعديل
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          نموذج التقييم — كامل الشاشة تقريباً
         ═══════════════════════════════════════════ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[98vw] w-full h-[97vh] flex flex-col p-0 gap-0 rounded-xl" dir="rtl">

          {/* رأس ثابت */}
          <div className="shrink-0 bg-white border-b px-5 py-4 space-y-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-sky-600" />
                {editEval ? "تعديل التقييم" : "تقييم أداء موظف"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">الموظف <span className="text-red-500">*</span></Label>
                <Select value={empId} onValueChange={v => v && setEmpId(v)} disabled={!!editEval}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                  <SelectContent>
                    {subordinates.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
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
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-sky-500 h-2 rounded-full transition-all"
                  style={{ width: `${(answered / ALL_QUESTIONS.length) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-500 shrink-0">{answered}/{ALL_QUESTIONS.length}</span>
              {finalScore > 0 && gradeInfo && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${gradeInfo.color}`}>
                  {finalScore}/5 — {gradeInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* محتوى قابل للتمرير */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/40">
            {SECTIONS.map((sec, si) => {
              const Icon   = sec.icon;
              const secScr = sectionScore(sec.id);
              const isOpen = openSections[sec.id];
              const clr    = SECTION_COLORS[sec.color];
              return (
                <Card key={sec.id} className={`border-2 ${clr.card}`}>
                  <button type="button" className={`w-full flex items-center justify-between p-4 rounded-t-xl ${clr.header} border-b`}
                    onClick={() => setOpenSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${clr.icon}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">{si + 1}. {sec.label}</p>
                        <p className="text-xs text-gray-500">{sec.questions.length} أسئلة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {secScr !== null && (
                        <span className="text-sm font-bold text-gray-700 bg-white px-2 py-0.5 rounded-lg border">{secScr.toFixed(1)}/10</span>
                      )}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {sec.questions.map((q, qi) => (
                        <div key={q.id} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                          <p className="text-sm font-semibold text-gray-800">
                            <span className="text-gray-400 ml-1">{qi + 1}.</span> {q.text}
                          </p>
                          <RatingBar value={answers[q.id] ?? 0} onChange={v => setAnswers(p => ({ ...p, [q.id]: v }))} />
                          {(answers[q.id] ?? 0) === 0 && (
                            <p className="text-[11px] text-gray-400">1 = ضعيف ، 10 = ممتاز</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* ملاحظات */}
            <Card className="border">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-600" /> ملاحظاتك
                </h3>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-green-700">✅ نقاط القوة</Label>
                  <Textarea value={strengths} onChange={e => setStrengths(e.target.value)}
                    placeholder="ما أبرز نقاط القوة..." rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-amber-700">🔧 مجالات التحسين</Label>
                  <Textarea value={improvements} onChange={e => setImprovements(e.target.value)}
                    placeholder="ما المجالات التي يحتاج تطويرها..." rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-sky-700">🎯 الأهداف القادمة</Label>
                  <Textarea value={goals} onChange={e => setGoals(e.target.value)}
                    placeholder="أهداف الفترة القادمة..." rows={2} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* تذييل ثابت */}
          <div className="shrink-0 bg-white border-t px-5 py-4 flex items-center justify-between gap-3">
            <div>
              {finalScore > 0 && gradeInfo && (
                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm ${gradeInfo.color}`}>
                  <Star className="h-4 w-4" /> {finalScore}/5 — {gradeInfo.label}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button size="sm" variant="outline" onClick={() => saveEval("draft")} disabled={saving || !empId}
                className="gap-1.5 border-gray-300">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                حفظ مسودة
              </Button>
              <Button size="sm" onClick={() => saveEval("submitted")} disabled={saving || !empId || answered < ALL_QUESTIONS.length}
                className="gap-1.5 bg-sky-600 hover:bg-sky-700">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال للاعتماد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog عرض التفاصيل */}
      {viewEval && (
        <Dialog open={!!viewEval} onOpenChange={() => setViewEval(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {viewEval.employee.firstName} {viewEval.employee.lastName} — تقييم {viewEval.year}
              </DialogTitle>
            </DialogHeader>

            {(() => { const st = statusMap[viewEval.status as keyof typeof statusMap] ?? statusMap.draft; const SI = st.icon; return (
              <span className={`text-xs inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium ${st.color}`}>
                <SI className="h-3.5 w-3.5" />{st.label}
              </span>
            ); })()}

            {viewEval.score != null && (
              <div className="text-center py-4 border-y">
                <p className="text-5xl font-black text-gray-900 mb-1">{viewEval.score}<span className="text-2xl text-gray-400">/5</span></p>
                {(() => { const g = scoreToGrade(viewEval.score!); return (
                  <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${g.color}`}>{g.label}</span>
                ); })()}
                <div className="flex justify-center gap-1 mt-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-6 w-6 ${s <= Math.round(viewEval.score!) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
            )}

            {viewEval.answers && (
              <div className="space-y-2">
                {SECTIONS.map(sec => {
                  const parsed = JSON.parse(viewEval.answers!);
                  const vals   = sec.questions.map(q => parsed[q.id] ?? 0).filter((v: number) => v > 0);
                  if (!vals.length) return null;
                  const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
                  const pct = (avg / 10) * 100;
                  return (
                    <div key={sec.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-32 shrink-0">{sec.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${pct>=80?"bg-emerald-500":pct>=60?"bg-sky-500":pct>=40?"bg-yellow-500":"bg-red-500"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-12">{avg.toFixed(1)}/10</span>
                    </div>
                  );
                })}
              </div>
            )}

            {(viewEval.strengths || viewEval.improvements || viewEval.goals) && (
              <div className="space-y-2 pt-3 border-t">
                {viewEval.strengths && (
                  <div><p className="text-xs font-bold text-green-700 mb-1">✅ نقاط القوة</p>
                  <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-2">{viewEval.strengths}</p></div>
                )}
                {viewEval.improvements && (
                  <div><p className="text-xs font-bold text-amber-700 mb-1">🔧 مجالات التحسين</p>
                  <p className="text-sm text-gray-700 bg-amber-50 rounded-lg p-2">{viewEval.improvements}</p></div>
                )}
                {viewEval.goals && (
                  <div><p className="text-xs font-bold text-sky-700 mb-1">🎯 الأهداف القادمة</p>
                  <p className="text-sm text-gray-700 bg-sky-50 rounded-lg p-2">{viewEval.goals}</p></div>
                )}
              </div>
            )}

            <DialogFooter>
              {viewEval.status === "draft" && (
                <Button size="sm" variant="outline" onClick={() => { setViewEval(null); openEdit(viewEval); }} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> تعديل
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setViewEval(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
