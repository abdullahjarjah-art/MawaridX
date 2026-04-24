import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["geofence_lat", "geofence_lng", "geofence_radius", "geofence_name"] } },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (!map.geofence_lat) return NextResponse.json(null);

  return NextResponse.json({
    lat: parseFloat(map.geofence_lat),
    lng: parseFloat(map.geofence_lng),
    radius: parseInt(map.geofence_radius ?? "200"),
    name: map.geofence_name ?? "المكتب",
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { lat, lng, radius, name } = await req.json();

  await Promise.all([
    prisma.setting.upsert({ where: { key: "geofence_lat" }, create: { key: "geofence_lat", value: String(lat) }, update: { value: String(lat) } }),
    prisma.setting.upsert({ where: { key: "geofence_lng" }, create: { key: "geofence_lng", value: String(lng) }, update: { value: String(lng) } }),
    prisma.setting.upsert({ where: { key: "geofence_radius" }, create: { key: "geofence_radius", value: String(radius) }, update: { value: String(radius) } }),
    prisma.setting.upsert({ where: { key: "geofence_name" }, create: { key: "geofence_name", value: name }, update: { value: name } }),
  ]);

  return NextResponse.json({ success: true });
}
