export type SalarySlipData = {
  employeeName: string;
  employeeNumber: string;
  jobTitle?: string;
  department?: string;
  nationality?: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  overtimePay: number;
  deductions: number;
  gosiEmployee?: number;
  gosiEmployer?: number;
  netSalary: number;
  status: string;
  paidAt?: string;
  notes?: string;
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
  const company = data.companyName || "MawaridX HR";
  const monthName = monthNames[data.month - 1];
  const gosiEmp = data.gosiEmployee ?? 0;
  const gosiEer = data.gosiEmployer ?? 0;
  const isSaudi = (data.nationality ?? "non_saudi") === "saudi";
  const totalEarnings = data.basicSalary + data.allowances + data.bonus + data.overtimePay;
  const totalDeductions = data.deductions + gosiEmp;
  const statusLabel = data.status === "paid" ? "مصروف ✓" : "معلق";
  const paidDateStr = data.paidAt
    ? `تاريخ الصرف: ${new Date(data.paidAt).toLocaleDateString("ar-SA")}`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>كشف راتب — ${data.employeeName} — ${monthName} ${data.year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      direction: rtl;
    }
    .page {
      max-width: 780px;
      margin: 30px auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,.12);
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: #fff;
      padding: 36px 40px 28px;
      text-align: center;
    }
    .header .logo { font-size: 26px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; }
    .header .subtitle { font-size: 14px; opacity: .85; margin-bottom: 4px; }
    .header .period {
      display: inline-block;
      background: rgba(255,255,255,.2);
      border-radius: 20px;
      padding: 4px 18px;
      font-size: 13px;
      margin-top: 6px;
    }

    /* Employee Info */
    .emp-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .emp-item {
      padding: 14px 24px;
      border-left: 1px solid #e2e8f0;
    }
    .emp-item:nth-child(2n) { border-left: none; }
    .emp-label { font-size: 11px; color: #94a3b8; margin-bottom: 3px; }
    .emp-value { font-size: 14px; font-weight: 700; color: #1e293b; }

    /* Body */
    .body { padding: 28px 32px; }

    /* Tables row */
    .tables-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 22px; }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title.earnings { color: #1d4ed8; }
    .section-title.deductions { color: #dc2626; }
    .section-title .dot { width: 8px; height: 8px; border-radius: 50%; }
    .section-title.earnings .dot { background: #1d4ed8; }
    .section-title.deductions .dot { background: #dc2626; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th {
      padding: 9px 12px;
      font-size: 11px;
      font-weight: 600;
      text-align: right;
    }
    .earnings-table thead { background: #1d4ed8; color: #fff; }
    .deductions-table thead { background: #dc2626; color: #fff; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 9px 12px; color: #475569; }
    tbody td:last-child { text-align: left; font-weight: 600; color: #1e293b; }
    tfoot td {
      padding: 9px 12px;
      font-weight: 700;
      font-size: 12px;
    }
    .earnings-table tfoot { background: #dbeafe; color: #1e3a8a; }
    .deductions-table tfoot { background: #fee2e2; color: #7f1d1d; }
    tfoot td:last-child { text-align: left; }

    /* GOSI Box */
    .gosi-box {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .gosi-title { font-size: 13px; font-weight: 700; color: #0f766e; margin-bottom: 10px; }
    .gosi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .gosi-item { text-align: center; }
    .gosi-label { font-size: 10px; color: #64748b; margin-bottom: 3px; }
    .gosi-value { font-size: 14px; font-weight: 700; color: #0f766e; }
    .gosi-sub { font-size: 10px; color: #94a3b8; }

    /* Net Salary */
    .net-box {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 12px;
      padding: 20px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #fff;
      margin-bottom: 18px;
    }
    .net-label { font-size: 14px; opacity: .9; }
    .net-title { font-size: 18px; font-weight: 800; }
    .net-amount { font-size: 28px; font-weight: 900; }
    .net-currency { font-size: 14px; opacity: .85; margin-top: 4px; }

    /* Status */
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 10px;
      margin-bottom: 18px;
      border: 1px solid #e2e8f0;
    }
    .status-badge {
      font-weight: 700;
      font-size: 13px;
      padding: 4px 14px;
      border-radius: 20px;
    }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-pending { background: #fef3c7; color: #b45309; }

    .notes { font-size: 12px; color: #64748b; padding: 10px 14px; background: #fffbeb; border-radius: 8px; border-right: 3px solid #fbbf24; margin-bottom: 16px; }

    /* Footer */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      font-size: 11px;
      color: #94a3b8;
    }

    /* Print Button */
    .print-bar {
      text-align: center;
      padding: 20px;
      background: #f1f5f9;
    }
    .print-btn {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 12px 36px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .print-btn:hover { background: #1d4ed8; }

    @media print {
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; border-radius: 0; }
      .print-bar { display: none; }
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
      <div class="logo">${company}</div>
      <div class="subtitle">كشف الراتب الشهري</div>
      <div class="period">${monthName} ${data.year}</div>
    </div>

    <!-- Employee Info -->
    <div class="emp-box">
      <div class="emp-item">
        <div class="emp-label">اسم الموظف</div>
        <div class="emp-value">${data.employeeName}</div>
      </div>
      <div class="emp-item">
        <div class="emp-label">الرقم الوظيفي</div>
        <div class="emp-value">${data.employeeNumber}</div>
      </div>
      <div class="emp-item">
        <div class="emp-label">المسمى الوظيفي</div>
        <div class="emp-value">${data.jobTitle || "—"}</div>
      </div>
      <div class="emp-item">
        <div class="emp-label">القسم</div>
        <div class="emp-value">${data.department || "—"}</div>
      </div>
    </div>

    <div class="body">
      <!-- Earnings & Deductions Tables -->
      <div class="tables-row">
        <!-- Earnings -->
        <div>
          <div class="section-title earnings">
            <span class="dot"></span> المستحقات
          </div>
          <table class="earnings-table">
            <thead>
              <tr><th>البند</th><th>المبلغ (ر.س)</th></tr>
            </thead>
            <tbody>
              <tr><td>الراتب الأساسي</td><td>${fmt(data.basicSalary)}</td></tr>
              <tr><td>البدلات</td><td>${fmt(data.allowances)}</td></tr>
              <tr><td>المكافآت</td><td>${fmt(data.bonus)}</td></tr>
              <tr><td>العمل الإضافي</td><td>${fmt(data.overtimePay)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td>إجمالي المستحقات</td><td>${fmt(totalEarnings)}</td></tr>
            </tfoot>
          </table>
        </div>

        <!-- Deductions -->
        <div>
          <div class="section-title deductions">
            <span class="dot"></span> الخصومات
          </div>
          <table class="deductions-table">
            <thead>
              <tr><th>البند</th><th>المبلغ (ر.س)</th></tr>
            </thead>
            <tbody>
              <tr><td>خصومات أخرى</td><td>${fmt(data.deductions)}</td></tr>
              <tr><td>التأمينات (GOSI) — نصيب الموظف</td><td>${fmt(gosiEmp)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td>إجمالي الخصومات</td><td>${fmt(totalDeductions)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- GOSI Section -->
      <div class="gosi-box">
        <div class="gosi-title">🛡️ التأمينات الاجتماعية (GOSI) — ${isSaudi ? "سعودي" : "غير سعودي"}</div>
        <div class="gosi-grid">
          <div class="gosi-item">
            <div class="gosi-label">وعاء الاشتراك</div>
            <div class="gosi-value">${fmt(data.basicSalary)} ر.س</div>
            <div class="gosi-sub">الراتب الأساسي</div>
          </div>
          <div class="gosi-item">
            <div class="gosi-label">نصيب الموظف</div>
            <div class="gosi-value">${fmt(gosiEmp)} ر.س</div>
            <div class="gosi-sub">${isSaudi ? "9%" : "معفى"}</div>
          </div>
          <div class="gosi-item">
            <div class="gosi-label">نصيب صاحب العمل</div>
            <div class="gosi-value">${fmt(gosiEer)} ر.س</div>
            <div class="gosi-sub">${isSaudi ? "9%" : "2% (أخطار مهنية)"}</div>
          </div>
        </div>
      </div>

      <!-- Net Salary -->
      <div class="net-box">
        <div>
          <div class="net-label">صافي الراتب</div>
          <div class="net-title">${monthName} ${data.year}</div>
        </div>
        <div style="text-align:left">
          <div class="net-amount">${fmt(data.netSalary)}</div>
          <div class="net-currency">ريال سعودي</div>
        </div>
      </div>

      <!-- Status -->
      <div class="status-row">
        <span style="font-size:13px;color:#64748b">حالة الصرف ${paidDateStr ? "— " + paidDateStr : ""}</span>
        <span class="status-badge ${data.status === "paid" ? "status-paid" : "status-pending"}">${statusLabel}</span>
      </div>

      ${data.notes ? `<div class="notes">ملاحظات: ${data.notes}</div>` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>تم إنشاء هذا المستند آلياً — لا يحتاج توقيعاً</span>
      <span>تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")}</span>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
