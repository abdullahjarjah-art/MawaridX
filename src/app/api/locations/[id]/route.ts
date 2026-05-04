import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // v2
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  try {
    const location = await prisma.workLocation.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? undefined,
        description: "description" in body ? (body.description || null) : undefined,
        address: "address" in body ? (body.address || null) : undefined,
        deviceId: "deviceId" in body ? (body.deviceId || null) : undefined,
        latitude: "latitude" in body ? (body.latitude ?? null) : undefined,
        longitude: "longitude" in body ? (body.longitude ?? null) : undefined,
        radius: body.radius ?? undefined,
        active: body.active ?? undefined,
      },
    });
    return NextResponse.json(location);
  } catch (e: any) {
    console.error("PUT /api/locations/[id]:", e);
    return NextResponse.json({ error: e?.message ?? "خطأ في قاعدة البيانات" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.employee.updateMany({ where: { workLocationId: id }, data: { workLocationId: null } });
  await prisma.workLocation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
