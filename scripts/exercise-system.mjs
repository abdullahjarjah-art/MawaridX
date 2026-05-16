#!/usr/bin/env node
/**
 * Exercise MawaridX as a real HR user would.
 * Captures every API response and reports anomalies.
 *
 * Run: node scripts/exercise-system.mjs
 */

const BASE = "http://localhost:3000";
const EMAIL = "hr@company.com";
const PASS  = "Admin@123";

// ── State ────────────────────────────────────────────────
let cookieJar = "";
const issues = [];
const passes = [];
const noteIssue = (label, info) => { issues.push({ label, info }); console.log("  ❌", label, info ? "→ " + JSON.stringify(info).slice(0, 200) : ""); };
const notePass  = (label) => { passes.push(label); console.log("  ✅", label); };
const section   = (title) => console.log("\n── " + title + " ──");

// ── Cookie-aware fetch wrapper ───────────────────────────
async function api(method, path, body, expect = [200, 201]) {
  const headers = { "Content-Type": "application/json" };
  if (cookieJar) headers.Cookie = cookieJar;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  // capture cookies
  const setC = res.headers.getSetCookie?.() ?? [];
  for (const c of setC) {
    const kv = c.split(";")[0];
    if (!cookieJar.includes(kv.split("=")[0])) cookieJar += (cookieJar ? "; " : "") + kv;
    else cookieJar = cookieJar.replace(new RegExp(kv.split("=")[0] + "=[^;]*"), kv);
  }
  let data;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    try { data = await res.text(); } catch { data = null; }
  }
  const ok = expect.includes(res.status);
  return { status: res.status, ok, data, expectedOk: ok };
}

// ── Tests ────────────────────────────────────────────────

async function step01_login() {
  section("1. تسجيل الدخول كـ HR");
  const r = await api("POST", "/api/auth/login", { email: EMAIL, password: PASS });
  if (r.ok) notePass(`تسجيل دخول ${EMAIL}`);
  else noteIssue("فشل تسجيل الدخول", { status: r.status, body: r.data });
}

async function step02_fetchEmployees() {
  section("2. قائمة الموظفين");
  const r = await api("GET", "/api/employees?all=1");
  if (!r.ok) return noteIssue("فشل جلب قائمة الموظفين", { status: r.status });
  const list = Array.isArray(r.data) ? r.data : (r.data.data ?? []);
  notePass(`جلب ${list.length} موظف`);
  return list;
}

async function step03_addEmployee() {
  section("3. إضافة موظف جديد");
  const num = "TEST" + Date.now().toString(36).slice(-5).toUpperCase();
  const body = {
    employeeNumber: num,
    firstName: "تجربة",
    lastName: "محاكاة",
    email: `${num.toLowerCase()}@test.local`,
    nationalId: "1" + Math.floor(Math.random() * 1e9),
    phone: "+966500000000",
    jobTitle: "موظف اختبار",
    department: "[SIM] العمليات",
    employmentType: "full_time",
    basicSalary: 9000,
    housingAllowance: 1500,
    transportAllowance: 500,
  };
  const r = await api("POST", "/api/employees", body);
  if (r.ok && r.data?.id) {
    notePass(`إضافة موظف ${num} (id=${r.data.id})`);
    return r.data;
  }
  noteIssue("فشل إضافة موظف", { status: r.status, body: r.data });
}

async function step04_editEmployee(emp) {
  if (!emp) return;
  section("4. تعديل الموظف الجديد");
  const r = await api("PATCH", `/api/employees/${emp.id}`, { phone: "+966599999999" });
  if (r.ok) notePass("تعديل رقم هاتف الموظف");
  else noteIssue("فشل تعديل الموظف", { status: r.status, body: r.data });
}

async function step05_addAttendance_normalDay(emp) {
  if (!emp) return;
  section("5. تسجيل حضور في يوم دوام عادي");
  // Find a recent Sunday-Thursday non-holiday non-leave date for this employee
  const date = new Date();
  while (date.getDay() === 5 || date.getDay() === 6) date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  const dateStr = date.toISOString();
  const ci = new Date(date); ci.setHours(8, 5, 0, 0);
  const co = new Date(date); co.setHours(17, 10, 0, 0);
  const r = await api("POST", "/api/attendance", {
    employeeId: emp.id,
    date: dateStr,
    checkIn: ci.toISOString(),
    checkOut: co.toISOString(),
    status: "present",
  });
  if (r.ok) notePass(`تسجيل حضور ليوم ${dateStr.slice(0,10)}`);
  else noteIssue("فشل تسجيل حضور يوم عادي", { status: r.status, body: r.data });
  return r.data;
}

