import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAttendancePunch } from "@/lib/zkteco-service";

// GET: device handshake
export async function GET(req: NextRequest) {
  const sn = req.nextUrl.searchParams.get("SN") || "";
  if (sn) {
    await prisma.fingerprintDevice.updateMany({
      where: { serial: sn },
      data: { syncStatus: "ok", lastSync: new Date() },
    });
  }
  return new NextResponse(
    `GET OPTION FROM: Server\nATT_LOG_STAMP=9999\nOPERATION_LOG_STAMP=9999\nERRLOG_STAMP=9999\nSERVER_VERSION=3.0.1\nPush=0\nTableNameBuffer=ATTLOG OPERLOG ATTPHOTO ERRORLOG BIOPHOTO BIOMETRIC\n`,
    { headers: { "Content-Type": "text/plain" } }
  );
}

// POST: device pushes attendance logs
export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const sn = params.get("SN") || "";
  const table = params.get("table") || "";
  const attLog = params.get("AttLog") || "";

  if (table !== "ATTLOG" || !attLog) {
    return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
  }

  const device = await prisma.fingerprintDevice.findFirst({ where: { serial: sn } });

  for (const line of attLog.split("\n").filter(Boolean)) {
    const parts = line.split("\t");
    if (parts.length < 2) continue;
    const [deviceUserId, attTimeStr] = parts;
    const attTime = new Date(attTimeStr);
    if (isNaN(attTime.getTime())) continue;

    try {
      await processAttendancePunch({
        deviceUserId: deviceUserId.trim(),
        attTime,
        locationId: device?.locationId ?? undefined,
      });
    } catch {
      // ignore individual failures
    }
  }

  if (sn) {
    await prisma.fingerprintDevice.updateMany({
      where: { serial: sn },
      data: { lastSync: new Date(), syncStatus: "ok" },
    });
  }

  return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
}
