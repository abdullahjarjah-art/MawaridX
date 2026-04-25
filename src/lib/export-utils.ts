"use client";

import * as XLSX from "xlsx";

/* ─────────────────────────────────────────
   Shared Export Utilities — PDF & Excel
   ───────────────────────────────────────── */

/** WPS — ملف حماية الأجور بصيغة SIF */
export type WpsRow = {
  employeeNumber: string;
  employeeName: string;
  iban: string;
  bankCode: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  month: number;
  year: number;
};

export function exportWPS(rows: WpsRow[], employerRef: string, month: number, year: number) {
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  const payDate = periodEnd;

  // SIF Header
  const header = [["EHR", employerRef, rows.length, periodStart, periodEnd, "SAR"]];
  // SIF Rows
  const detail = rows.map((r, i) => [
    "EDR",
    employerRef,
    r.employeeNumber,
    i + 1,
    r.iban.replace(/\s/g, ""),
    r.bankCode,
    r.netSalary.toFixed(2),
    "682", // SAR currency code
    payDate,
    periodStart,
    periodEnd,
    r.basicSalary.toFixed(2),
    r.allowances.toFixed(2),
    r.deductions.toFixed(2),
  ]);
  // SIF Footer
  const footer = [["EFR", employerRef, rows.length, rows.reduce((s, r) => s + r.netSalary, 0).toFixed(2)]];

  // Sheet 1: SIF format (للرفع على النظام)
  const sifData = [...header, ...detail, ...footer];
  const wsSIF = XLSX.utils.aoa_to_sheet(sifData);

  // Sheet 2: قراءة بشرية (للمراجعة)
  const readable = rows.map(r => ({
    "رقم الموظف": r.employeeNumber,
    "اسم الموظف": r.employeeName,
    "IBAN": r.iban,
    "رمز البنك": r.bankCode,
    "الراتب الأساسي": r.basicSalary,
    "البدلات": r.allowances,
    "الاستقطاعات": r.deductions,
    "صافي الراتب": r.netSalary,
  }));
  const wsReadable = XLSX.utils.json_to_sheet(readable);
  wsReadable["!cols"] = Object.keys(readable[0] ?? {}).map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSIF, "SIF");
  XLSX.utils.book_append_sheet(wb, wsReadable, "مراجعة");
  XLSX.writeFile(wb, `WPS_${year}_${String(month).padStart(2, "0")}.xlsx`);
}

const monthNames = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

/* ═══════════════════════════════════════
   EXCEL EXPORT
   ═══════════════════════════════════════ */

