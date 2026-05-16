#!/usr/bin/env node
/**
 * Simulate a Saudi HR company using MawaridX from Jan 1 → today.
 *
 * Creates: 15 employees, 1 department, 1 location, 1 shift,
 * full daily attendance (with realistic late/absent variance),
 * leaves (annual / sick / emergency), monthly salaries, evaluations,
 * announcements, and a few requests.
 *
 * Run:   node scripts/simulate-year.mjs              # add simulation
 *        node scripts/simulate-year.mjs --reset      # delete prior simulation + re-seed
 *        node scripts/simulate-year.mjs --clean      # delete simulation only
 *
 * Simulated rows are tagged so they can be cleaned up:
 *   - Employee.employeeNumber starts with "SIM"
 *   - Setting.key === "sim_marker_<id>"
 */

import Database from "better-sqlite3";
import { resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), "data/hr.db");
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const args = new Set(process.argv.slice(2));
const MODE_RESET = args.has("--reset");
const MODE_CLEAN_ONLY = args.has("--clean");

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const cuid = () => "sim_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const iso = (d) => new Date(d).toISOString();
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

const today = new Date();
today.setHours(0, 0, 0, 0);
const yearStart = new Date(today.getFullYear(), 0, 1);

const firstNames = ["أحمد", "خالد", "محمد", "عبدالله", "سعد", "فهد", "نواف", "ماجد", "سلطان", "بدر", "ريم", "نوره", "سارة", "هند", "منى", "أمل", "لينا", "دانا"];
const lastNames  = ["العنزي", "الحربي", "الشهري", "القحطاني", "الزهراني", "الغامدي", "العتيبي", "الدوسري", "البقمي", "الشمري", "المطيري"];
const jobs       = ["مهندس برمجيات", "محاسب", "موظف موارد بشرية", "مسؤول مبيعات", "مدير مشروع", "محلل أعمال", "موظف خدمة عملاء", "موظف تسويق"];
const titlesAr   = ["م. ", "أ. "];

function dayName(d) {
  return ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"][new Date(d).getDay()];
}

