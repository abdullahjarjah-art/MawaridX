"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Employee = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  arabicName?: string; jobTitle?: string; department?: string; nationality?: string;
  startDate?: string; endDate?: string; basicSalary: number;
  housingAllowance?: number; transportAllowance?: number; otherAllowance?: number;
};

type Branding = {
  displayName?: string; logoUrl?: string;
  commercialReg?: string; taxNumber?: string;
  address?: string; phone?: string; email?: string;
};

type LetterType = "salary" | "employment" | "experience";

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function totalSalary(emp: Employee) {
  return emp.basicSalary + (emp.housingAllowance ?? 0) + (emp.transportAllowance ?? 0) + (emp.otherAllowance ?? 0);
}

function arabicDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-SA");
}

export default function LetterPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") ?? "salary") as LetterType;

  const [emp, setEmp]           = useState<Employee | null>(null);
  const [branding, setBranding] = useState<Branding>({});
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/employees/${id}?full=1`).then(r => r.json()),
      fetch("/api/settings/branding").then(r => r.ok ? r.json() : {}),
    ]).then(([empData, bData]) => {
      setEmp(empData);
      setBranding(bData ?? {});
      setReady(true);
    });
  }, [id]);

  useEffect(() => {
    if (ready) setTimeout(() => window.print(), 700);
  }, [ready]);

  if (!emp) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#9ca3af", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      جارٍ التحميل...
    </div>
  );

  const company   = branding.displayName || "MawaridX HR";
  const issueDate = new Date().toLocaleDateString("ar-SA");
  const natLabel  = emp.nationality === "saudi" ? "سعودي" : "غير سعودي";
  const total     = totalSalary(emp);

  // ── عنوان الخطاب ──
  const titleMap: Record<LetterType, string> = {
    salary:     "شهادة راتب",
    employment: "خطاب توظيف",
    experience: "شهادة خبرة",
  };
  const title = titleMap[type] ?? "شهادة راتب";

  // ── رقم مرجعي ──
  const prefixMap: Record<LetterType, string> = { salary: "SC", employment: "EL", experience: "XP" };
  const refNumber = `${prefixMap[type]}-${emp.employeeNumber}-${Date.now().toString().slice(-6)}`;

  // ── صفوف معلومات الموظف ──
  const infoRows: { label: string; value: string }[] = [
    { label: "اسم الموظف",     value: emp.firstName + " " + emp.lastName + (emp.arabicName ? ` / ${emp.arabicName}` : "") },
    { label: "الرقم الوظيفي", value: emp.employeeNumber },
    ...(emp.jobTitle   ? [{ label: "المسمى الوظيفي",       value: emp.jobTitle }]   : []),
    ...(emp.department ? [{ label: "القسم",                 value: emp.department }] : []),
    { label: "الجنسية", value: natLabel },
    ...(emp.startDate  ? [{ label: "تاريخ الالتحاق",       value: arabicDate(emp.startDate) }] : []),
    ...(type === "experience" && emp.endDate ? [{ label: "تاريخ انتهاء الخدمة", value: arabicDate(emp.endDate) }] : []),
  ];

  // ── صفوف الراتب (لشهادة الراتب فقط) ──
  const salaryRows = type === "salary" ? [
    { label: "الراتب الأساسي",  value: emp.basicSalary },
    ...((emp.housingAllowance   ?? 0) > 0 ? [{ label: "بدل السكن",      value: emp.housingAllowance!   }] : []),
    ...((emp.transportAllowance ?? 0) > 0 ? [{ label: "بدل المواصلات",  value: emp.transportAllowance! }] : []),
    ...((emp.otherAllowance     ?? 0) > 0 ? [{ label: "بدلات أخرى",     value: emp.otherAllowance!     }] : []),
  ] : [];

  // ── نص الجسم ──
  const openingText: Record<LetterType, string> = {
    salary:     `تشهد ${company} بأن الموظف المذكور أدناه يعمل لديها بصفة رسمية، وأن راتبه الشهري كما هو موضح في الجدول التالي:`,
    employment: `تُفيد ${company} بأن الموظف المذكور أدناه يعمل لديها موظفاً رسمياً على التفاصيل التالية:`,
    experience: `تشهد ${company} بأن الموظف المذكور أدناه عمل لديها خلال الفترة الموضحة، وقد أدى مهامه بكفاءة واحترافية عالية:`,
  };

  const closingText: Record<LetterType, string> = {
    salary:     "صدرت هذه الشهادة بناءً على طلب الموظف لتقديمها للجهات الرسمية المختصة، ولا تُعدّ التزاماً مالياً أو قانونياً بخلاف ما هو مذكور.",
    employment: "يتمتع الموظف بسمعة حسنة ويؤدي مهامه على أكمل وجه. صدر هذا الخطاب بناءً على طلبه لتقديمه للجهات المختصة.",
    experience: "نشهد له بحسن السيرة والسلوك وإخلاصه في العمل طوال فترة خدمته، ونتمنى له التوفيق في مسيرته المهنية. صدرت هذه الشهادة بناءً على طلبه للجهات المختصة.",
  };

  // ── footer ──
  const footerParts: string[] = [];
  if (branding.commercialReg) footerParts.push(`السجل التجاري: ${branding.commercialReg}`);
  if (branding.taxNumber)     footerParts.push(`الرقم الضريبي: ${branding.taxNumber}`);
  if (branding.phone)         footerParts.push(`هاتف: ${branding.phone}`);
  if (branding.email)         footerParts.push(branding.email);
  const footerLine1 = footerParts.join("  •  ");
  const footerLine2 = branding.address ?? "";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f4f4f4; direction: rtl; color: #1a1a1a; font-size: 13px; }
        @media print {
          /* إخفاء عناصر التخطيط */
          .no-print,
          aside,
          nav,
          header,
          .pattern-islamic { display: none !important; }

          /* إزالة margins وخلفيات التخطيط */
          body { background: #fff !important; margin: 0 !important; }
          main { margin: 0 !important; padding: 0 !important; }
          div[class*="mr-"] { margin-right: 0 !important; }
          div[class*="mesh"] { background: #fff !important; }

          /* الصفحة نفسها */
          .page {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 28px !important;
            min-height: unset !important;
            max-width: 100% !important;
          }
        }
        @page { size: A4 portrait; margin: 10mm; }
      `}</style>

      {/* ── شريط الطباعة ── */}
      <div className="no-print" style={{ textAlign: "center", padding: "14px", background: "#e8e8e8" }}>
        <button onClick={() => window.print()} style={{
          background: "#1a1a1a", color: "#fff", border: "none", padding: "10px 32px",
          borderRadius: "6px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: "8px"
        }}>🖨️ طباعة / حفظ كـ PDF</button>
        <button onClick={() => window.close()} style={{
          background: "#e5e7eb", color: "#374151", border: "none", padding: "10px 24px",
          borderRadius: "6px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
        }}>إغلاق</button>
      </div>

      {/* ── الورقة ── */}
      <div className="page" style={{
        maxWidth: "760px", margin: "20px auto", background: "#fff",
        border: "1px solid #ccc", padding: "36px 40px", minHeight: "980px",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "16px", borderBottom: "2px solid #222", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {branding.logoUrl && !branding.logoUrl.endsWith(".pdf") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={company} style={{ height: "48px", width: "48px", objectFit: "contain", borderRadius: "6px" }} />
            )}
            <div>
              <div style={{ fontSize: "17px", fontWeight: 800 }}>{company}</div>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "3px" }}>المملكة العربية السعودية</div>
            </div>
          </div>
          <div style={{ textAlign: "left", fontSize: "11px", color: "#555", lineHeight: 1.8 }}>
            <strong style={{ color: "#1a1a1a", display: "block", fontSize: "12px" }}>أنشئ بواسطة نظام MawaridX للموارد البشرية</strong>
            {issueDate}
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 900, letterSpacing: ".5px", color: "#1a1a1a" }}>{title}</h1>
          <div style={{ width: "80px", height: "3px", background: "#1a1a1a", margin: "8px auto 0" }} />
        </div>

        {/* Meta (ref + date) */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666", marginBottom: "20px" }}>
          <span>رقم المرجع: <strong style={{ color: "#1a1a1a" }}>{refNumber}</strong></span>
          <span>تاريخ الإصدار: <strong style={{ color: "#1a1a1a" }}>{issueDate}</strong></span>
        </div>

        {/* Body */}
        <div style={{ flex: 1 }}>

          <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>إلى من يهمه الأمر،</p>
          <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "16px", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            الموضوع: {title}
          </p>

          <p style={{ marginBottom: "14px", lineHeight: 2.2 }}>{openingText[type]}</p>

          {/* معلومات الموظف */}
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0", fontSize: "13px" }}>
            <tbody>
              {infoRows.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px 14px", borderBottom: "1px solid #ebebeb", color: "#666", width: "40%", fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: "8px 14px", borderBottom: "1px solid #ebebeb", fontWeight: 700, color: "#1a1a1a" }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* تفاصيل الراتب — فقط لشهادة الراتب */}
          {type === "salary" && salaryRows.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0", fontSize: "13px" }}>
              <tbody>
                {salaryRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "8px 14px", borderBottom: "1px solid #ebebeb", color: "#666", width: "40%", fontWeight: 600 }}>{row.label}</td>
                    <td style={{ padding: "8px 14px", borderBottom: "1px solid #ebebeb", fontWeight: 700, color: "#1a1a1a" }}>{fmt(row.value)} ر.س</td>
                  </tr>
                ))}
                <tr style={{ background: "#f5f5f5" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 800, borderTop: "1px solid #999" }}>إجمالي الراتب الشهري</td>
                  <td style={{ padding: "8px 14px", fontWeight: 800, borderTop: "1px solid #999", color: "#1a1a1a" }}>{fmt(total)} ر.س</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* نص الختام */}
          <p style={{ marginTop: "16px", lineHeight: 2, fontSize: "13px" }}>{closingText[type]}</p>

        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "44px" }}>
          {[{ label: "توقيع المختص" }, { label: "توقيع المدير" }].map(({ label }) => (
            <div key={label} style={{ textAlign: "center", fontSize: "12px", color: "#555", flex: 1 }}>
              <div style={{ height: "40px", borderBottom: "1px solid #888", margin: "0 20px 6px" }} />
              <div>{label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "28px", paddingTop: "10px", borderTop: "1px solid #ddd", textAlign: "center", fontSize: "10px", color: "#999", lineHeight: 1.7 }}>
          {footerLine1 && <div>{footerLine1}</div>}
          {footerLine2 && <div>{footerLine2}</div>}
          {!footerLine1 && !footerLine2 && <div>تم إنشاء هذا المستند آلياً بواسطة نظام MawaridX للموارد البشرية</div>}
        </div>

      </div>
    </>
  );
}
