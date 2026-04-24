import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const active = searchParams.get("active");
    const all = searchParams.get("all"); // all=1 يجلب كل الإعلانات (لواجهة HR)

    const conditions: Record<string, unknown>[] = [];
    if (active === "1") conditions.push({ active: true });

    // فلتر النطاق: إلا إذا طُلب الكل (HR admin)
    if (!all) {
      if (department) {
        // موظف عنده قسم: يشوف إعلانات الشركة + إعلانات قسمه
        conditions.push({
          OR: [
            { scope: "company" },
            { scope: "department", department },
          ],
        });
      } else {
        // موظف بدون قسم: يشوف إعلانات الشركة العامة فقط
        conditions.push({ scope: "company" });
      }
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(announcements);
  } catch (err) {
    console.error("Get announcements error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = await req.json();
    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        content: body.content,
        scope: body.scope ?? "company",
        department: body.scope === "department" ? body.department : null,
        authorId: body.authorId,
        authorName: body.authorName,
        priority: body.priority ?? "normal",
      },
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    console.error("Create announcement error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الإعلان" }, { status: 500 });
  }
}
