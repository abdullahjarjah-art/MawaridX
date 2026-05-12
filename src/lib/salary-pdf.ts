export type SalarySlipData = {
  employeeName: string;
  employeeNumber: string;
  jobTitle?: string;
  department?: string;
  nationality?: string;
  month: number;
  year: number;
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  allowances: number;          // مجموع البدلات (fallback لو لم تُمرَّر التفاصيل)
  bonus: number;
  overtimePay: number;
  deductions: number;
  gosiEmployee?: number;
  gosiEmployer?: number;
  netSalary: number;
  status: string;
  paidAt?: string;
  notes?: string;
  bankName?: string;
  iban?: string;
  companyName?: string;
};

const monthNames = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateSalaryPDF(data: SalarySlipData): void {
  const company    = data.companyName || "MawaridX HR";
  const monthName  = monthNames[data.month - 1];
  const gosiEmp    = data.gosiEmployee ?? 0;
  const gosiEer    = data.gosiEmployer ?? 0;
  const isSaudi    = (data.nationality ?? "non_saudi") === "saudi";
  const issueDate  = new Date().toLocaleDateString("ar-SA");
  const issueTime  = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  // ── بناء صفوف الإيرادات ──
  const earningRows: { label: string; amount: number }[] = [
    { label: "الراتب الأساسي",   amount: data.basicSalary },
  ];
  if ((data.housingAllowance ?? 0) > 0) {
    earningRows.push({ label: "بدل سكن",        amount: data.housingAllowance! });
  }
  if ((data.transportAllowance ?? 0) > 0) {
    earningRows.push({ label: "بدل مواصلات",    amount: data.transportAllowance! });
  }
  if ((data.otherAllowance ?? 0) > 0) {
    earningRows.push({ label: "بدلات أخرى",     amount: data.otherAllowance! });
  }
  // لو لم تُمرَّر التفاصيل لكن يوجد مجموع بدلات
  if (
    !data.housingAllowance && !data.transportAllowance && !data.otherAllowance
    && data.allowances > 0
  ) {
    earningRows.push({ label: "البدلات",         amount: data.allowances });
  }
  if (data.bonus > 0)       earningRows.push({ label: "مكافآت",         amount: data.bonus });
  if (data.overtimePay > 0) earningRows.push({ label: "العمل الإضافي",  amount: data.overtimePay });

  const totalEarnings = data.basicSalary + data.allowances + data.bonus + data.overtimePay;

  // ── بناء صفوف الخصومات ──
  const deductionRows: { label: string; amount: number }[] = [];
  if (data.deductions > 0) deductionRows.push({ label: "خصومات أخرى",                   amount: data.deductions });
  if (gosiEmp > 0)         deductionRows.push({ label: `التأمينات (GOSI) — نصيب الموظف`, amount: gosiEmp });

  const totalDeductions = data.deductions + gosiEmp;

  // ── مطابقة الصفوف بين الجانبين ──
  const rowCount = Math.max(earningRows.length, deductionRows.length);
  const rows: { eLabel: string; eAmt: string; dLabel: string; dAmt: string }[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({
      eLabel: earningRows[i]?.label   ?? "",
      eAmt:   earningRows[i]  ? fmt(earningRows[i].amount)   : "",
      dLabel: deductionRows[i]?.label ?? "",
      dAmt:   deductionRows[i] ? fmt(deductionRows[i].amount) : "",
    });
  }

  // ── قسم البنك ──
  const bankSection = (data.bankName || data.iban) ? `
    <table class="bank-table">
      <tr>
        <td><span class="bl">طريقة الدفع</span><span class="bv">بنك</span></td>
        <td><span class="bl">اسم البنك</span><span class="bv">${data.bankName || "—"}</span></td>
      </tr>
      <tr>
        <td><span class="bl">رقم الآيبان</span><span class="bv ltr">${data.iban || "—"}</span></td>
        <td><span class="bl">نوع الدفع</span><span class="bv">Bank Account</span></td>
      </tr>
    </table>` : "";

  // ── ملاحظات GOSI ──
  const gosiNote = gosiEmp > 0 ? `
    <div class="gosi-note">
      التأمينات الاجتماعية (GOSI) — ${isSaudi ? "سعودي" : "غير سعودي"} &nbsp;|&nbsp;
      وعاء الاشتراك: ${fmt(data.basicSalary)} ر.س &nbsp;|&nbsp;
      نصيب الموظف: ${fmt(gosiEmp)} ر.س (${isSaudi ? "9%" : "معفى"}) &nbsp;|&nbsp;
      نصيب صاحب العمل: ${fmt(gosiEer)} ر.س (${isSaudi ? "9%" : "2%"})
    </div>` : "";

  const statusLabel = data.status === "paid" ? "مصروف ✓" : "معلق";
  const notesHtml = data.notes ? `<div class="notes">ملاحظة: ${data.notes}</div>` : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>تفصيل الراتب — ${data.employeeName} — ${monthName} ${data.year}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f4f4f4;color:#1a1a1a;direction:rtl;font-size:13px}

    .print-bar{text-align:center;padding:14px;background:#e8e8e8}
    .print-btn{background:#1a1a1a;color:#fff;border:none;padding:10px 32px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}

    .page{max-width:760px;margin:20px auto;background:#fff;border:1px solid #ccc;padding:32px 36px}

    /* ── Header ── */
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #222}
    .co-name{font-size:17px;font-weight:800;margin-bottom:3px}
    .co-sub{font-size:11px;color:#666}
    .sys-info{text-align:left;font-size:11px;color:#555;line-height:1.7}
    .sys-info strong{color:#1a1a1a;display:block;margin-bottom:2px}

    /* ── Title ── */
    .title-area{text-align:center;margin:14px 0 18px}
    .title-area h1{font-size:30px;font-weight:900;letter-spacing:1px}
    .title-area .period{font-size:15px;color:#444;margin-top:4px}

    /* ── Employee Info ── */
    .emp-info{text-align:right;margin-bottom:6px;line-height:2;font-size:13px;color:#333}
    .emp-info b{color:#1a1a1a}

    /* ── Timestamp ── */
    .ts{font-size:11px;color:#777;margin-bottom:14px}

    /* ── Main Table ── */
    .main-table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px}
    .main-table th{background:#2a2a2a;color:#fff;padding:9px 12px;text-align:right;font-size:12px;font-weight:700}
    .main-table th.sep{border-right:2px solid #555}
    .main-table td{padding:8px 12px;border-bottom:1px solid #ebebeb;vertical-align:middle}
    .main-table td.sep{border-right:1px solid #ddd}
    .main-table td.amt{font-weight:600;white-space:nowrap;color:#111}
    .main-table .total td{background:#f0f0f0;font-weight:800;border-top:1px solid #999;border-bottom:1px solid #999;font-size:12px}
    .main-table .net td{background:#1a1a1a;color:#fff;font-size:14px;font-weight:800;padding:12px;border:none}
    .main-table .net td.right{letter-spacing:.5px}

    /* ── Bank Table ── */
    .bank-table{width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:16px;font-size:12px}
    .bank-table td{padding:9px 14px;border-bottom:1px solid #e5e5e5;border-left:1px solid #e5e5e5;vertical-align:top;width:50%}
    .bank-table tr:last-child td{border-bottom:none}
    .bl{display:block;font-size:10px;color:#888;margin-bottom:2px}
    .bv{display:block;font-weight:700;color:#1a1a1a}
    .ltr{direction:ltr;text-align:right;unicode-bidi:embed}

    /* ── Status / GOSI ── */
    .status-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8f8f8;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:10px;font-size:12px}
    .sbadge{padding:3px 12px;border-radius:12px;font-weight:700;font-size:12px}
    .spaid{background:#d1fae5;color:#065f46}
    .spending{background:#fef3c7;color:#92400e}
    .gosi-note{font-size:11px;color:#555;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:8px 12px;margin-bottom:10px;line-height:1.7}
    .notes{font-size:12px;color:#555;background:#fffbeb;border-right:3px solid #f59e0b;padding:8px 12px;margin-bottom:12px}

    /* ── Signatures ── */
    .sig-section{display:flex;justify-content:space-between;margin-top:36px}
    .sig-box{text-align:center;font-size:12px;color:#555;flex:1}
    .sig-line{height:40px;border-bottom:1px solid #888;margin:0 20px 6px}

    /* ── Footer ── */
    .footer{text-align:center;font-size:10px;color:#aaa;margin-top:18px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between}

    @media print{
      body{background:#fff}
      .page{margin:0;border:none;padding:24px}
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
      <div>
        <div class="co-name">${company}</div>
        <div class="co-sub">المملكة العربية السعودية</div>
      </div>
      <div class="sys-info">
        <strong>أنشئ بواسطة نظام MawaridX للموارد البشرية</strong>
        ${issueDate}
      </div>
    </div>

    <!-- Title -->
    <div class="title-area">
      <h1>تفصيل الراتب</h1>
      <div class="period">${monthName} ${data.year}</div>
    </div>

    <!-- Employee Info -->
    <div class="emp-info">
      <div>اسم الموظف: <b>${data.employeeName}</b></div>
      <div>رقم الموظف: <b>${data.employeeNumber}</b></div>
      ${data.jobTitle  ? `<div>المسمى الوظيفي: <b>${data.jobTitle}</b></div>` : ""}
      ${data.department ? `<div>القسم: <b>${data.department}</b></div>` : ""}
    </div>
    <div class="ts">توقيع المستخدم: ${data.employeeNumber} | ${issueDate} ${issueTime}</div>

    <!-- Main Table (الإيرادات | الخصومات جنب بعض) -->
    <table class="main-table">
      <thead>
        <tr>
          <th colspan="2">الإيرادات</th>
          <th colspan="2" class="sep">الخصومات</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
        <tr>
          <td>${r.eLabel}</td>
          <td class="amt">${r.eAmt}</td>
          <td class="sep">${r.dLabel}</td>
          <td class="amt">${r.dAmt}</td>
        </tr>`).join("")}
        <tr class="total">
          <td>مجموع الإيرادات</td>
          <td class="amt">${fmt(totalEarnings)}</td>
          <td class="sep">مجموع الخصومات</td>
          <td class="amt">${fmt(totalDeductions)}</td>
        </tr>
        <tr class="net">
          <td colspan="2" class="right">صافي الراتب</td>
          <td colspan="2" style="text-align:left">${fmt(data.netSalary)} sar</td>
        </tr>
      </tbody>
    </table>

    <!-- Status -->
    <div class="status-row">
      <span>حالة الصرف${data.paidAt ? " — " + new Date(data.paidAt).toLocaleDateString("ar-SA") : ""}</span>
      <span class="sbadge ${data.status === "paid" ? "spaid" : "spending"}">${statusLabel}</span>
    </div>

    ${notesHtml}

    <!-- Bank Section -->
    ${bankSection}

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
      <span>تم إنشاء هذا المستند آلياً — لا يحتاج توقيعاً</span>
      <span>تاريخ الإصدار: ${issueDate}</span>
    </div>

  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