async function step06_addAttendance_onHoliday(emp) {
  if (!emp) return;
  section("6. محاولة تسجيل حضور في عطلة رسمية (يجب أن تُرفض)");
  // 2026-09-23 = National Day (in the future, so we use a past one)
  // Use 2026-02-22 Founding Day
  const date = new Date("2026-02-22T00:00:00");
  const ci = new Date(date); ci.setHours(8, 0, 0, 0);
  const r = await api("POST", "/api/attendance", {
    employeeId: emp.id,
    date: date.toISOString(),
    checkIn: ci.toISOString(),
    status: "present",
  }, [403]);
  if (r.status === 403) notePass(`رفض البصمة في عطلة (${r.data?.error ?? ""})`);
  else noteIssue("سمح بالبصمة في عطلة رسمية!", { status: r.status, body: r.data });
}

async function step07_addAttendance_onWeekend(emp) {
  if (!emp) return;
  section("7. محاولة تسجيل حضور في الجمعة (يجب أن تُرفض لو ما عنده شيفت)");
  // Find a past Friday
  const d = new Date();
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  const ci = new Date(d); ci.setHours(8, 0, 0, 0);
  const r = await api("POST", "/api/attendance", {
    employeeId: emp.id,
    date: d.toISOString(),
    checkIn: ci.toISOString(),
    status: "present",
  }, [403]);
  if (r.status === 403) notePass(`رفض البصمة في الجمعة (${r.data?.error ?? ""})`);
  else noteIssue("سمح بالبصمة في الجمعة (الموظف بدون شيفت)", { status: r.status });
}

async function step08_addLeave(emp) {
  if (!emp) return;
  section("8. تقديم إجازة سنوية + اعتمادها");
  const start = new Date(); start.setDate(start.getDate() + 2); start.setHours(0,0,0,0);
  const end   = new Date(start); end.setDate(end.getDate() + 2);
  const r = await api("POST", "/api/leaves", {
    employeeId: emp.id,
    type: "annual",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    days: 3,
    reason: "إجازة تجريبية",
  });
  if (!r.ok) return noteIssue("فشل إنشاء طلب إجازة", { status: r.status, body: r.data });
  notePass(`أُنشئت إجازة id=${r.data.id}`);
  // 2-step approval: manager → admin
  const m = await api("PUT", `/api/leaves/${r.data.id}`, { status: "manager_approved" });
  if (m.ok) notePass("موافقة المدير");
  else noteIssue("فشل موافقة المدير", { status: m.status, body: m.data });
  const ap = await api("PUT", `/api/leaves/${r.data.id}`, { status: "approved" });
  if (ap.ok) notePass("اعتماد الإجازة من HR");
  else noteIssue("فشل اعتماد الإجازة من HR", { status: ap.status, body: ap.data });
  return { ...r.data, start, end };
}

async function step09_attendanceDuringLeave(emp, leave) {
  if (!emp || !leave) return;
  section("9. محاولة بصمة أثناء إجازة معتمدة (يجب أن تُرفض)");
  const ci = new Date(leave.start); ci.setHours(8, 0, 0, 0);
  const r = await api("POST", "/api/attendance", {
    employeeId: emp.id,
    date: leave.start.toISOString(),
    checkIn: ci.toISOString(),
    status: "present",
  }, [403]);
  if (r.status === 403) notePass(`رفض البصمة أثناء إجازة (${r.data?.error ?? ""})`);
  else noteIssue("سمح بالبصمة أثناء إجازة معتمدة!", { status: r.status, body: r.data });
}

async function step10_holidaysImport() {
  section("10. استيراد عطل من تقويم أم القرى");
  // try import for next year (2027 — unknown to static table)
  const r = await api("POST", "/api/holidays", { importDefaults: true, year: 2027 }, [200, 201, 409]);
  if (r.status === 409) notePass("الاستيراد رفض التكرار (موجود مسبقاً)");
  else if (r.ok) {
    notePass(`استيراد ${r.data.count} عطلة لـ 2027 — مصدر: ${r.data.source}`);
  } else noteIssue("فشل استيراد العطل", { status: r.status, body: r.data });
}

async function step11_branding() {
  section("11. تعديل الهوية البصرية");
  const r = await api("POST", "/api/settings/branding", {
    displayName: "[SIM] شركة المحاكاة",
    primaryColor: "#10b981",
    commercialReg: "1234567890",
    taxNumber: "300000000003",
    address: "الرياض",
    phone: "+966500000000",
    email: "info@sim.local",
  });
  if (r.ok) notePass("تعديل الهوية البصرية (بعد إلغاء الخطط)");
  else noteIssue("فشل حفظ الهوية البصرية", { status: r.status, body: r.data });
}

