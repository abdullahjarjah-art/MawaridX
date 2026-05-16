#!/usr/bin/env node
/**
 * Exercise role-based access, manager hierarchy, and approval flows.
 *
 * Scenarios:
 *  A) HR creates a manager and an employee — links employee.managerId
 *  B) Employee logs in and submits leave (status pending)
 *  C) Employee tries HR-only endpoints — must be rejected (403)
 *  D) Manager logs in → approves to manager_approved
 *  E) HR logs in → final approval = approved
 *  F) Reject path: employee submits another leave → manager rejects
 *  G) Permission boundaries: employee can't see other employee data
 *
 * Run: node scripts/exercise-roles.mjs
 */

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";
const HR_EMAIL = "hr@company.com";
const HR_PASS  = "Admin@123";

const dbPath = "data/hr.db";

// ── Cookie-aware fetch ───────────────────────────────────
function makeClient() {
  let jar = "";
  return {
    get cookies() { return jar; },
    reset() { jar = ""; },
    async req(method, path, body, expect = [200, 201]) {
      const headers = { "Content-Type": "application/json" };
      if (jar) headers.Cookie = jar;
      const res = await fetch(BASE + path, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
      });
      const setC = res.headers.getSetCookie?.() ?? [];
      for (const c of setC) {
        const kv = c.split(";")[0];
        const name = kv.split("=")[0];
        if (!jar.includes(name + "=")) jar += (jar ? "; " : "") + kv;
        else jar = jar.replace(new RegExp(name + "=[^;]*"), kv);
      }
      const ct = res.headers.get("content-type") ?? "";
      let data;
      if (ct.includes("application/json")) { try { data = await res.json(); } catch { data = null; } }
      else { try { data = await res.text(); } catch { data = null; } }
      return { status: res.status, ok: expect.includes(res.status), data };
    },
  };
}

const issues = [];
const passes = [];
const noteIssue = (label, info) => { issues.push({ label, info }); console.log("  ❌", label, info ? "→ " + JSON.stringify(info).slice(0, 220) : ""); };
const notePass  = (label) => { passes.push(label); console.log("  ✅", label); };
const section   = (title) => console.log("\n── " + title + " ──");

