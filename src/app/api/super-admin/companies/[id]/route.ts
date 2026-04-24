import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";

// GET /api/super-admin/companies/[id] - تفاصيل شركة
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }
  return NextResponse.json(company);
}

// PATCH /api/super-admin/companies/[id] - تعديل شركة
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.res;

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      adminName,
      phone,
      commercialReg,
      plan,
      maxEmployees,
      status,
      notes,
      expiresAt,
    } = body;

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(adminName !== undefined && { adminName }),
        ...(phone !== undefined && { phone }),
        ...(commercialReg !== undefined && { commercialReg }),
        ...(plan !== undefined && { plan }),
        ...(maxEmployees !== undefined && { maxEmployees: Number(maxEmployees) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update company error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء التحديث" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/companies/[id] - حذف شركة
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.res;

  try {
    const { id } = await params;
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
    }

    // حذف حساب الأدمن الخاص بالشركة
    await prisma.user.deleteMany({
      where: { email: company.adminEmail },
    });

    // حذف الشركة
    await prisma.company.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete company error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء الحذف" },
      { status: 500 }
    );
  }
}
