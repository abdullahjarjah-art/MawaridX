"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Briefcase, MapPin, Users, Calendar, Building2, Award, Clock, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";

type Employee = {
  employeeNumber: string; firstName: string; lastName: string;
  jobTitle?: string; position: string; department?: string;
  employmentType: string; startDate: string; endDate?: string;
  status: string; basicSalary: number;
  workLocation?: { name: string } | null;
  manager?: { firstName: string; lastName: string; jobTitle?: string } | null;
};

const employmentTypeMap: Record<string, string> = {
  full_time: "دوام كامل", part_time: "دوام جزئي",
  contract: "عقد", intern: "متدرب",
};
const positionMap: Record<string, string> = { manager: "مدير", supervisor: "مشرف", employee: "موظف" };
const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-100 text-green-700" },
  inactive: { label: "غير نشط", color: "bg-gray-100 text-gray-600" },
  terminated: { label: "منتهي", color: "bg-red-100 text-red-700" },
};

function InfoRow({ icon: Icon, label, value, iconColor = "text-gray-400" }: {
  icon?: React.ElementType; label: string; value?: string | null; iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0">
      {Icon && (
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      )}
      <div className="flex-1 flex items-center justify-between min-w-0">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm text-gray-800 font-medium text-left truncate mr-3">
          {value || <span className="text-gray-300">—</span>}
        </span>
      </div>
    </div>
  );
}

export default function JobPage() {
  const router = useRouter();
  const [emp, setEmp] = useState<Employee | null>(null);

  useEffect(() => {
    fetch("/api/employees/me?include=manager,workLocation")
      .then(r => r.json())
      .then(data => { if (!data.error) setEmp(data); });
  }, []);

  if (!emp) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const startDate = new Date(emp.startDate);
  const startFormatted = startDate.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const totalDays = Math.floor(diffMs / 86400000);
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;

  const managerName = emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : null;
  const statusInfo = statusMap[emp.status] ?? { label: emp.status, color: "bg-gray-100 text-gray-600" };

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
        <p className="text-base font-bold text-gray-900 flex-1">البيانات الوظيفية</p>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* بطاقة مدة الخدمة */}
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-l from-sky-500 to-sky-600 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-6 -translate-y-6" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Award className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sky-100 text-xs mb-1">مدة الخدمة</p>
              <p className="text-2xl font-bold">
                {years > 0 && <>{years} <span className="text-base font-medium">سنة</span> </>}
                {months > 0 && <>{months} <span className="text-base font-medium">شهر</span> </>}
                {years === 0 && months === 0 && <>{days} <span className="text-base font-medium">يوم</span></>}
              </p>
              <p className="text-sky-200 text-xs mt-1">منذ {startFormatted}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* المعلومات الوظيفية */}
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider px-1 mb-1">المعلومات الوظيفية</p>
          <div className="bg-white rounded-2xl px-4">
            <InfoRow icon={Briefcase} iconColor="text-sky-500" label="المسمى الوظيفي" value={emp.jobTitle} />
            <InfoRow icon={BadgeCheck} iconColor="text-purple-500" label="المستوى الوظيفي" value={positionMap[emp.position] ?? emp.position} />
            <InfoRow icon={Building2} iconColor="text-amber-500" label="القسم" value={emp.department} />
            <InfoRow icon={Clock} iconColor="text-green-500" label="نوع التوظيف" value={employmentTypeMap[emp.employmentType] ?? emp.employmentType} />
            <InfoRow icon={MapPin} iconColor="text-rose-500" label="موقع العمل" value={emp.workLocation?.name} />
          </div>
        </div>

        {/* المدير والفريق */}
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider px-1 mb-1">المدير والفريق</p>
          <div className="bg-white rounded-2xl px-4">
            <InfoRow icon={Users} iconColor="text-sky-500" label="المدير المباشر" value={managerName} />
            {emp.manager?.jobTitle && (
              <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 pr-11">
                <span className="text-xs text-gray-400">{emp.manager.jobTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* التواريخ المهمة */}
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider px-1 mb-1">التواريخ</p>
          <div className="bg-white rounded-2xl px-4">
            <InfoRow icon={Calendar} iconColor="text-green-500" label="تاريخ الالتحاق" value={startFormatted} />
            {emp.endDate && (
              <InfoRow icon={Calendar} iconColor="text-red-500" label="تاريخ انتهاء العقد"
                value={new Date(emp.endDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