async function step12_fetchAttendanceList(emp) {
  if (!emp) return;
  section("12. عرض جدول الحضور (شهر/سنة)");
  const now = new Date();
  const r = await api("GET", `/api/attendance?month=${now.getMonth() + 1}&year=${now.getFullYear()}&all=1`);
  if (!r.ok) return noteIssue("فشل جلب الحضور", { status: r.status });
  const records = r.data?.data ?? [];
  const holidays = r.data?.holidays ?? [];
  notePass(`جلب ${records.length} سجل حضور + ${holidays.length} عطلة`);
}

async function step13_fetchSalaries() {
  section("13. جلب الرواتب");
  const r = await api("GET", `/api/salaries?year=2026&month=3`);
  if (r.ok) notePass(`جلب رواتب مارس (${Array.isArray(r.data) ? r.data.length : '?'} سجل)`);
  else noteIssue("فشل جلب الرواتب", { status: r.status });
}

async function step14_fetchReports() {
  section("14. التقارير");
  const r = await api("GET", "/api/reports?type=attendance&month=3&year=2026");
  if (r.ok) notePass("جلب تقرير الحضور");
  else noteIssue("فشل تقرير الحضور", { status: r.status, body: r.data });
}

async function step15_announcement() {
  section("15. إضافة إعلان");
  const r = await api("POST", "/api/announcements", {
    title: "إعلان محاكاة",
    content: "نص اختبار",
    scope: "company",
    priority: "normal",
  });
  if (r.ok) notePass("إضافة إعلان");
  else noteIssue("فشل إضافة إعلان", { status: r.status, body: r.data });
}

async function step16_evaluation(emp) {
  if (!emp) return;
  section("16. تقييم أداء");
  const r = await api("POST", "/api/evaluations", {
    employeeId: emp.id,
    period: "Q2",
    year: 2026,
    score: 4.3,
    grade: "جيد جداً",
    strengths: "اختبار",
    improvements: "اختبار",
  });
  if (r.ok) notePass("إنشاء تقييم");
  else noteIssue("فشل إنشاء تقييم", { status: r.status, body: r.data });
}

async function step17_deleteTestEmployee(emp) {
  if (!emp) return;
  section("17. حذف موظف الاختبار");
  // أولاً بدون force — يجب أن يرفض (لأن أضفنا سجلات)
  const guard = await api("DELETE", `/api/employees/${emp.id}`, undefined, [409]);
  if (guard.status === 409) notePass(`رفض الحذف بدون force (${guard.data?.error ?? ""})`);
  else noteIssue("لم يرفض حذف موظف عنده سجلات", { status: guard.status, body: guard.data });
  // ثم force=1 للحذف الكامل
  const r = await api("DELETE", `/api/employees/${emp.id}?force=1`);
  if (r.ok) notePass(`حذف الموظف مع ${r.data?.removedReferences ?? 0} سجل مرتبط`);
  else noteIssue("فشل حذف الموظف force", { status: r.status, body: r.data });
}

// ── Run ──────────────────────────────────────────────────
(async () => {
  console.log("════════════════════════════════════════");
  console.log("MawaridX — System Exercise Run");
  console.log(`Base: ${BASE}`);
  console.log(`User: ${EMAIL}`);
  console.log("════════════════════════════════════════");

  await step01_login();
  if (!cookieJar) { console.log("\n⛔ توقف: ما قدرت أسجل دخول."); process.exit(1); }

  await step02_fetchEmployees();
  const newEmp = await step03_addEmployee();
  await step04_editEmployee(newEmp);
  await step05_addAttendance_normalDay(newEmp);
  await step06_addAttendance_onHoliday(newEmp);
  await step07_addAttendance_onWeekend(newEmp);
  const leave = await step08_addLeave(newEmp);
  await step09_attendanceDuringLeave(newEmp, leave);
  await step10_holidaysImport();
  await step11_branding();
  await step12_fetchAttendanceList(newEmp);
  await step13_fetchSalaries();
  await step14_fetchReports();
  await step15_announcement();
  await step16_evaluation(newEmp);
  await step17_deleteTestEmployee(newEmp);

  console.log("\n════════ النتيجة ════════");
  console.log(`✅ نجحت: ${passes.length}`);
  console.log(`❌ مشاكل: ${issues.length}`);
  if (issues.length) {
    console.log("\nقائمة المشاكل:");
    for (const i of issues) {
      console.log("  •", i.label, i.info ? "→ " + JSON.stringify(i.info).slice(0, 220) : "");
    }
  }
})();
