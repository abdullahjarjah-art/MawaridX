"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { MawaridXLogo, MawaridXWordmark } from "@/components/mawaridx-logo";
import {
  User, Mail, Lock, Phone, Briefcase, Building2,
  AlertCircle, Eye, EyeOff, CheckCircle2, UserPlus, Sparkles,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    phone: "", department: "", jobTitle: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // قوة كلمة المرور
  const passStrength = (() => {
    const p = form.password;
    if (!p) return { level: 0, label: "", color: "" };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { level: 1, label: "ضعيفة",  color: "bg-red-500",    pct: 25 };
    if (score <= 2) return { level: 2, label: "مقبولة", color: "bg-amber-500",  pct: 50 };
    if (score <= 3) return { level: 3, label: "جيدة",    color: "bg-sky-500",    pct: 75 };
    return              { level: 4, label: "قوية",    color: "bg-emerald-500", pct: 100 };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (form.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    router.push("/portal");
  };

  const inputCls = "h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-brand-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all";

  return (
    <div className="min-h-screen w-full flex overflow-hidden">
      {/* ─────────── الجانب الأيمن: هوية MawaridX ─────────── */}
      <aside className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-brand-gradient">
        <div className="absolute inset-0 pattern-islamic opacity-[0.18]" />

        {/* Glow orbs */}
        <div className="absolute -top-40 -right-20 w-96 h-96 rounded-full bg-amber-300/25 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-20 w-[30rem] h-[30rem] rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-56 h-56 rounded-full bg-sky-300/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        {/* زخرفة هندسية */}
        <svg className="absolute right-10 bottom-12 opacity-20" width="260" height="260" viewBox="0 0 260 260" fill="none">
          <g stroke="#fbbf24" strokeWidth="1" fill="none">
            <circle cx="130" cy="130" r="120" />
            <circle cx="130" cy="130" r="90" />
            <circle cx="130" cy="130" r="60" />
            <path d="M130 10 L250 130 L130 250 L10 130 Z" />
            <path d="M130 50 L210 130 L130 210 L50 130 Z" />
            <path d="M40 40 L220 220 M220 40 L40 220" />
          </g>
        </svg>

        <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">
          {/* شعار */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 ring-1 ring-white/20">
              <MawaridXLogo size={44} animate />
            </div>
            <div>
              <MawaridXWordmark className="text-2xl" variant="light" />
              <p className="text-[11px] text-white/70 mt-0.5 tracking-wide">HR MANAGEMENT PLATFORM</p>
            </div>
          </div>

          {/* النص الرئيسي */}
          <div className="space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs font-medium tracking-wide">انضم إلى فريقنا</span>
            </div>
            <h2 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight">
              ابدأ رحلتك <br />
              <span className="text-gold-gradient">المهنية</span> معنا <br />
              اليوم.
            </h2>
            <p className="text-white/80 text-base mt-4 max-w-md leading-relaxed">
              سجّل حسابك للوصول إلى بوابة الموظف وإدارة بياناتك، حضورك، طلباتك، وراتبك من مكان واحد.
            </p>

            {/* خطوات التسجيل */}
            <div className="space-y-3 pt-4 max-w-sm">
              {[
                { num: "1", text: "أدخل بياناتك الأساسية" },
                { num: "2", text: "اختر كلمة مرور قوية" },
                { num: "3", text: "ابدأ استخدام المنصة فوراً" },
              ].map((step, i) => (
                <div key={step.num}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-2.5 animate-fade-up"
                  style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                  <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shrink-0 text-white font-black text-sm">
                    {step.num}
                  </div>
                  <span className="text-sm font-semibold">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/60 animate-fade-in">
            <span>© {new Date().getFullYear()} MawaridX</span>
            <Link href="/login" className="hover:text-white transition-colors font-medium">
              لديك حساب؟ سجّل دخولك →
            </Link>
          </div>
        </div>
      </aside>

      {/* ─────────── الجانب الأيسر: النموذج ─────────── */}
      <section className="flex-1 mesh-bg relative flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="pattern-islamic absolute inset-0 pointer-events-none opacity-50" />

        <div className="relative w-full max-w-lg animate-scale-in my-6">
          {/* Logo للموبايل */}
          <div className="lg:hidden flex flex-col items-center mb-5">
            <MawaridXLogo size={56} animate />
            <MawaridXWordmark className="text-2xl mt-3" />
            <p className="text-brand-muted text-xs mt-1">إنشاء حساب جديد</p>
          </div>

          <div className="glass-strong rounded-3xl shadow-brand-lg border border-white/50 dark:border-white/10 p-6 sm:p-8">
            {/* رأس */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-gradient shadow-brand mb-3">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-brand-ink">إنشاء حسابك</h1>
              <p className="text-sm text-brand-muted mt-1">املأ البيانات التالية للانضمام</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* الاسم */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-brand-ink">الاسم الأول *</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                    <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                      required className={`pr-10 ${inputCls}`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-brand-ink">اسم العائلة *</Label>
                  <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                    required className={inputCls} />
                </div>
              </div>

              {/* الإيميل */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-ink">البريد الإلكتروني *</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                  <Input type="email" placeholder="example@company.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    required className={`pr-10 ${inputCls}`} />
                </div>
              </div>

              {/* الهاتف */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-ink">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                  <Input type="tel" placeholder="05xxxxxxxx" dir="ltr"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className={`pr-10 text-right ${inputCls}`} />
                </div>
              </div>

              {/* المسمى والقسم */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-brand-ink">المسمى الوظيفي</Label>
                  <div className="relative">
                    <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                    <Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                      className={`pr-10 ${inputCls}`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-brand-ink">القسم</Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                    <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className={`pr-10 ${inputCls}`} />
                  </div>
                </div>
              </div>

              {/* كلمة المرور + قوّتها */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-ink">كلمة المرور *</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                  <Input type={showPass ? "text" : "password"} placeholder="6 أحرف على الأقل"
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    required className={`pr-10 pl-10 ${inputCls}`} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-primary transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${passStrength.color}`} style={{ width: `${passStrength.pct}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${
                      passStrength.level >= 4 ? "text-emerald-600" :
                      passStrength.level >= 3 ? "text-sky-600" :
                      passStrength.level >= 2 ? "text-amber-600" : "text-red-600"
                    }`}>{passStrength.label}</span>
                  </div>
                )}
              </div>

              {/* تأكيد كلمة المرور */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-ink">تأكيد كلمة المرور *</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                  <Input type={showConfirm ? "text" : "password"} placeholder="أعد كتابة كلمة المرور"
                    value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    required className={`pr-10 pl-16 ${inputCls}`} />
                  <button type="button" onClick={() => setShowConfirm(s => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-primary transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <CheckCircle2 className="absolute left-10 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* الخطأ */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl animate-fade-up">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* زر التسجيل */}
              <button type="submit" disabled={loading}
                className="btn-brand w-full h-11 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/70 border-t-white rounded-full animate-spin" />
                    جارٍ إنشاء الحساب...
                  </>
                ) : (
                  <>
                    إنشاء الحساب
                    <UserPlus className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 divider-brand" />
                <span className="text-[11px] text-brand-muted">أو</span>
                <div className="flex-1 divider-brand" />
              </div>

              <p className="text-center text-sm text-brand-muted">
                لديك حساب مسبقاً؟{" "}
                <Link href="/login" className="text-brand-primary hover:underline font-bold">
                  سجّل دخولك
                </Link>
              </p>
            </form>
          </div>

          <p className="text-center text-[11px] text-brand-muted mt-4">
            بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
      </section>
    </div>
  );
}
