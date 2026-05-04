"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Crown,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

type Stats = {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
  totalEmployees: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  companiesByPlan: { plan: string; count: number }[];
};

const planLabels: Record<string, string> = {
  trial: "تجربة",
  basic: "البداية",
  growth: "النمو",
  business: "الأعمال",
  enterprise: "المؤسسي",
};

const planColors: Record<string, string> = {
  trial: "from-slate-400 to-slate-500",
  basic: "from-emerald-400 to-emerald-600",
  growth: "from-sky-400 to-sky-600",
  business: "from-violet-400 to-violet-600",
  enterprise: "from-amber-400 to-amber-600",
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton-brand h-40 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-brand h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-20 text-brand-muted">فشل تحميل البيانات</div>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient shadow-brand-lg p-5 sm:p-8">
        <div className="pattern-islamic absolute inset-0 opacity-[0.18]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative z-10 text-white animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-gold-gradient border border-white/20 rounded-full px-3 py-1 mb-3 shadow-gold">
            <Crown className="h-3.5 w-3.5 text-white" />
            <span className="text-[11px] font-bold tracking-wide">SUPER ADMIN</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            مرحباً بك في مركز القيادة
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl">
            تتحكم من هنا بكل الشركات المشتركة في MawaridX — إضافة، تعديل، مراقبة، وإدارة.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/super-admin/companies"
              className="inline-flex items-center gap-2 bg-white text-brand-primary font-bold px-4 h-10 rounded-xl text-sm shadow-soft hover:scale-[1.02] transition-transform"
            >
              <Building2 className="h-4 w-4" />
              إدارة الشركات
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/super-admin/companies?action=add"
              className="inline-flex items-center gap-2 glass text-white font-bold px-4 h-10 rounded-xl text-sm hover:bg-white/20 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              إضافة شركة
            </Link>
          </div>
        </div>
      </div>

      {/* إحصاءات رئيسية */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
        <StatCard
          icon={Building2}
          label="إجمالي الشركات"
          value={stats.totalCompanies}
          color="from-sky-400 to-sky-600"
          bgColor="bg-sky-50 dark:bg-sky-950/30"
          iconColor="text-sky-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="شركات نشطة"
          value={stats.activeCompanies}
          color="from-emerald-400 to-emerald-600"
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="في التجربة"
          value={stats.trialCompanies}
          color="from-amber-400 to-amber-600"
          bgColor="bg-amber-50 dark:bg-amber-950/30"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="معلّقة"
          value={stats.suspendedCompanies}
          color="from-red-400 to-red-600"
          bgColor="bg-red-50 dark:bg-red-950/30"
          iconColor="text-red-600"
        />
      </div>

      {/* صف ثاني: المستخدمين + الإيرادات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* إجمالي الموظفين */}
        <div className="card-brand p-5 relative overflow-hidden">
          <div className="pattern-dots absolute inset-0 opacity-20" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-brand">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-bold text-brand-muted tracking-wide uppercase">
                المستخدمين
              </span>
            </div>
            <p className="text-xs text-brand-muted">إجمالي الموظفين</p>
            <p className="text-3xl font-black text-brand-ink mt-1">
              {stats.totalEmployees.toLocaleString("ar-SA")}
            </p>
            <p className="text-[11px] text-brand-muted mt-2">
              موزّعين على {stats.totalCompanies} شركة
            </p>
          </div>
        </div>

        {/* الإيرادات الشهرية */}
        <div className="card-brand p-5 relative overflow-hidden border-gradient">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/20 opacity-0 hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-soft">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wide uppercase">
                شهرياً
              </span>
            </div>
            <p className="text-xs text-brand-muted">الإيرادات المتوقعة</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {stats.monthlyRevenue.toLocaleString("ar-SA")}
              <span className="text-sm font-normal text-brand-muted mr-1">ر.س</span>
            </p>
            <p className="text-[11px] text-brand-muted mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              بناءً على خطط الاشتراك الحالية
            </p>
          </div>
        </div>

        {/* الإيرادات السنوية */}
        <div className="card-brand p-5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-bold bg-gold-gradient text-white px-2 py-0.5 rounded tracking-wide">
                سنوياً
              </span>
            </div>
            <p className="text-xs text-brand-muted">التوقع السنوي</p>
            <p className="text-3xl font-black text-gold-gradient mt-1">
              {stats.yearlyRevenue.toLocaleString("ar-SA")}
              <span className="text-sm font-normal text-brand-muted mr-1">ر.س</span>
            </p>
            <p className="text-[11px] text-brand-muted mt-2">
              إذا استمر نفس عدد المشتركين
            </p>
          </div>
        </div>
      </div>

      {/* توزيع الخطط */}
      {stats.companiesByPlan.length > 0 && (
        <div className="card-brand p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-brand-ink">توزيع خطط الاشتراك</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {["trial", "basic", "growth", "business", "enterprise"].map(plan => {
              const item = stats.companiesByPlan.find(p => p.plan === plan);
              const count = item?.count ?? 0;
              const percent = stats.totalCompanies > 0
                ? Math.round((count / stats.totalCompanies) * 100)
                : 0;

              return (
                <div key={plan} className="relative overflow-hidden rounded-2xl border border-brand-border bg-white/60 dark:bg-slate-900/40 p-4">
                  <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${planColors[plan]}`} />
                  <p className="text-xs font-bold text-brand-ink">
                    {planLabels[plan]}
                  </p>
                  <p className="text-2xl font-black text-brand-ink mt-2">
                    {count}
                  </p>
                  <div className="mt-2 w-full h-1.5 bg-brand-border/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${planColors[plan]} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-brand-muted mt-1.5">{percent}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* رسالة ترحيب إذا ما في شركات */}
      {stats.totalCompanies === 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/40 border border-brand-border backdrop-blur-sm">
          <div className="pattern-dots absolute inset-0 opacity-40" />
          <div className="relative py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-gradient-soft ring-1 ring-brand-border mb-4 animate-float">
              <Building2 className="h-10 w-10 text-brand-primary" />
            </div>
            <h3 className="text-lg font-black text-brand-ink">
              ابدأ رحلتك كمزوّد SaaS
            </h3>
            <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
              لم تضف أي شركة بعد — أضف أول عميل لك الآن وابدأ التحصيل
            </p>
            <Link
              href="/super-admin/companies?action=add"
              className="btn-brand inline-flex items-center gap-2 mt-5 px-5 h-11 rounded-xl text-sm"
            >
              <Sparkles className="h-4 w-4" />
              إضافة أول شركة
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className="card-brand p-4 sm:p-5 group relative overflow-hidden">
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${color}`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-brand-muted font-medium tracking-wide">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-brand-ink mt-1">
            {value.toLocaleString("ar-SA")}
          </p>
        </div>
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
