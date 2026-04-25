"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Employee = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  arabicName?: string; jobTitle?: string; department?: string; nationality?: string;
  startDate?: string; endDate?: string; basicSalary: number;
  housingAllowance?: number; transportAllowance?: number; otherAllowance?: number;
};

type LetterType = "salary" | "employment" | "experience";

const letterTitles: Record<LetterType, { ar: string; en: string }> = {
  salary:     { ar: "شهادة راتب",   en: "Salary Certificate" },
  employment: { ar: "خطاب توظيف",   en: "Employment Letter" },
  experience: { ar: "شهادة خبرة",   en: "Experience Letter" },
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LetterPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") ?? "salary") as LetterType;
  const [emp, setEmp] = useState<Employee | null>(null);
  const today = new Date().toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    fetch(`/api/employees/${id}?full=1`).then(r => r.json()).then(setEmp);
  }, [id]);

  useEffect(() => {
    if (emp) setTimeout(() => window.print(), 600);
  }, [emp]);

  if (!emp) return <div className="flex items-center justify-center h-screen text-gray-400">جارٍ التحميل...</div>;

  const totalSalary = emp.basicSalary + (emp.housingAllowance ?? 0) + (emp.transportAllowance ?? 0) + (emp.otherAllowance ?? 0);
  const title = letterTitles[type] ?? letterTitles.salary;
  const natLabel = emp.nationality === "saudi" ? "سعودي" : "غير سعودي";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
        }
        @page { size: A4; margin: 0; }
        body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Arial, sans-serif; background: #f3f4f6; }
      `}</style>

      {/* زر طباعة */}
      <div className="no-print fixed top-4 left-4 z-50 flex gap-2">
        <button onClick={() => window.print()}
          className="bg-sky-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow hover:bg-sky-700">
          طباعة / حفظ PDF
        </button>
        <button onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-bold shadow hover:bg-gray-300">
          إغلاق
        </button>
      </div>

      {/* الورقة */}
      <div className="page" style={{
        width: "210mm", minHeight: "297mm", margin: "20px auto",
        background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        borderRadius: "8px", overflow: "hidden", direction: "rtl",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#0284c7,#0ea5e9)", padding: "28px 36px", textAlign: "center" }}>
          <div style={{ color: "white", fontSize: "26px", fontWeight: 900, letterSpacing: "-0.5px" }}>MawaridX</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", marginTop: "4px" }}>نظام إدارة الموارد البشرية</div>
        </div>

        {/* Body */}
        <div style={{ padding: "36px 48px" }}>
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0284c7" }}>{title.ar}</div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{title.en}</div>
            <div style={{ borderBottom: "2px solid #0284c7", width: "80px", margin: "10px auto 0" }} />
          </div>

          {/* Date */}
          <div style={{ textAlign: "left", fontSize: "12px", color: "#64748b", marginBottom: "20px", direction: "ltr" }}>
            التاريخ: {today}
          </div>

          {/* Opening */}
          <p style={{ fontSize: "13px", color: "#374151", marginBottom: "20px" }}>
            {type === "salary" && "يُفيد النظام بأن الموظف/ة المذكور/ة أدناه يعمل/تعمل لدى الشركة وراتبه/راتبها الشهري كالتالي:"}
            {type === "employment" && "يُفيد النظام بأن الموظف/ة المذكور/ة أدناه يعمل/تعمل لدى الشركة بصفة رسمية."}
            {type === "experience" && "يُفيد النظام بأن الموظف/ة المذكور/ة أدناه كان/كانت يعمل/تعمل لدى الشركة خلال الفترة التالية."}
          </p>

          {/* Info box */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px 24px", marginBottom: "24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <tbody>
                {[
                  { label: "اسم الموظف", value: `${emp.firstName} ${emp.lastName}` },
                  emp.arabicName ? { label: "الاسم بالعربي", value: emp.arabicName } : null,
                  { label: "رقم الموظف", value: emp.employeeNumber },
                  emp.jobTitle ? { label: "المسمى الوظيفي", value: emp.jobTitle } : null,
                  emp.department ? { label: "القسم", value: emp.department } : null,
                  { label: "الجنسية", value: natLabel },
                  emp.startDate ? { label: "تاريخ الالتحاق", value: new Date(emp.startDate).toLocaleDateString("ar-SA-u-nu-latn") } : null,
                  type === "experience" && emp.endDate ? { label: "تاريخ انتهاء الخدمة", value: new Date(emp.endDate).toLocaleDateString("ar-SA-u-nu-latn") } : null,
                ].filter(Boolean).map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "7px 0", color: "#64748b", width: "45%", fontWeight: 500 }}>{row!.label}</td>
                    <td style={{ padding: "7px 0", color: "#0f172a", fontWeight: 600 }}>{row!.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Salary breakdown — للراتب فقط */}
            {type === "salary" && (
              <>
                <div style={{ borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <tbody>
                    {[
                      { label: "الراتب الأساسي", value: emp.basicSalary },
                      emp.housingAllowance ? { label: "بدل سكن", value: emp.housingAllowance } : null,
                      emp.transportAllowance ? { label: "بدل نقل", value: emp.transportAllowance } : null,
                      emp.otherAllowance ? { label: "بدلات أخرى", value: emp.otherAllowance } : null,
                    ].filter(Boolean).map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: "6px 0", color: "#64748b", width: "45%", fontWeight: 500 }}>{row!.label}</td>
                        <td style={{ padding: "6px 0", color: "#0f172a" }}>SAR {fmt(row!.value as number)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: "10px 0", color: "#0284c7", fontWeight: 700, fontSize: "14px" }}>الراتب الإجمالي</td>
                      <td style={{ padding: "10px 0", color: "#0284c7", fontWeight: 800, fontSize: "14px" }}>SAR {fmt(totalSalary)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Closing */}
          <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "40px" }}>
            صدر هذا الخطاب بناءً على الطلب وللجهات المختصة فقط.
          </p>

          {/* Signature */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #94a3b8", width: "160px", marginBottom: "6px" }} />
              <div style={{ fontSize: "12px", color: "#64748b" }}>التوقيع المعتمد</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "100px", height: "60px", border: "1px dashed #cbd5e1", borderRadius: "6px" }} />
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>ختم الشركة</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "#f8fafc", padding: "12px 36px", textAlign: "center", fontSize: "10px", color: "#94a3b8", borderTop: "1px solid #e2e8f0" }}>
          صدر من نظام MawaridX لإدارة الموارد البشرية — هذه وثيقة آلية
        </div>
      </div>
    </>
  );
}