/** Download blank template for bulk employee import */
export function downloadEmployeeImportTemplate() {
  const headers = [
    "الاسم الأول", "الاسم الأخير", "الاسم بالعربي", "البريد الإلكتروني",
    "الجوال", "رقم الهوية", "تاريخ الميلاد", "الجنس", "الحالة الاجتماعية",
    "المدينة", "المسمى الوظيفي", "الدور", "القسم", "نوع التوظيف",
    "تاريخ الالتحاق", "الراتب الأساسي", "بدل سكن", "بدل نقل",
    "بدلات أخرى", "البنك", "IBAN", "الجنسية", "تاريخ انتهاء الإقامة",
  ];
  const example = [
    "أحمد", "الزهراني", "أحمد علي الزهراني", "ahmed@company.com",
    "0501234567", "1234567890", "1990-05-15", "ذكر", "أعزب",
    "الرياض", "محاسب", "employee", "المحاسبة", "full_time",
    "2024-01-01", "8000", "2000", "1000",
    "0", "البنك الأهلي", "SA0380000000608010167519", "saudi", "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "موظفون");
  XLSX.writeFile(wb, "نموذج_استيراد_الموظفين.xlsx");
}

/** Generic: export array of objects as .xlsx */
export function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/** Export multiple sheets */
export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  fileName: string,
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/* ── Salaries Excel ── */
type SalaryRow = {
  employeeName: string;
  employeeNumber: string;
  department?: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  overtimePay: number;
  deductions: number;
  gosiEmployee: number;
  gosiEmployer: number;
  netSalary: number;
  status: string;
  paidAt?: string;
};

export function exportSalariesExcel(salaries: SalaryRow[], month: number, year: number) {
  const data = salaries.map((s) => ({
    "الموظف": s.employeeName,
    "الرقم الوظيفي": s.employeeNumber,
    "القسم": s.department ?? "",
    "الراتب الأساسي": s.basicSalary,
    "البدلات": s.allowances,
    "المكافآت": s.bonus,
    "الأوفرتايم": s.overtimePay,
    "الخصومات": s.deductions,
    "GOSI موظف": s.gosiEmployee,
    "GOSI صاحب عمل": s.gosiEmployer,
    "صافي الراتب": s.netSalary,
    "الحالة": s.status === "paid" ? "مصروف" : "معلق",
    "تاريخ الصرف": s.paidAt ? new Date(s.paidAt).toLocaleDateString("ar-SA") : "",
  }));
  exportToExcel(data, `رواتب_${monthNames[month - 1]}_${year}`, "الرواتب");
}

/* ── Reports Excel ── */
type ReportData = {
  attendanceByMonth: { month: number; present: number; late: number; absent: number; total: number; lateMins: number }[];
  salaryByMonth: { month: number; totalNet: number; count: number; paid: number }[];
  requestsByType: Record<string, { total: number; approved: number; rejected: number; pending: number }>;
  totalEmployees: number;
  employeesByDept: { department: string; count: number }[];
};

const typeMap: Record<string, string> = {
  leave: "إجازة", attendance_fix: "تعديل حضور", loan: "سلفة",
  custody: "عهدة", exit_return: "خروج وعودة", resignation: "استقالة", letter: "خطاب",
};

export function exportReportsExcel(data: ReportData, year: string) {
  const attendanceSheet = data.attendanceByMonth.map((m) => ({
    "الشهر": monthNames[m.month - 1],
    "حضور": m.present,
    "تأخر": m.late,
    "غياب": m.absent,
    "الإجمالي": m.total,
    "دقائق التأخير": m.lateMins,
  }));

  const salarySheet = data.salaryByMonth.map((m) => ({
    "الشهر": monthNames[m.month - 1],
    "صافي الرواتب": m.totalNet,
    "عدد الموظفين": m.count,
    "مصروف": m.paid,
  }));

  const requestsSheet = Object.entries(data.requestsByType).map(([type, stats]) => ({
    "النوع": typeMap[type] ?? type,
    "الإجمالي": stats.total,
    "موافق": stats.approved,
    "معلق": stats.pending,
    "مرفوض": stats.rejected,
  }));

  const deptSheet = data.employeesByDept.map((d) => ({
    "القسم": d.department,
    "عدد الموظفين": d.count,
  }));

  exportMultiSheetExcel([
    { name: "الحضور الشهري", data: attendanceSheet },
    { name: "الرواتب الشهرية", data: salarySheet },
    { name: "الطلبات", data: requestsSheet },
    { name: "الأقسام", data: deptSheet },
  ], `تقارير_${year}`);
}

/* ═══════════════════════════════════════
   PDF EXPORT
   ═══════════════════════════════════════ */

/** Open a styled HTML report in a new window for printing/saving as PDF */
function openPrintWindow(title: string, html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1e293b; direction: rtl; background: #fff; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0ea5e9; }
  .header h1 { font-size: 22px; color: #0c4a6e; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #64748b; }
  .logo { font-size: 26px; font-weight: 900; margin-bottom: 6px; }
  .logo span { color: #0ea5e9; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { padding: 8px 10px; text-align: right; font-size: 12px; border: 1px solid #e2e8f0; }
  th { background: #f0f9ff; color: #0c4a6e; font-weight: 600; }
  tr:nth-child(even) { background: #f8fafc; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .summary-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .value { font-size: 20px; font-weight: 700; color: #0c4a6e; }
  .summary-card .label { font-size: 11px; color: #64748b; margin-top: 2px; }
  .section-title { font-size: 15px; font-weight: 700; color: #0c4a6e; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e0f2fe; }
  .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
  .print-btn { display: block; margin: 0 auto 20px; padding: 10px 32px; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; }
  .print-btn:hover { background: #0284c7; }
  @media print { .print-btn { display: none; } .summary-grid { grid-template-columns: repeat(4, 1fr); } }
  .badge-paid { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
  .badge-pending { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
  .total-row { background: #f0f9ff !important; font-weight: 700; }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
${html}
<div class="footer">تم إنشاء هذا التقرير بواسطة MawaridX — ${new Date().toLocaleDateString("ar-SA")} ${new Date().toLocaleTimeString("ar-SA")}</div>
</body>
</html>`);
  win.document.close();
}

/** PDF: Salaries Report */
export function exportSalariesPDF(
  salaries: SalaryRow[],
  month: number,
  year: number,
  totals: { totalNet: number; totalBasic: number; totalGosi: number },
) {
  const fmt = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rows = salaries.map((s, i) =>
    `<tr>
      <td>${i + 1}</td>
      <td>${s.employeeName}</td>
      <td>${s.employeeNumber}</td>
      <td>${s.department ?? ""}</td>
      <td>${fmt(s.basicSalary)}</td>
      <td>${fmt(s.allowances)}</td>
      <td>${fmt(s.bonus + s.overtimePay)}</td>
      <td>${fmt(s.deductions)}</td>
      <td>${fmt(s.gosiEmployee)}</td>
      <td>${fmt(s.netSalary)}</td>
      <td><span class="${s.status === "paid" ? "badge-paid" : "badge-pending"}">${s.status === "paid" ? "مصروف" : "معلق"}</span></td>
    </tr>`
  ).join("");

  const totalRow = `<tr class="total-row">
    <td colspan="4">الإجمالي</td>
    <td>${fmt(totals.totalBasic)}</td>
    <td>${fmt(salaries.reduce((s, r) => s + r.allowances, 0))}</td>
    <td>${fmt(salaries.reduce((s, r) => s + r.bonus + r.overtimePay, 0))}</td>
    <td>${fmt(salaries.reduce((s, r) => s + r.deductions, 0))}</td>
    <td>${fmt(totals.totalGosi)}</td>
    <td>${fmt(totals.totalNet)}</td>
    <td></td>
  </tr>`;

  const html = `
    <div class="header">
      <div class="logo">Mawarid<span>X</span></div>
      <h1>كشف رواتب ${monthNames[month - 1]} ${year}</h1>
      <p>عدد الموظفين: ${salaries.length} | إجمالي صافي: ${fmt(totals.totalNet)} ر.س</p>
    </div>
    <div class="summary-grid">
      <div class="summary-card"><div class="value">${salaries.length}</div><div class="label">عدد الموظفين</div></div>
      <div class="summary-card"><div class="value">${fmt(totals.totalBasic)}</div><div class="label">إجمالي الأساسي</div></div>
      <div class="summary-card"><div class="value">${fmt(totals.totalGosi)}</div><div class="label">GOSI موظفين</div></div>
      <div class="summary-card"><div class="value">${fmt(totals.totalNet)}</div><div class="label">صافي الرواتب</div></div>
    </div>
    <table>
      <thead>
        <tr><th>#</th><th>الموظف</th><th>الرقم</th><th>القسم</th><th>الأساسي</th><th>البدلات</th><th>مكافآت</th><th>خصومات</th><th>GOSI</th><th>الصافي</th><th>الحالة</th></tr>
      </thead>
      <tbody>${rows}${totalRow}</tbody>
    </table>`;

  openPrintWindow(`كشف رواتب ${monthNames[month - 1]} ${year}`, html);
}

/** PDF: Full Reports */
export function exportReportsPDF(data: ReportData, year: string) {
  const fmt = (n: number) => n.toLocaleString("ar-SA");
  const totalAtt = data.attendanceByMonth.reduce((s, m) => s + m.total, 0);
  const totalLate = data.attendanceByMonth.reduce((s, m) => s + m.late, 0);
  const totalAbsent = data.attendanceByMonth.reduce((s, m) => s + m.absent, 0);
  const totalSalary = data.salaryByMonth.reduce((s, m) => s + m.totalNet, 0);
  const totalLateMins = data.attendanceByMonth.reduce((s, m) => s + m.lateMins, 0);
  const fmtMins = (m: number) => { const h = Math.floor(m / 60); const min = m % 60; return h > 0 ? `${h} س ${min} د` : `${min} د`; };

  const attRows = data.attendanceByMonth.map((m) =>
    `<tr><td>${monthNames[m.month - 1]}</td><td>${m.present}</td><td>${m.late}</td><td>${m.absent}</td><td>${m.total}</td><td>${fmtMins(m.lateMins)}</td></tr>`
  ).join("");

  const salRows = data.salaryByMonth.map((m) =>
    `<tr><td>${monthNames[m.month - 1]}</td><td>${fmt(m.totalNet)} ر.س</td><td>${m.count}</td><td>${m.paid}</td></tr>`
  ).join("");

  const reqRows = Object.entries(data.requestsByType).map(([type, stats]) =>
    `<tr><td>${typeMap[type] ?? type}</td><td>${stats.total}</td><td>${stats.approved}</td><td>${stats.pending}</td><td>${stats.rejected}</td></tr>`
  ).join("");

  const deptRows = data.employeesByDept.sort((a, b) => b.count - a.count).map((d) =>
    `<tr><td>${d.department}</td><td>${d.count}</td><td>${((d.count / data.totalEmployees) * 100).toFixed(1)}%</td></tr>`
  ).join("");

  const html = `
    <div class="header">
      <div class="logo">Mawarid<span>X</span></div>
      <h1>تقرير سنوي — ${year}</h1>
      <p>تقرير شامل للحضور والرواتب والطلبات</p>
    </div>
    <div class="summary-grid">
      <div class="summary-card"><div class="value">${data.totalEmployees}</div><div class="label">الموظفون النشطون</div></div>
      <div class="summary-card"><div class="value">${fmt(totalAtt)}</div><div class="label">سجلات الحضور</div></div>
      <div class="summary-card"><div class="value">${fmtMins(totalLateMins)}</div><div class="label">إجمالي التأخير</div></div>
      <div class="summary-card"><div class="value">${fmt(totalSalary)} ر.س</div><div class="label">إجمالي الرواتب</div></div>
    </div>

    <div class="section-title">📊 الحضور الشهري</div>
    <table>
      <thead><tr><th>الشهر</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>الإجمالي</th><th>تأخير</th></tr></thead>
      <tbody>${attRows}
        <tr class="total-row"><td>الإجمالي</td><td>${fmt(totalAtt - totalLate - totalAbsent)}</td><td>${fmt(totalLate)}</td><td>${fmt(totalAbsent)}</td><td>${fmt(totalAtt)}</td><td>${fmtMins(totalLateMins)}</td></tr>
      </tbody>
    </table>

    <div class="section-title">💰 الرواتب الشهرية</div>
    <table>
      <thead><tr><th>الشهر</th><th>صافي الرواتب</th><th>عدد الموظفين</th><th>مصروف</th></tr></thead>
      <tbody>${salRows}
        <tr class="total-row"><td>الإجمالي</td><td>${fmt(totalSalary)} ر.س</td><td>—</td><td>—</td></tr>
      </tbody>
    </table>

    ${reqRows ? `
    <div class="section-title">📋 الطلبات حسب النوع</div>
    <table>
      <thead><tr><th>النوع</th><th>الإجمالي</th><th>موافق</th><th>معلق</th><th>مرفوض</th></tr></thead>
      <tbody>${reqRows}</tbody>
    </table>` : ""}

    <div class="section-title">🏢 الموظفون حسب القسم</div>
    <table>
      <thead><tr><th>القسم</th><th>العدد</th><th>النسبة</th></tr></thead>
      <tbody>${deptRows}</tbody>
    </table>`;

  openPrintWindow(`تقرير سنوي ${year}`, html);
}
