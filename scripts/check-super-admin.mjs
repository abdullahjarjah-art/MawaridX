// Ensure super admin user exists in hr.db with a known password
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { randomBytes } from "crypto";

const EMAIL = "abdullah.j.arjah@gmail.com";
const PASSWORD = "SuperAdmin@123";

const dbPath = path.join(process.cwd(), "prisma", "hr.db");
const db = new Database(dbPath);

const existing = db.prepare("SELECT id, email, role FROM User WHERE email = ?").get(EMAIL);

const hash = await bcrypt.hash(PASSWORD, 10);

if (existing) {
  db.prepare("UPDATE User SET password = ?, role = 'ADMIN' WHERE email = ?").run(hash, EMAIL);
  console.log(`UPDATED existing user: ${EMAIL}`);
} else {
  const id = "c" + randomBytes(12).toString("hex");
  db.prepare(
    "INSERT INTO User (id, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, 'ADMIN', datetime('now'), datetime('now'))"
  ).run(id, EMAIL, hash);
  console.log(`CREATED user: ${EMAIL} (id: ${id})`);
}

console.log(`\nLogin credentials:`);
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  URL:      http://localhost:3000/login`);

db.close();
