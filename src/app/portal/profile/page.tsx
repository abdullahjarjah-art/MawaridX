"use client";

import { useEffect, useRef, useState } from "react";
import {
  User, Briefcase, DollarSign, Umbrella, Package, Calendar,
  Languages, Key, LogOut, ChevronLeft, Clock,
  CalendarCheck, AlertCircle, Award, FileText, Camera,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  jobTitle?: string; position: string; department?: string; photo?: string | null;
};

type Stats = {
  leaveBalance: number; leaveUsed: number; totalLeavesTaken: number;
  attendanceThisMonth: number; lateThisMonth: number; absentThisMonth: number;
  attendanceRate: number; pendingRequests: number;
  serviceYears: number; serviceMonths: number; serviceTotalDays: number;
  lastSalary: { month: number; year: number; netSalary: number; status: string } | null;
  custodyCount: number; month: number; year: number;
};

const positionMap: Record<string, string> = { manager: "مدير", supervisor: "مشرف", employee: "موظف" };
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function SectionItem({ icon: Icon, title, subtitle, href, badge, iconBg = "bg-gray-100", iconColor = "text-gray-600" }:
  { icon: React.ElementType; title: string; subtitle?: string; href?: string; badge?: string | number; iconBg?: string; iconColor?: string }) {
  const router = useRouter();
  return (
    <button onClick={() => href && router.push(href)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-right">
      <ChevronLeft className="h-4 w-4 text-gray-300 shrink-0" />
      {badge !== undefined && (
        <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full shrink-0">{badge}</span>
      )}
      <div className="flex-1 text-right">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} strokeWidth={1.8} />
      </div>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-3.5 flex flex-col items-center text-center">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PortalProfilePage() {
  const router = useRouter();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    fetch("/api/employees/me").then(r => r.json()).then(data => {
      if (!data.error) setEmp(data);
    });
    fetch("/api/employees/me/stats").then(r => r.json()).then(data => {
      if (!data.error) setStats(data);
    });
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/employees/${emp.id}/photo`, { method: "POST", body: fd });
    if (res.ok) {
      const { photo } = await res.json();
      setEmp(prev => prev ? { ...prev, photo } : prev);
    }
    setPhotoUploading(false);
    e.target.value = "";
  };

  if (!emp) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const serviceText = stats
    ? stats.serviceYears > 0
      ? `${stats.serviceYears} سنة${stats.serviceMonths > 0 ? ` و ${stats.serviceMonths} شهر` : ""}`
      : `${stats.serviceMonths} شهر`
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* بطاقة الملف الشخصي */}
      <div className="bg-gradient-to-bl from-slate-800 via-slate-700 to-slate-900 pt-10 pb-8 px-4 relative overflow-hidden">
        {/* خلفية ديكورية */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-sky-500/10 rounded-full -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full translate-x-8 translate-y-8" />

        <div className="relative flex flex-col items-center">
          {/* الصورة مع زر التغيير */}
          <div className="relative mb-4 group cursor-pointer" onClick={() => photoRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-xl">
              {emp.photo ? (
                <img src={emp.photo} alt={emp.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-sky-500/30 flex items-center justify-center text-3xl font-bold text-white">
                  {emp.firstName?.[0]}{emp.lastName?.[0]}
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {photoUploading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="h-5 w-5 text-white" />}
            </div>
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          <h1 className="text-xl font-bold text-white">{emp.firstName} {emp.lastName}</h1>
          <p className="text-sky-300 text-sm mt-1">{emp.jobTitle ?? positionMap[emp.position]}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-400 bg-white/10 px-3 py-1 rounded-full">{emp.employeeNumber}</span>
            {emp.department && (
              <span className="text-xs text-slate-400 bg-white/10 px-3 py-1 rounded-full">{emp.department}</span>
            )}
          </div>
          {/* مدة الخدمة */}
          <div className="flex items-center gap-1.5 mt-3">
            <Award className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs text-sky-300">{serviceText} في الخدمة</span>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      {stats && (
        <div className="px-4 -mt-4 relative z-10">
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              icon={Umbrella}
              label="رصيد الإجازات"
              value={stats.leaveBalance - stats.leaveUsed}
              sub={`من ${stats.leaveBalance}`}
              color="bg-sky-50 text-sky-600"
            />
            <StatCard
              icon={CalendarCheck}
              label="حضور الشهر"
              value={`${stats.attendanceRate}%`}
              sub={`${stats.attendanceThisMonth} يوم`}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              icon={Clock}
              label="تأخير"
              value={stats.lateThisMonth}
              sub={monthNames[(stats.month ?? 1) - 1]}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={AlertCircle}
              label="طلبات معلقة"
              value={stats.pendingRequests}
              color="bg-rose-50 text-rose-600"
            />
          </div>
        </div>
      )}

      <div className="px-4 py-5 space-y-4">
        {/* معلومات الموارد البشرية */}
        <div>
          <p className="text-base font-bold text-gray-900 text-right mb-2 px-1">معلومات الموارد البشرية</p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
            <SectionItem icon={User} iconBg="bg-blue-50" iconColor="text-blue-500" title="شخصي" subtitle="المعلومات الشخصية، الهوية، العنوان، البنك" href="/portal/profile/personal" />
            <SectionItem icon={Briefcase} iconBg="bg-purple-50" iconColor="text-purple-500" title="البيانات الوظيفية" subtitle="تاريخ الإلتحاق، المسمى الوظيفي، نوع التوظيف" href="/portal/profile/job" />
            <SectionItem icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-500" title="الراتب والتفاصيل المالية" subtitle="تفاصيل الراتب والسلف"
              badge={stats?.lastSalary ? `${stats.lastSalary.netSalary.toLocaleString("ar-SA")} ر.س` : undefined}
              href="/portal/salary" />
            <SectionItem icon={Umbrella} iconBg="bg-sky-50" iconColor="text-sky-500" title="الإجازات" subtitle="الإجازات السنوية والمجدولة"
              badge={stats ? `${stats.leaveBalance - stats.leaveUsed} يوم` : undefined}
              href="/portal/leaves" />
            <SectionItem icon={Package} iconBg="bg-rose-50" iconColor="text-rose-500" title="العهد" subtitle="العهد المسندة والمسترجعة"
              badge={stats?.custodyCount || undefined}
              href="/portal/custodies" />
            <SectionItem icon={Calendar} iconBg="bg-sky-50" iconColor="text-sky-500" title="الحضور" subtitle="سجلات الحضور" href="/portal/attendance" />
            <SectionItem icon={FileText} iconBg="bg-purple-50" iconColor="text-purple-500" title="وثائقي" subtitle="هويتك، عقد العمل، شهاداتك" href="/portal/profile/documents" />
          </div>
        </div>

        {/* الإعدادات */}
        <div>
          <p className="text-base font-bold text-gray-900 text-right mb-2 px-1">الإعدادات</p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <span className="text-sm text-gray-500 font-medium">عربي</span>
              <div className="flex-1 text-right">
                <p className="text-sm font-medium text-gray-800">اللغة</p>
              </div>
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Languages className="h-4 w-4 text-gray-600" strokeWidth={1.8} />
              </div>
            </div>
            <SectionItem icon={Key} iconBg="bg-gray-100" iconColor="text-gray-600" title="تغيير كلمة المرور" href="/reset-password" />
          </div>
        </div>

        {/* تسجيل الخروج */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button onClick={logout} className="w-full flex items-center justify-between px-4 py-4">
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="text-base font-semibold text-red-500">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
}
