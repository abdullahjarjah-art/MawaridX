import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const devices = await prisma.fingerprintDevice.findMany({
    include: { location: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devices);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const device = await prisma.fingerprintDevice.create({
    data: {
      name: body.name,
      ip: body.ip,
      port: Number(body.port) || 4370,
      serial: body.serial || null,
      password: Number(body.password) || 0,
      locationId: body.locationId || null,
      mode: body.mode || "tcp",
      admsKey: body.admsKey || null,
    },
    include: { location: { select: { id: true, name: true } } },
  });
  return NextResponse.json(device, { status: 201 });
}
