import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── GET: جلب المستندات (مع فلترة الصلاحيات للموظفين) ───
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category   = searchParams.get("category");
  const employeeId = searchParams.get("employeeId"); // للبوابة

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== "all") where.category = category;

  const docs = await prisma.companyDocument.findMany({
    where,
    include: { downloads: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  // فلترة بناءً على صلاحية الوصول إذا طُلب من بوابة الموظف
  if (employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { position: true, department: true },
    });
    const isManager = emp?.position === "manager" || emp?.position === "supervisor";

    const filtered = docs.filter(doc => {
      if (doc.accessLevel === "all") return true;
      if (doc.accessLevel === "managers") return isManager;
      if (doc.accessLevel === "department") {
        const depts: string[] = doc.accessDepts ? JSON.parse(doc.accessDepts) : [];
        return emp?.department && depts.includes(emp.department);
      }
      if (doc.accessLevel === "specific") {
        const ids: string[] = doc.accessEmployeeIds ? JSON.parse(doc.accessEmployeeIds) : [];
        return ids.includes(employeeId);
      }
      return false;
    });
    return NextResponse.json(filtered.map(d => ({ ...d, downloadCount: d.downloads.length })));
  }

  return NextResponse.json(docs.map(d => ({ ...d, downloadCount: d.downloads.length })));
}

// ─── POST: إنشاء مستند جديد (HR / admin فقط) ───
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.role !== "hr" && session.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });

  const doc = await prisma.companyDocument.create({
    data: {
      title:            body.title.trim(),
      description:      body.description || null,
      category:         body.category   || "other",
      fileUrl:          body.fileUrl    || null,
      fileName:         body.fileName   || null,
      fileSize:         body.fileSize   ? parseInt(body.fileSize) : null,
      fileType:         body.fileType   || null,
      accessLevel:      body.accessLevel || "all",
      accessDepts:      body.accessDepts      ? JSON.stringify(body.accessDepts)      : null,
      accessEmployeeIds: body.accessEmployeeIds ? JSON.stringify(body.accessEmployeeIds) : null,
      expiryDate:       body.expiryDate  ? new Date(body.expiryDate) : null,
      notifyDaysBefore: body.notifyDaysBefore ? parseInt(body.notifyDaysBefore) : 30,
      createdBy:        session.userId,
      creatorName:      body.creatorName || null,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
