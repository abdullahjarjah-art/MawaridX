#!/usr/bin/env node
/**
 * Clean attendance conflicts in existing data:
 *   - punches on official holidays
 *   - punches on approved leave days
 *   - punches on Friday/Saturday for employees without a shift
 *   - rows where checkOut < checkIn (fix or remove)
 *
 * Run:   node scripts/clean-conflicts.mjs --dry     # show what would change
 *        node scripts/clean-conflicts.mjs           # actually delete/fix
 */

import Database from "better-sqlite3";
import { resolve } from "node:path";

const db = new Database(resolve(process.cwd(), "data/hr.db"));
db.pragma("foreign_keys = ON");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");

function localDow(ts) { return new Date(ts).getDay(); }

console.log(DRY ? "── DRY RUN — لن يُغيَّر شيء ──" : "── تطبيق التنظيف ──");

// ── 1) Punches on official holidays
const holidayDates = new Set(
  db.prepare("SELECT date FROM Holiday").all().map(h => h.date.slice(0, 10)),
);
const allAtt = db.prepare("SELECT id, date FROM Attendance").all();
const onHolidayIds = allAtt
  .filter(a => holidayDates.has(new Date(a.date).toISOString().slice(0, 10)))
  .map(a => a.id);
console.log(`بصمات في عطل رسمية: ${onHolidayIds.length}`);

// ── 2) Punches on approved leave days
const leaveSpans = db.prepare("SELECT employeeId, startDate, endDate FROM Leave WHERE status = 'approved'").all();
const onLeaveIds = [];
for (const a of db.prepare("SELECT id, employeeId, date FROM Attendance").all()) {
  const d = new Date(a.date);
  for (const lv of leaveSpans) {
    if (lv.employeeId !== a.employeeId) continue;
    if (d >= new Date(lv.startDate) && d <= new Date(lv.endDate)) {
      onLeaveIds.push(a.id);
      break;
    }
  }
}
console.log(`بصمات أثناء إجازات معتمدة: ${onLeaveIds.length}`);

// ── 3) Punches on Fri/Sat for employees without a shift
const shiftedEmpIds = new Set(
  db.prepare("SELECT DISTINCT employeeId FROM EmployeeShift WHERE endDate IS NULL").all().map(r => r.employeeId),
);
const onWeekendIds = allAtt
  .filter(a => {
    const dow = localDow(a.date);
    if (dow !== 5 && dow !== 6) return false;
    // skip if employee has a shift (the shift defines workdays)
    return !shiftedEmpIds.has(a.__employeeId);
  })
  .map(a => a.id);
// re-query with employeeId since we missed it above
const wkRows = db.prepare("SELECT id, employeeId, date FROM Attendance").all();
const onWeekendIdsFixed = wkRows
  .filter(a => {
    const dow = localDow(a.date);
    if (dow !== 5 && dow !== 6) return false;
    return !shiftedEmpIds.has(a.employeeId);
  })
  .map(a => a.id);
console.log(`بصمات الجمعة/السبت لموظفين بلا شيفت: ${onWeekendIdsFixed.length}`);

// ── 4) checkOut < checkIn
const reversed = db.prepare("SELECT id, checkIn, checkOut FROM Attendance WHERE checkIn IS NOT NULL AND checkOut IS NOT NULL AND checkOut < checkIn").all();
console.log(`سجلات بخروج قبل الدخول: ${reversed.length}`);

if (DRY) {
  console.log("\n(dry run — لم يتم التطبيق. أعد التشغيل بدون --dry)");
  db.close();
  process.exit(0);
}

// ── Apply deletes/fixes
const toDelete = new Set([...onHolidayIds, ...onLeaveIds, ...onWeekendIdsFixed]);
const delStmt = db.prepare("DELETE FROM Attendance WHERE id = ?");
db.transaction(() => {
  for (const id of toDelete) delStmt.run(id);
})();
console.log(`✅ حُذفت ${toDelete.size} بصمة (عطل/إجازات/ويك إند)`);

// fix reversed: swap checkIn and checkOut
const swapStmt = db.prepare("UPDATE Attendance SET checkIn = ?, checkOut = ? WHERE id = ?");
let swapped = 0;
db.transaction(() => {
  for (const r of reversed) {
    swapStmt.run(r.checkOut, r.checkIn, r.id);
    swapped++;
  }
})();
console.log(`✅ صُحّحت ${swapped} سجل (بدّلنا الدخول والخروج)`);

db.close();
console.log("\nانتهى التنظيف.");
