import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { employeeId } = await params;
  const records = await prisma.employeeWorkLocation.findMany({
    where: { employeeId },
    include: { location: { select: { id: true, name: true, address: true, latitude: true, longitude: true, radius: true, active: true } } },
  });
  return NextResponse.json(records.map(r => r.location));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const session = await getSession();
  if (!session || !["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { employeeId } = await params;
  const { locationId } = await req.json();
  if (!locationId) return NextResponse.json({ error: "locationId مطلوب" }, { status: 400 });
  try {
    await prisma.employeeWorkLocation.create({
      data: { id: crypto.randomUUID(), employeeId, locationId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "الموقع مسجل مسبقاً" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const session = await getSession();
  if (!session || !["hr", "admin"].includes(session.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { employeeId } = await params;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  if (!locationId) return NextResponse.json({ error: "locationId مطلوب" }, { status: 400 });
  await prisma.employeeWorkLocation.deleteMany({ where: { employeeId, locationId } });
  return NextResponse.json({ success: true });
}
