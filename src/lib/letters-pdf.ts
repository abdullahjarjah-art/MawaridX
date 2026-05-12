"use client";

export type LetterData = {
  employeeName: string;
  arabicName?: string;
  employeeNumber: string;
  jobTitle?: string;
  department?: string;
  nationality?: string;
  startDate?: string;
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  companyName?: string;
  issueDate?: string;
  // ── Branding ──
  logoDataUrl?: string;
  primaryColor?: string;
  commercialReg?: string;
  taxNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
};

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2 });
}

function totalSalary(d: LetterData) {
  return (d.basicSalary ?? 0) + (d.housingAllowance ?? 0) + (d.transportAllowance ?? 0) + (d.otherAllowance ?? 0);
}

// ── القالب المشترك لكل الخطابات ──
function buildPage(opts: {
  company: string;
  title: string;
  refNumber: string;
  issueDate: string;
  body: string;
  logoDataUrl?: string;
  commercialReg?: string;
  taxNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  fileName: string;
}): void {
  const logoHtml = opts.logoDataUrl
    ? `<img src="${opts.logoDataUrl}" alt="logo" class="logo-img" />`
    : "";

  const footerItems: string[] = [];
  if (opts.commercialReg)  footerItems.push(`السجل التجاري: ${opts.commercialReg}`);
  if (opts.taxNumber)      footerItems.push(`الرقم الضريبي: ${opts.taxNumber}`);
  if (opts.companyPhone)   footerItems.push(`هاتف: ${opts.companyPhone}`);
  if (opts.companyEmail)   footerItems.push(opts.companyEmail);
  const footerLine1 = footerItems.join("  •  ");
  const footerLine2 = opts.companyAddress ?? "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>${opts.title} — ${opts.company}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f4f4f4;color:#1a1a1a;direction:rtl;font-size:13px}

    .print-bar{text-align:center;padding:14px;background:#e8e8e8}
    .print-btn{background:#1a1a1a;color:#fff;border:none;padding:10px 32px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}

    .page{max-width:760px;margin:20px auto;background:#fff;border:1px solid #ccc;padding:36px 40px;min-height:980px;display:flex;flex-direction:column}

    /* ── Header ── */
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #222;margin-bottom:20px}
    .header-right{display:flex;align-items:center;gap:12px}
    .logo-img{height:48px;width:48px;object-fit:contain;border-radius:6px}
    .co-name{font-size:17px;font-weight:800}
    .co-sub{font-size:11px;color:#666;margin-top:3px}
    .header-left{text-align:left;font-size:11px;color:#555;line-height:1.8}
    .header-left strong{color:#1a1a1a;display:block;font-size:12px}

    /* ── Title ── */
    .title-area{text-align:center;margin-bottom:22px}
    .title-area h1{font-size:22px;font-weight:900;letter-spacing:.5px;color:#1a1a1a}
    .title-divider{width:80px;height:3px;background:#1a1a1a;margin:8px auto 0}

    /* ── Meta (ref + date) ── */
    .meta-row{display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:20px}

    /* ── Body ── */
    .body{flex:1;font-size:13px;line-height:2;color:#1a1a1a}
    .recipient{font-size:14px;font-weight:700;margin-bottom:12px}
    .subject-line{font-size:13px;font-weight:700;margin-bottom:16px;text-decoration:underline;text-underline-offset:3px}
    .paragraph{margin-bottom:14px;line-height:2.2}

    /* ── Info Table ── */
    .info-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
    .info-table td{padding:8px 14px;border-bottom:1px solid #ebebeb}
    .info-table td:first-child{color:#666;width:40%;font-weight:600}
    .info-table td:last-child{font-weight:700;color:#1a1a1a}
    .info-table .total-row td{background:#f5f5f5;font-weight:800;border-top:1px solid #999}

    /* ── Closing ── */
    .closing{margin-top:16px;font-size:13px;line-height:2}

    /* ── Signatures ── */
    .sig-section{display:flex;justify-content:space-between;margin-top:44px}
    .sig-box{text-align:center;font-size:12px;color:#555;flex:1}
    .sig-line{height:40px;border-bottom:1px solid #888;margin:0 20px 6px}

    /* ── Footer ── */
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #ddd;text-align:center;font-size:10px;color:#999;line-height:1.7}

    @media print{
      body{background:#fff}
      .page{margin:0;border:none;padding:28px;min-height:unset}
      .print-bar{display:none}
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>
  </div>

  <div class="page">

    <!-- Header -->
    <div class="header">
      <div class="header-right">
        ${logoHtml}
        <div>
          <div class="co-name">${opts.company}</div>
          <div class="co-sub">المملكة العربية السعودية</div>
        </div>
      </div>
      <div class="header-left">
        <strong>أنشئ بواسطة نظام MawaridX للموارد البشرية</strong>
        ${opts.issueDate}
      </div>
    </div>

    <!-- Title -->
    <div class="title-area">
      <h1>${opts.title}</h1>
      <div class="title-divider"></div>
    </div>

    <!-- Meta -->
    <div class="meta-row">
      <span>رقم المرجع: <strong>${opts.refNumber}</strong></span>
      <span>تاريخ الإصدار: <strong>${opts.issueDate}</strong></span>
    </div>

    <!-- Body -->
    <div class="body">
      ${opts.body}
    </div>

    <!-- Signatures -->
    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div>توقيع المستخدم</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div>توقيع المدير</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      ${footerLine1 ? `<div>${footerLine1}</div>` : ""}
      ${footerLine2 ? `<div>${footerLine2}</div>` : ""}
      ${!footerLine1 && !footerLine2 ? `<div>تم إنشاء هذا المستند آلياً بواسطة نظام MawaridX للموارد البشرية</div>` : ""}
    </div>

  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

// ────────────────────────────────────────────
/** خطاب تعريف بالراتب */
// ────────────────────────────────────────────
export function generateSalaryCertificate(data: LetterData) {
  const company   = data.companyName ?? "MawaridX HR";
  const issueDate = data.issueDate ?? new Date().toLocaleDateString("ar-SA");
  const refNumber = `SC-${data.employeeNumber}-${Date.now().toString().slice(-6)}`;
  const total     = totalSalary(data);

  const salaryRows = [
    { label: "الراتب الأساسي",    value: data.basicSalary,       show: true },
    { label: "بدل السكن",         value: data.housingAllowance,  show: (data.housingAllowance ?? 0) > 0 },
    { label: "بدل المواصلات",     value: data.transportAllowance,show: (data.transportAllowance ?? 0) > 0 },
    { label: "بدلات أخرى",        value: data.otherAllowance,    show: (data.otherAllowance ?? 0) > 0 },
  ].filter(r => r.show);

  const body = `
    <p class="recipient">إلى من يهمه الأمر،</p>
    <p class="subject-line">الموضوع: تعريف بالراتب</p>

    <p class="paragraph">
      تشهد <strong>${company}</strong> بأن الموظف المذكور أدناه يعمل لديها بصفة رسمية،
      وأن راتبه الشهري كما هو موضح في الجدول التالي:
    </p>

    <table class="info-table">
      <tr><td>اسم الموظف</td><td>${data.employeeName}${data.arabicName ? ` / ${data.arabicName}` : ""}</td></tr>
      <tr><td>الرقم الوظيفي</td><td>${data.employeeNumber}</td></tr>
      ${data.jobTitle   ? `<tr><td>المسمى الوظيفي</td><td>${data.jobTitle}</td></tr>` : ""}
      ${data.department ? `<tr><td>القسم</td><td>${data.department}</td></tr>` : ""}
      ${data.nationality ? `<tr><td>الجنسية</td><td>${data.nationality === "saudi" ? "سعودي" : "غير سعودي"}</td></tr>` : ""}
      ${data.startDate  ? `<tr><td>تاريخ التعيين</td><td>${new Date(data.startDate).toLocaleDateString("ar-SA")}</td></tr>` : ""}
    </table>

    <table class="info-table">
      ${salaryRows.map(r => `<tr><td>${r.label}</td><td>${fmt(r.value ?? 0)} ر.س</td></tr>`).join("")}
      <tr class="total-row"><td>إجمالي الراتب الشهري</td><td>${fmt(total)} ر.س</td></tr>
    </table>

    <p class="closing">
      صدرت هذه الشهادة بناءً على طلب الموظف لتقديمها للجهات الرسمية المختصة،
      ولا تُعدّ التزاماً مالياً أو قانونياً بخلاف ما هو مذكور.
    </p>
  `;

  buildPage({
    company, title: "شهادة راتب", refNumber, issueDate, body,
    logoDataUrl: data.logoDataUrl,
    commercialReg: data.commercialReg, taxNumber: data.taxNumber,
    companyAddress: data.companyAddress, companyPhone: data.companyPhone, companyEmail: data.companyEmail,
    fileName: `salary-certificate-${data.employeeNumber}`,
  });
}

// ────────────────────────────────────────────
/** خطاب توظيف */
// ────────────────────────────────────────────
export function generateEmploymentLetter(data: LetterData) {
  const company   = data.companyName ?? "MawaridX HR";
  const issueDate = data.issueDate ?? new Date().toLocaleDateString("ar-SA");
  const refNumber = `EL-${data.employeeNumber}-${Date.now().toString().slice(-6)}`;

  const body = `
    <p class="recipient">إلى من يهمه الأمر،</p>
    <p class="subject-line">الموضوع: خطاب توظيف</p>

    <p class="paragraph">
      تُفيد <strong>${company}</strong> بأن الموظف المذكور أدناه يعمل لديها موظفاً رسمياً،
      وذلك على التفاصيل التالية:
    </p>

    <table class="info-table">
      <tr><td>اسم الموظف</td><td>${data.employeeName}${data.arabicName ? ` / ${data.arabicName}` : ""}</td></tr>
      <tr><td>الرقم الوظيفي</td><td>${data.employeeNumber}</td></tr>
      ${data.jobTitle   ? `<tr><td>المسمى الوظيفي</td><td>${data.jobTitle}</td></tr>` : ""}
      ${data.department ? `<tr><td>القسم</td><td>${data.department}</td></tr>` : ""}
      ${data.nationality ? `<tr><td>الجنسية</td><td>${data.nationality === "saudi" ? "سعودي" : "غير سعودي"}</td></tr>` : ""}
      ${data.startDate  ? `<tr><td>تاريخ الالتحاق بالعمل</td><td>${new Date(data.startDate).toLocaleDateString("ar-SA")}</td></tr>` : ""}
    </table>

    <p class="closing">
      يتمتع الموظف بسمعة حسنة ويؤدي مهامه على أكمل وجه.
      صدر هذا الخطاب بناءً على طلبه لتقديمه للجهات المختصة.
    </p>
  `;

  buildPage({
    company, title: "خطاب توظيف", refNumber, issueDate, body,
    logoDataUrl: data.logoDataUrl,
    commercialReg: data.commercialReg, taxNumber: data.taxNumber,
    companyAddress: data.companyAddress, companyPhone: data.companyPhone, companyEmail: data.companyEmail,
    fileName: `employment-letter-${data.employeeNumber}`,
  });
}

// ────────────────────────────────────────────
/** شهادة خبرة */
// ────────────────────────────────────────────
export function generateExperienceLetter(data: LetterData & { endDate?: string }) {
  const company   = data.companyName ?? "MawaridX HR";
  const issueDate = data.issueDate ?? new Date().toLocaleDateString("ar-SA");
  const refNumber = `XP-${data.employeeNumber}-${Date.now().toString().slice(-6)}`;
  const startStr  = data.startDate ? new Date(data.startDate).toLocaleDateString("ar-SA") : "—";
  const endStr    = data.endDate   ? new Date(data.endDate).toLocaleDateString("ar-SA")   : new Date().toLocaleDateString("ar-SA");

  const body = `
    <p class="recipient">إلى من يهمه الأمر،</p>
    <p class="subject-line">الموضوع: شهادة خبرة</p>

    <p class="paragraph">
      تشهد <strong>${company}</strong> بأن الموظف المذكور أدناه عمل لديها خلال الفترة الموضحة،
      وقد أدى مهامه بكفاءة واحترافية عالية:
    </p>

    <table class="info-table">
      <tr><td>اسم الموظف</td><td>${data.employeeName}${data.arabicName ? ` / ${data.arabicName}` : ""}</td></tr>
      <tr><td>الرقم الوظيفي</td><td>${data.employeeNumber}</td></tr>
      ${data.jobTitle   ? `<tr><td>المسمى الوظيفي</td><td>${data.jobTitle}</td></tr>` : ""}
      ${data.department ? `<tr><td>القسم</td><td>${data.department}</td></tr>` : ""}
      ${data.nationality ? `<tr><td>الجنسية</td><td>${data.nationality === "saudi" ? "سعودي" : "غير سعودي"}</td></tr>` : ""}
      <tr><td>تاريخ الالتحاق</td><td>${startStr}</td></tr>
      <tr><td>تاريخ انتهاء الخدمة</td><td>${endStr}</td></tr>
    </table>

    <p class="closing">
      نشهد له بحسن السيرة والسلوك وإخلاصه في العمل طوال فترة خدمته،
      ونتمنى له التوفيق والنجاح في مسيرته المهنية.
      صدرت هذه الشهادة بناءً على طلبه لتقديمها للجهات المختصة.
    </p>
  `;

  buildPage({
    company, title: "شهادة خبرة", refNumber, issueDate, body,
    logoDataUrl: data.logoDataUrl,
    commercialReg: data.commercialReg, taxNumber: data.taxNumber,
    companyAddress: data.companyAddress, companyPhone: data.companyPhone, companyEmail: data.companyEmail,
    fileName: `experience-letter-${data.employeeNumber}`,
  });
}
