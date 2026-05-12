import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const device = await prisma.fingerprintDevice.findUnique({
    where: { id },
    include: { location: { select: { id: true, name: true } } },
  });
  if (!device) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(device);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const device = await prisma.fingerprintDevice.update({
    where: { id },
    data: {
      name: body.name,
      ip: body.ip,
      port: Number(body.port) || 4370,
      serial: body.serial || null,
      password: Number(body.password) || 0,
      locationId: body.locationId || null,
      mode: body.mode || "tcp",
      admsKey: body.admsKey || null,
      active: body.active ?? true,
    },
    include: { location: { select: { id: true, name: true } } },
  });
  return NextResponse.json(device);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  await prisma.fingerprintDevice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