// ── Set up test cast directly in DB ──────────────────────
function setupCast() {
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  const now = new Date().toISOString();

  // Clean previous role-test artifacts
  db.prepare("DELETE FROM Attendance WHERE employeeId IN (SELECT id FROM Employee WHERE employeeNumber LIKE 'ROL%')").run();
  db.prepare("DELETE FROM Leave      WHERE employeeId IN (SELECT id FROM Employee WHERE employeeNumber LIKE 'ROL%')").run();
  db.prepare("DELETE FROM Employee   WHERE employeeNumber LIKE 'ROL%'").run();
  db.prepare("DELETE FROM User       WHERE email LIKE 'rol%@test.local'").run();

  const cuid = () => "rol_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

  // Manager
  const mgrEmail = "rol_manager@test.local";
  const mgrPass  = "Manager@123";
  const mgrHash  = bcrypt.hashSync(mgrPass, 12);
  const mgrUserId = cuid();
  const mgrEmpId  = cuid();
  db.prepare("INSERT INTO User (id, email, password, role, createdAt, updatedAt) VALUES (?,?,?,?,?,?)")
    .run(mgrUserId, mgrEmail, mgrHash, "manager", now, now);
  db.prepare(`INSERT INTO Employee (id, employeeNumber, firstName, lastName, email, position, status, startDate, basicSalary, userId, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(mgrEmpId, "ROL001", "مدير", "الاختبار", mgrEmail, "manager", "active", now, 15000, mgrUserId, now, now);

  // Regular employee reporting to manager
  const empEmail = "rol_employee@test.local";
  const empPass  = "Employee@123";
  const empHash  = bcrypt.hashSync(empPass, 12);
  const empUserId = cuid();
  const empId     = cuid();
  db.prepare("INSERT INTO User (id, email, password, role, createdAt, updatedAt) VALUES (?,?,?,?,?,?)")
    .run(empUserId, empEmail, empHash, "employee", now, now);
  db.prepare(`INSERT INTO Employee (id, employeeNumber, firstName, lastName, email, position, status, startDate, basicSalary, userId, managerId, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(empId, "ROL002", "موظف", "تابع", empEmail, "employee", "active", now, 8000, empUserId, mgrEmpId, now, now);

  // Second employee (not reporting to our manager) — for isolation tests
  const otherEmail = "rol_other@test.local";
  const otherPass  = "Other@123";
  const otherHash  = bcrypt.hashSync(otherPass, 12);
  const otherUserId = cuid();
  const otherEmpId  = cuid();
  db.prepare("INSERT INTO User (id, email, password, role, createdAt, updatedAt) VALUES (?,?,?,?,?,?)")
    .run(otherUserId, otherEmail, otherHash, "employee", now, now);
  db.prepare(`INSERT INTO Employee (id, employeeNumber, firstName, lastName, email, position, status, startDate, basicSalary, userId, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(otherEmpId, "ROL003", "موظف", "آخر", otherEmail, "employee", "active", now, 8000, otherUserId, now, now);

  db.close();
  return {
    manager:  { email: mgrEmail,  pass: mgrPass,  empId: mgrEmpId,  userId: mgrUserId  },
    employee: { email: empEmail,  pass: empPass,  empId,            userId: empUserId  },
    other:    { email: otherEmail, pass: otherPass, empId: otherEmpId, userId: otherUserId },
  };
}

// ── Tests ────────────────────────────────────────────────
(async () => {
  console.log("════════════════════════════════════════");
  console.log("MawaridX — Roles, Hierarchy & Approvals");
  console.log("════════════════════════════════════════");

  const cast = setupCast();
  console.log(`Cast ready: manager=${cast.manager.empId}, employee=${cast.employee.empId} (reports to manager)`);

  const hr  = makeClient();
  const mgr = makeClient();
  const emp = makeClient();
  const other = makeClient();

  // ── A) Login each role ───────────────────────────────
  section("A) تسجيل الدخول لكل دور");
  {
    const r = await hr.req("POST", "/api/auth/login", { email: HR_EMAIL, password: HR_PASS });
    r.ok ? notePass("دخول HR") : noteIssue("فشل دخول HR", r.data);
  }
  {
    const r = await mgr.req("POST", "/api/auth/login", { email: cast.manager.email, password: cast.manager.pass });
    r.ok ? notePass("دخول المدير") : noteIssue("فشل دخول المدير", r.data);
  }
  {
    const r = await emp.req("POST", "/api/auth/login", { email: cast.employee.email, password: cast.employee.pass });
    r.ok ? notePass("دخول الموظف") : noteIssue("فشل دخول الموظف", r.data);
  }
  {
    const r = await other.req("POST", "/api/auth/login", { email: cast.other.email, password: cast.other.pass });
    r.ok ? notePass("دخول موظف آخر") : noteIssue("فشل دخول الموظف الآخر", r.data);
  }

  // ── debug: who does the API think we are? ──
  {
    const me = await emp.req("GET", "/api/auth/me");
    console.log("  emp session:", JSON.stringify(me.data));
  }

  // ── B) Permission boundaries ─────────────────────────
  section("B) حدود الصلاحيات");
  {
    // Employee tries to add another employee — must fail
    const r = await emp.req("POST", "/api/employees", {
      employeeNumber: "HACK001", firstName: "X", lastName: "Y", email: "x@y.z",
    }, [401, 403]);
    if (r.status === 403 || r.status === 401) notePass(`موظف عادي لا يقدر يضيف موظف (${r.status})`);
    else noteIssue("موظف عادي قدر يضيف موظف!", { status: r.status, body: r.data });
  }
  {
    // Employee tries to delete an employee
    const r = await emp.req("DELETE", `/api/employees/${cast.other.empId}`, undefined, [401, 403]);
    if (r.status === 403 || r.status === 401) notePass(`موظف لا يقدر يحذف غيره (${r.status})`);
    else noteIssue("موظف قدر يحذف موظف آخر!", { status: r.status });
  }
  {
    // Employee tries to create announcement (HR-only)
    const r = await emp.req("POST", "/api/announcements", { title: "تجربة", content: "نص" }, [401, 403]);
    if (r.status === 403 || r.status === 401) notePass(`موظف لا يقدر ينشر إعلان (${r.status})`);
    else noteIssue("موظف نشر إعلان!", { status: r.status });
  }
  {
    // Employee tries to update branding
    const r = await emp.req("POST", "/api/settings/branding", { displayName: "اختراق" }, [401, 403]);
    if (r.status === 403 || r.status === 401) notePass(`موظف لا يقدر يعدّل الهوية البصرية (${r.status})`);
    else noteIssue("موظف عدّل الهوية البصرية!", { status: r.status });
  }
  {
    // Employee tries to import holidays
    const r = await emp.req("POST", "/api/holidays", { importDefaults: true, year: 2028 }, [401, 403]);
    if (r.status === 403 || r.status === 401) notePass(`موظف لا يقدر يستورد عطل (${r.status})`);
    else noteIssue("موظف استورد عطل!", { status: r.status });
  }

  // ── C) Employee submits leave (pending) ──────────────
  section("C) الموظف يقدّم إجازة");
  let leaveId;
  {
    const start = new Date(); start.setDate(start.getDate() + 10); start.setHours(0,0,0,0);
    const end   = new Date(start); end.setDate(end.getDate() + 2);
    const r = await emp.req("POST", "/api/leaves", {
      employeeId: cast.employee.empId,
      type: "annual",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: 3,
      reason: "اختبار التراتبية",
    });
    if (r.ok && r.data?.id) {
      leaveId = r.data.id;
      notePass(`الموظف قدّم إجازة id=${leaveId} (status=${r.data.status ?? 'pending'})`);
    } else noteIssue("فشل تقديم إجازة", { status: r.status, body: r.data });
  }

  // ── D) Manager-only approval step ────────────────────
  section("D) موافقة المدير على إجازة موظفه");
  if (leaveId) {
    // Wrong actor first: HR can NOT do manager_approved (only manager step)?
    // Actually the API allows hr/admin/manager. Let's see — the API code says manager can do manager_approved.
    // Test: manager → manager_approved succeeds
    const r = await mgr.req("PUT", `/api/leaves/${leaveId}`, { status: "manager_approved" });
    if (r.ok) notePass("المدير وافق (manager_approved)");
    else noteIssue("المدير فشل في الموافقة", { status: r.status, body: r.data });
  }

  // ── E) HR final approval ─────────────────────────────
  section("E) HR يعتمد الإجازة النهائية");
  if (leaveId) {
    // Manager tries final approval — should fail (only HR/admin)
    const m = await mgr.req("PUT", `/api/leaves/${leaveId}`, { status: "approved" }, [400, 403]);
    if (m.status === 403 || m.status === 400) notePass(`المدير لا يقدر يعمل approval نهائي (${m.status})`);
    else noteIssue("المدير قدر يعتمد نهائياً!", { status: m.status });

    const r = await hr.req("PUT", `/api/leaves/${leaveId}`, { status: "approved" });
    if (r.ok) notePass("HR اعتمد الإجازة نهائياً");
    else noteIssue("HR فشل في الاعتماد النهائي", { status: r.status, body: r.data });
  }

  // ── F) Reject path ───────────────────────────────────
  section("F) مسار الرفض");
  let leaveRejectId;
  {
    const start = new Date(); start.setDate(start.getDate() + 20);
    const end   = new Date(start); end.setDate(end.getDate() + 1);
    const r = await emp.req("POST", "/api/leaves", {
      employeeId: cast.employee.empId,
      type: "emergency",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: 2,
      reason: "للرفض",
    });
    leaveRejectId = r.data?.id;
  }
  if (leaveRejectId) {
    const r = await mgr.req("PUT", `/api/leaves/${leaveRejectId}`, { status: "rejected", notes: "غير موافق" });
    if (r.ok) notePass("المدير رفض الإجازة");
    else noteIssue("فشل رفض الإجازة", { status: r.status, body: r.data });
  }

  // ── G) Cross-tenant data isolation ───────────────────
  section("G) عزل بيانات الموظفين");
  {
    // Employee tries to PATCH another employee's record
    const r = await emp.req("PATCH", `/api/employees/${cast.other.empId}`, { phone: "999" }, [401, 403]);
    if (r.status === 403 || r.status === 401) notePass(`موظف لا يقدر يعدّل بيانات موظف آخر (${r.status})`);
    else noteIssue("موظف عدّل بيانات موظف آخر!", { status: r.status, body: r.data });
  }
  {
    // Employee tries to submit a leave FOR another employee
    const start = new Date(); start.setDate(start.getDate() + 30);
    const end   = new Date(start); end.setDate(end.getDate() + 1);
    const r = await emp.req("POST", "/api/leaves", {
      employeeId: cast.other.empId,           // ← يحاول لشخص آخر
      type: "annual",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: 2,
    }, [200, 201, 401, 403]);
    if (r.status === 403 || r.status === 401) {
      notePass(`موظف لا يقدر يقدّم إجازة لغيره (${r.status})`);
    } else if (r.ok && r.data?.employeeId === cast.employee.empId) {
      notePass(`النظام حوّل الإجازة تلقائيًا لصاحب الجلسة (تجاهل employeeId المُمرَّر)`);
    } else if (r.ok) {
      noteIssue("⚠️ موظف قدر يقدّم إجازة لموظف آخر!", { leaveId: r.data?.id, employeeId: r.data?.employeeId });
    }
  }

  // ── H) Manager scope: can manager approve OTHER manager's reports? ──
  section("H) نطاق المدير");
  // Create another employee NOT reporting to our manager, and a leave for them.
  // The current manager should NOT be able to approve it (depends on API enforcement)
  let leaveOtherId;
  {
    const start = new Date(); start.setDate(start.getDate() + 40);
    const end   = new Date(start); end.setDate(end.getDate() + 1);
    const r = await other.req("POST", "/api/leaves", {
      employeeId: cast.other.empId,
      type: "annual",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: 2,
    });
    leaveOtherId = r.data?.id;
  }
  if (leaveOtherId) {
    const r = await mgr.req("PUT", `/api/leaves/${leaveOtherId}`, { status: "manager_approved" }, [200, 201, 403]);
    if (r.status === 403) notePass("المدير لا يقدر يعتمد إجازة موظف ليس تحته");
    else if (r.ok) noteIssue("⚠️ المدير اعتمد إجازة موظف ليس تحت إدارته!", { status: r.status });
  }

  console.log("\n════════ النتيجة ════════");
  console.log(`✅ نجحت: ${passes.length}`);
  console.log(`❌ مشاكل: ${issues.length}`);
  if (issues.length) {
    console.log("\nقائمة المشاكل:");
    for (const i of issues) console.log("  •", i.label, i.info ? "→ " + JSON.stringify(i.info).slice(0, 240) : "");
  }
})();
