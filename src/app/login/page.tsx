"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { MawaridXLogo, MawaridXWordmark } from "@/components/mawaridx-logo";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Sparkles, Users, BarChart3, Fingerprint } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    if (data.isSuperAdmin)        router.push("/super-admin");
    else if (data.role === "employee") router.push("/portal");
    else                          router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative">
      {/* ─────────── الجانب الأيمن: هوية العلامة ─────────── */}
      <aside className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-brand-gradient">
        {/* نمط هندسي إسلامي كبير */}
        <div className="absolute inset-0 pattern-islamic opacity-[0.18]" />

        {/* توهجات ضبابية */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-300/25 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-16 w-[28rem] h-[28rem] rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-violet-400/15 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

        {/* الزخرفة الهندسية المركزية */}
        <svg className="absolute left-8 top-8 opacity-25" width="180" height="180" viewBox="0 0 200 200" fill="none">
          <g stroke="#fbbf24" strokeWidth="1" fill="none">
            <circle cx="100" cy="100" r="90" />
            <circle cx="100" cy="100" r="70" />
            <path d="M100 10 L190 100 L100 190 L10 100 Z" />
            <path d="M100 30 L170 100 L100 170 L30 100 Z" />
            <path d="M100 50 L150 100 L100 150 L50 100 Z" />
            <path d="M10 100 L190 100 M100 10 L100 190" />
          </g>
        </svg>

        {/* المحتوى */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">
          {/* الرأس: شعار */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 ring-1 ring-white/20">
              <MawaridXLogo size={44} animate />
            </div>
            <div>
              <MawaridXWordmark className="text-2xl" variant="light" />
              <p className="text-[11px] text-white/70 mt-0.5 tracking-wide">HR MANAGEMENT PLATFORM</p>
            </div>
          </div>

          {/* الوسط: العبارة الرئيسية */}
          <div className="space-y-6 animate-fade-up">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1 mb-5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-xs font-medium tracking-wide">منصة سعودية متكاملة</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight">
                إدارة موارد <br />
                <span className="text-gold-gradient">احترافية بلمسة</span> <br />
                عصرية.
              </h2>
              <p className="text-white/80 text-base mt-5 max-w-md leading-relaxed">
                نظام شامل لإدارة الموظفين، الحضور، الرواتب، والتقييمات — مصمّم خصيصاً للسوق السعودي بمعايير عالمية.
              </p>
            </div>

            {/* ميزات بأيقونات */}
            <div className="grid grid-cols-2 gap-3 max-w-md pt-4">
              {[
                { icon: Users,        label: "إدارة الموظفين" },
                { icon: Fingerprint,  label: "بصمة جغرافية" },
                { icon: BarChart3,    label: "تقارير ذكية" },
                { icon: Shield,       label: "تكامل مع مقيم" },
              ].map(({ icon: Icon, label }, i) => (
                <div key={label}
                  className="flex items-center gap-2.5 glass rounded-xl px-3.5 py-2.5 animate-fade-up"
                  style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                  <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* التذييل */}
          <div className="flex items-center justify-between text-[11px] text-white/60 animate-fade-in">
            <span>© {new Date().getFullYear()} MawaridX. جميع الحقوق محفوظة</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-white cursor-pointer transition-colors">الخصوصية</span>
              <span className="hover:text-white cursor-pointer transition-colors">الشروط</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────── الجانب الأيسر: النموذج ─────────── */}
      <section className="flex-1 mesh-bg relative flex items-center justify-center p-4 sm:p-8">
        <div className="pattern-islamic absolute inset-0 pointer-events-none opacity-50" />

        <div className="relative w-full max-w-md animate-scale-in">
          {/* شعار للموبايل */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <MawaridXLogo size={56} animate />
            <MawaridXWordmark className="text-2xl mt-3" />
            <p className="text-brand-muted text-xs mt-1">نظام إدارة الموارد البشرية</p>
          </div>

          {/* البطاقة الفاخرة */}
          <div className="glass-strong rounded-3xl shadow-brand-lg border border-white/50 dark:border-white/10 p-7 sm:p-9">
            {/* رأس النموذج */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient shadow-brand mb-4 animate-float">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-brand-ink">مرحباً بعودتك</h1>
              <p className="text-sm text-brand-muted mt-1">سجّل دخولك للمتابعة إلى حسابك</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* البريد الإلكتروني */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-ink">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="example@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="pr-10 h-11 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-brand-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* كلمة المرور */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-brand-ink">كلمة المرور</Label>
                  <Link href="/forgot-password" className="text-[11px] text-brand-primary hover:underline font-medium">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="pr-10 pl-10 h-11 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-brand-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-primary transition-colors"
                    aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* الخطأ */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl animate-fade-up">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* زر الدخول الموقّع */}
              <button
                type="submit"
                disabled={loading}
                className="btn-brand w-full h-11 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/70 border-t-white rounded-full animate-spin" />
                    جارٍ التحقق...
                  </>
                ) : (
                  <>
                    دخول
                    <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 divider-brand" />
                <span className="text-[11px] text-brand-muted">أو</span>
                <div className="flex-1 divider-brand" />
              </div>

              {/* تسجيل جديد */}
              <div className="text-center text-sm text-brand-muted">
                موظف جديد؟{" "}
                <Link href="/register" className="text-brand-primary hover:underline font-bold">
                  سجّل حسابك الآن
                </Link>
              </div>
            </form>
          </div>

          {/* ختام تحت البطاقة */}
          <p className="text-center text-[11px] text-brand-muted mt-5">
            محمي بتشفير من طرف إلى طرف · MawaridX
          </p>

          {/* تذييل للموبايل */}
          <p className="lg:hidden text-center text-[10px] text-brand-muted/70 mt-3">
            © {new Date().getFullYear()} MawaridX. جميع الحقوق محفوظة
          </p>
        </div>
      </section>
    </div>
  );
}
