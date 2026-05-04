-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "details" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "amount" REAL,
    "returnDate" DATETIME,
    "exitTime" DATETIME,
    "returnTime" DATETIME,
    "managerId" TEXT,
    "managerNote" TEXT,
    "managerAt" DATETIME,
    "hrNote" TEXT,
    "hrAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
