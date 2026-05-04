import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const locations = await prisma.workLocation.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { name, description, address, deviceId, latitude, longitude, radius } = body;
  if (!name?.trim()) return NextResponse.json({ error: "اسم الموقع مطلوب" }, { status: 400 });
  const location = await prisma.workLocation.create({
    data: {
      name: name.trim(),
      description: description || null,
      address: address || null,
      deviceId: deviceId || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      radius: radius ?? 200,
    },
  });
  return NextResponse.json(location);
}
