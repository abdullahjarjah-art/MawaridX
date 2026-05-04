-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "arabicName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "nationalId" TEXT,
    "birthDate" DATETIME,
    "gender" TEXT,
    "maritalStatus" TEXT,
    "address" TEXT,
    "city" TEXT,
    "photo" TEXT,
    "jobTitle" TEXT,
    "position" TEXT NOT NULL DEFAULT 'employee',
    "department" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'full_time',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("address", "arabicName", "basicSalary", "birthDate", "city", "createdAt", "department", "email", "employeeNumber", "employmentType", "endDate", "firstName", "gender", "id", "jobTitle", "lastName", "managerId", "maritalStatus", "nationalId", "phone", "photo", "startDate", "status", "updatedAt", "userId") SELECT "address", "arabicName", "basicSalary", "birthDate", "city", "createdAt", "department", "email", "employeeNumber", "employmentType", "endDate", "firstName", "gender", "id", "jobTitle", "lastName", "managerId", "maritalStatus", "nationalId", "phone", "photo", "startDate", "status", "updatedAt", "userId" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_nationalId_key" ON "Employee"("nationalId");
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
