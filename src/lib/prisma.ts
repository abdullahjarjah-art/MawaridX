import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

// DATABASE_URL=file:./data/hr.db في Docker (يتجنب مشكلة volume يغطي /app/prisma)
// في dev: لا يوجد DATABASE_URL → fallback إلى data/hr.db
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) {
    const rel = url.slice("file:".length);
    return path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  }
  return path.join(process.cwd(), "data", "hr.db");
}

const dbPath = resolveDbPath();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