function* eachDay(from, to) {
  const cur = new Date(from);
  cur.setHours(0,0,0,0);
  const end = new Date(to);
  end.setHours(0,0,0,0);
  while (cur <= end) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

function timeOn(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}

// ──────────────────────────────────────────────────────────
// Cleanup prior simulation rows
// ──────────────────────────────────────────────────────────
function cleanSimulation() {
  // Find SIM employees
  const empRows = db.prepare("SELECT id FROM Employee WHERE employeeNumber LIKE 'SIM%'").all();
  const empIds = empRows.map(r => r.id);
  if (empIds.length === 0) {
    console.log("[clean] no SIM employees found.");
    return;
  }
  const placeholders = empIds.map(() => "?").join(",");
  const tables = ["Attendance","Leave","Salary","Evaluation","Request","EmployeeShift","EmployeeWorkLocation"];
  for (const t of tables) {
    try {
      const r = db.prepare(`DELETE FROM ${t} WHERE employeeId IN (${placeholders})`).run(...empIds);
      console.log(`[clean] ${t}: ${r.changes} rows`);
    } catch (e) { console.log(`[clean] skip ${t}: ${e.message}`); }
  }
  // Delete announcements/notifications authored by SIM
  try { db.prepare("DELETE FROM Announcement WHERE authorName LIKE '[SIM]%'").run(); } catch {}
  try { db.prepare("DELETE FROM Notification WHERE userId IN ("+ placeholders +")").run(...empIds); } catch {}
  // Finally remove employees and their users (matched by email pattern)
  const emails = db.prepare(`SELECT email FROM Employee WHERE id IN (${placeholders})`).all(...empIds).map(r => r.email);
  for (const e of emails) {
    try { db.prepare("DELETE FROM User WHERE email = ?").run(e); } catch {}
  }
  db.prepare(`DELETE FROM Employee WHERE id IN (${placeholders})`).run(...empIds);
  // Department / Shift / Location if they were SIM-created
  try { db.prepare("DELETE FROM Shift WHERE name LIKE '[SIM]%'").run(); } catch {}
  try { db.prepare("DELETE FROM WorkLocation WHERE name LIKE '[SIM]%'").run(); } catch {}
  try { db.prepare("DELETE FROM Department WHERE name LIKE '[SIM]%'").run(); } catch {}
  console.log(`[clean] removed ${empIds.length} SIM employees and related rows.`);
}

if (MODE_CLEAN_ONLY || MODE_RESET) {
  cleanSimulation();
  if (MODE_CLEAN_ONLY) { db.close(); process.exit(0); }
}

// ──────────────────────────────────────────────────────────
// 1) Department + Shift + WorkLocation
// ──────────────────────────────────────────────────────────
const deptName = "[SIM] العمليات";
let dept = db.prepare("SELECT id FROM Department WHERE name = ?").get(deptName);
if (!dept) {
  const id = cuid();
  db.prepare("INSERT INTO Department (id, name, description, createdAt, updatedAt) VALUES (?,?,?,?,?)")
    .run(id, deptName, "قسم محاكاة", iso(yearStart), iso(today));
  dept = { id };
}
console.log("[seed] department:", deptName);

const shiftName = "[SIM] الدوام الصباحي";
let shift = db.prepare("SELECT id FROM Shift WHERE name = ?").get(shiftName);
if (!shift) {
  const id = cuid();
  db.prepare(`INSERT INTO Shift (id, name, checkInTime, checkOutTime, breakMinutes, workDays, color, isActive, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, shiftName, "08:00", "17:00", 60, "0,1,2,3,4", "#0284c7", 1, iso(yearStart), iso(today));
  shift = { id };
}
console.log("[seed] shift:", shiftName, "(Sun–Thu, 08:00–17:00)");

const locName = "[SIM] المقر الرئيسي - الرياض";
let loc = db.prepare("SELECT id FROM WorkLocation WHERE name = ?").get(locName);
if (!loc) {
  const id = cuid();
  db.prepare(`INSERT INTO WorkLocation (id, name, description, address, latitude, longitude, radius, active, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, locName, "المقر الرئيسي", "الرياض، حي العليا", 24.7136, 46.6753, 250, 1, iso(yearStart), iso(today));
  loc = { id };
}
console.log("[seed] location:", locName);

// ──────────────────────────────────────────────────────────
// 2) 15 Employees
// ──────────────────────────────────────────────────────────
const EMP_COUNT = 15;
const employees = [];
for (let i = 1; i <= EMP_COUNT; i++) {
  const num = `SIM${String(i).padStart(4, "0")}`;
  const existing = db.prepare("SELECT id FROM Employee WHERE employeeNumber = ?").get(num);
  if (existing) { employees.push({ id: existing.id, employeeNumber: num }); continue; }

  const first = pick(firstNames);
  const last = pick(lastNames);
  const email = `${num.toLowerCase()}@sim.mawaridx.com`;
  const id = cuid();
  const startDate = new Date(yearStart);
  startDate.setDate(startDate.getDate() - Math.floor(rnd(0, 365)));

  const basic = Math.round(rnd(5000, 18000));
  const housing = Math.round(basic * 0.25);
  const transport = Math.round(rnd(400, 800));
  db.prepare(`INSERT INTO Employee
    (id, employeeNumber, firstName, lastName, arabicName, email, phone, nationalId,
     jobTitle, position, department, employmentType, startDate, status, workLocationId,
     basicSalary, housingAllowance, transportAllowance, otherAllowance,
     nationality, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      id, num, first, last, `${first} ${last}`, email,
      `+9665${Math.floor(rnd(10000000, 99999999))}`,
      `1${Math.floor(rnd(100000000, 999999999))}`,
      pick(jobs), "employee", deptName,
      "full_time", iso(startDate), "active", loc.id,
      basic, housing, transport, 0,
      pick(["سعودي","سعودي","سعودي","مصري","سوداني"]),
      iso(startDate), iso(today),
    );

  // Link shift
  try {
    db.prepare(`INSERT INTO EmployeeShift (id, employeeId, shiftId, startDate, createdAt) VALUES (?,?,?,?,?)`)
      .run(cuid(), id, shift.id, iso(startDate), iso(today));
  } catch {}

  employees.push({ id, employeeNumber: num, firstName: first, lastName: last, startDate });
}
console.log(`[seed] employees: ${employees.length}`);

// ──────────────────────────────────────────────────────────
// 3) Holidays — already in DB; load them for skipping
// ──────────────────────────────────────────────────────────
const holidaySet = new Set(
  db.prepare("SELECT date FROM Holiday WHERE date >= ? AND date <= ?")
    .all(iso(yearStart), iso(today))
    .map(h => h.date.slice(0, 10)),
);
console.log(`[seed] holidays loaded: ${holidaySet.size}`);

// ──────────────────────────────────────────────────────────
// 4) Leaves — 2 per employee on average, mixed statuses
// ──────────────────────────────────────────────────────────
const leaveTypes = ["annual","sick","emergency","unpaid"];
let leavesCreated = 0;
const leavesByEmp = new Map(); // emp → array of {start, end}
for (const emp of employees) {
  leavesByEmp.set(emp.id, []);
  const count = Math.random() < 0.5 ? 1 : 2;
  for (let n = 0; n < count; n++) {
    // pick random month Jan..currentMonth
    const month = Math.floor(rnd(0, today.getMonth() + 1));
    const startDay = Math.floor(rnd(1, 25));
    const days = Math.floor(rnd(1, 5));
    const start = new Date(today.getFullYear(), month, startDay);
    const end = new Date(start); end.setDate(end.getDate() + days - 1);
    if (end > today) continue;
    const type = pick(leaveTypes);
    // status: 70% approved, 15% pending, 15% rejected
    const r = Math.random();
    const status = r < 0.7 ? "approved" : r < 0.85 ? "pending" : "rejected";
    const id = cuid();
    try {
      db.prepare(`INSERT INTO Leave
        (id, employeeId, type, startDate, endDate, days, reason, status, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, emp.id, type, iso(start), iso(end), days, "محاكاة", status, iso(start), iso(end));
      leavesCreated++;
      if (status === "approved") leavesByEmp.get(emp.id).push({ start, end });
    } catch {}
  }
}
console.log(`[seed] leaves: ${leavesCreated}`);

// ──────────────────────────────────────────────────────────
// 5) Daily Attendance — Jan 1 → today, skipping weekends/holidays/leaves
// ──────────────────────────────────────────────────────────
let attCreated = 0, attSkipped = 0;
for (const emp of employees) {
  const empStart = emp.startDate ?? yearStart;
  const startFrom = empStart > yearStart ? new Date(empStart) : yearStart;
  startFrom.setHours(0,0,0,0);
  const empLeaves = leavesByEmp.get(emp.id) ?? [];

  for (const d of eachDay(startFrom, today)) {
    const dow = d.getDay();
    if (dow === 5 || dow === 6) { attSkipped++; continue; } // weekend
    const iso10 = d.toISOString().slice(0, 10);
    if (holidaySet.has(iso10)) { attSkipped++; continue; }
    if (empLeaves.some(l => d >= l.start && d <= l.end)) { attSkipped++; continue; }

    // 5% absent (no record)
    if (chance(0.05)) { attSkipped++; continue; }

    // Check-in around 08:00, mostly within tolerance
    const lateRoll = Math.random();
    let checkInHour = 8, checkInMin = Math.floor(rnd(-5, 14));
    let status = "present";
    if (lateRoll < 0.15) { // late
      checkInMin = Math.floor(rnd(20, 50));
      status = "late";
    } else if (lateRoll < 0.18) { // half day
      checkInHour = Math.floor(rnd(12, 13));
      checkInMin = Math.floor(rnd(0, 59));
      status = "half_day";
    }
    if (checkInMin < 0) { checkInHour = 7; checkInMin = 60 + checkInMin; }
    const ci = timeOn(d, checkInHour, checkInMin);
    // Check-out around 17:00, sometimes with overtime
    const overtime = chance(0.20) ? Math.floor(rnd(30, 150)) : 0;
    const co = timeOn(d, 17, 0);
    co.setMinutes(co.getMinutes() + overtime);
    if (status === "half_day") {
      co.setHours(ci.getHours() + 4);
      co.setMinutes(ci.getMinutes());
    }

    const workMs = co - ci - 60 * 60 * 1000; // minus 60 min break
    const workHours = +(Math.max(0, workMs / 3600000)).toFixed(2);

    try {
      db.prepare(`INSERT INTO Attendance
        (id, employeeId, date, checkIn, checkOut, status, workHours, overtimeMinutes,
         workLocationId, checkInLocationId, checkOutLocationId, source, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(
          cuid(), emp.id, iso(d), iso(ci), iso(co),
          status, workHours, overtime,
          loc.id, loc.id, loc.id, "fingerprint",
          iso(d), iso(d),
        );
      attCreated++;
    } catch (e) { if (attCreated < 1) console.log("[ERR att]", e.message); }
  }
}
console.log(`[seed] attendance: ${attCreated} created (${attSkipped} skipped: weekends/holidays/leaves/absent)`);

// ──────────────────────────────────────────────────────────
// 6) Salaries — monthly Jan → last completed month
// ──────────────────────────────────────────────────────────
let salariesCreated = 0;
const lastMonthCompleted = today.getMonth(); // current month is in-progress, so we pay Jan..(month-1)
for (const emp of employees) {
  const empRow = db.prepare("SELECT basicSalary, housingAllowance, transportAllowance, otherAllowance FROM Employee WHERE id = ?").get(emp.id);
  const basic = empRow.basicSalary ?? 8000;
  const allow = (empRow.housingAllowance ?? 0) + (empRow.transportAllowance ?? 0) + (empRow.otherAllowance ?? 0);
  for (let m = 0; m < lastMonthCompleted; m++) {
    const gosiEmp = +(basic * 0.09).toFixed(2);
    const bonus = chance(0.2) ? Math.round(rnd(200, 1500)) : 0;
    const deductions = chance(0.15) ? Math.round(rnd(50, 400)) : 0;
    const overtimePay = chance(0.3) ? Math.round(rnd(100, 800)) : 0;
    const net = +(basic + allow + bonus + overtimePay - deductions - gosiEmp).toFixed(2);
    try {
      db.prepare(`INSERT INTO Salary
        (id, employeeId, month, year, basicSalary, allowances, deductions, bonus, overtimePay,
         gosiEmployee, gosiEmployer, netSalary, status, paidAt, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(
          cuid(), emp.id, m + 1, today.getFullYear(),
          basic, allow, deductions, bonus, overtimePay,
          gosiEmp, gosiEmp, net,
          "paid", iso(new Date(today.getFullYear(), m + 1, 1)),
          iso(new Date(today.getFullYear(), m, 28)), iso(today),
        );
      salariesCreated++;
    } catch {}
  }
}
console.log(`[seed] salaries: ${salariesCreated}`);

// ──────────────────────────────────────────────────────────
// 7) Evaluations — Q1 for each employee
// ──────────────────────────────────────────────────────────
let evals = 0;
for (const emp of employees) {
  const score = +(rnd(3.2, 4.9)).toFixed(2);
  const grade = score >= 4.5 ? "ممتاز" : score >= 4 ? "جيد جداً" : score >= 3.5 ? "جيد" : "مقبول";
  try {
    db.prepare(`INSERT INTO Evaluation
      (id, employeeId, period, year, score, grade, strengths, improvements, status, createdAt, updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(cuid(), emp.id, "Q1", today.getFullYear(), score, grade,
        "التزام بالمواعيد، تعاون مع الفريق", "تطوير المهارات التقنية", "completed",
        iso(new Date(today.getFullYear(), 2, 31)), iso(today));
    evals++;
  } catch {}
}
console.log(`[seed] evaluations: ${evals}`);

// ──────────────────────────────────────────────────────────
// 8) Announcements
// ──────────────────────────────────────────────────────────
const announcements = [
  { title: "بداية العام الميلادي 2026", content: "نتمنى للجميع عاماً موفقاً!", priority: "normal" },
  { title: "اجتماع شهري", content: "اجتماع كل الأقسام يوم الأحد القادم 10ص", priority: "important" },
  { title: "تحديث نظام الحضور", content: "تم تفعيل بصمة الوجه على المدخل الرئيسي", priority: "important" },
  { title: "إجازة عيد الفطر", content: "عطلة العيد من 20 إلى 22 مارس", priority: "normal" },
];
let anns = 0;
for (const a of announcements) {
  try {
    db.prepare(`INSERT INTO Announcement (id, title, content, scope, authorId, authorName, priority, active, createdAt, updatedAt)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(cuid(), a.title, a.content, "company", "system",
        "[SIM] الموارد البشرية", a.priority, 1,
        iso(new Date(today.getFullYear(), Math.floor(rnd(0, today.getMonth())), 5)),
        iso(today));
    anns++;
  } catch {}
}
console.log(`[seed] announcements: ${anns}`);

// ──────────────────────────────────────────────────────────
// 9) Requests — a few sample requests
// ──────────────────────────────────────────────────────────
let reqs = 0;
const reqTypes = [
  { type: "letter", title: "طلب خطاب تعريف للسفارة" },
  { type: "attendance_fix", title: "تصحيح تسجيل حضور" },
  { type: "loan", title: "طلب سلفة شهرين" },
];
for (let n = 0; n < 6; n++) {
  const emp = pick(employees);
  const r = pick(reqTypes);
  try {
    db.prepare(`INSERT INTO Request (id, employeeId, type, status, title, details, createdAt, updatedAt)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(cuid(), emp.id, r.type, pick(["pending","approved","rejected"]),
        r.title, "طلب محاكاة",
        iso(new Date(today.getFullYear(), Math.floor(rnd(0, today.getMonth() + 1)), Math.floor(rnd(1, 28)))),
        iso(today));
    reqs++;
  } catch {}
}
console.log(`[seed] requests: ${reqs}`);

// ──────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────
console.log("\n──── Simulation complete ────");
console.log(`Period: ${yearStart.toISOString().slice(0,10)} → ${today.toISOString().slice(0,10)}`);
console.log(`Employees: ${employees.length}`);
console.log(`Attendance rows: ${attCreated}`);
console.log(`Leaves: ${leavesCreated}`);
console.log(`Salaries: ${salariesCreated}`);
console.log(`Evaluations: ${evals}`);
console.log(`Announcements: ${anns}`);
console.log(`Requests: ${reqs}`);
console.log(`\nCleanup: node scripts/simulate-year.mjs --clean`);

db.close();
