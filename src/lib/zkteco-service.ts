import ZKLib from "node-zklib";
import { prisma } from "@/lib/prisma";

export async function syncDevice(deviceId: string): Promise<{ synced: number; errors: string[] }> {
  const device = await prisma.fingerprintDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("الجهاز غير موجود");

  await prisma.fingerprintDevice.update({ where: { id: deviceId }, data: { syncStatus: "syncing", syncError: null } });

  const errors: string[] = [];
  let synced = 0;

  try {
    const zk = new ZKLib(device.ip, device.port, 10000, 4000);
    await zk.createSocket();

    const { data: logs } = await zk.getAttendances();
    await zk.disconnect();

    for (const log of logs) {
      try {
        await processAttendancePunch({
          deviceUserId: String(log.deviceUserId),
          attTime: new Date(log.attTime),
          locationId: device.locationId ?? undefined,
        });
        synced++;
      } catch (e) {
        errors.push(`${log.deviceUserId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await prisma.fingerprintDevice.update({
      where: { id: deviceId },
      data: { syncStatus: "ok", lastSync: new Date(), syncError: null },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.fingerprintDevice.update({
      where: { id: deviceId },
      data: { syncStatus: "error", syncError: msg },
    });
    throw e;
  }

  return { synced, errors };
}

export async function processAttendancePunch({
  deviceUserId,
  attTime,
  locationId,
}: {
  deviceUserId: string;
  attTime: Date;
  locationId?: string;
}) {
  // Find employee: match nationalId or employeeNumber
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { nationalId: deviceUserId },
        { employeeNumber: deviceUserId },
      ],
      status: "active",
    },
    include: {
      shifts: { where: { endDate: null }, include: { shift: true }, take: 1 },
    },
  });

  if (!employee) throw new Error(`لا يوجد موظف بالرقم ${deviceUserId}`);

  const dateOnly = new Date(attTime);
  dateOnly.setHours(0, 0, 0, 0);

  // Check if on approved leave
  const activeLeave = await prisma.leave.findFirst({
    where: {
      employeeId: employee.id,
      status: "approved",
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly },
    },
  });
  if (activeLeave) return; // skip — on leave

  // Get existing attendance for this day
  const existing = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, date: dateOnly },
  });

  const shift = employee.shifts[0]?.shift;
  const tolSetting = await prisma.setting.findUnique({ where: { key: "lateToleranceMinutes" } });
  const tolerance = tolSetting ? Number(tolSetting.value) : 15;

  if (!existing) {
    // First punch of the day → check-in
    let status = "present";
    if (shift) {
      const [sh, sm] = shift.checkInTime.split(":").map(Number);
      const shiftInMins = sh * 60 + sm;
      const actualMins = attTime.getHours() * 60 + attTime.getMinutes();
      if (actualMins - shiftInMins > tolerance) status = "late";
    }

    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: dateOnly,
        checkIn: attTime,
        status,
        source: "fingerprint",
        workLocationId: locationId ?? null,
        checkInLocationId: locationId ?? null,
      },
    });
  } else if (existing.checkIn && !existing.checkOut) {
    // Second punch → check-out
    const workHours = (attTime.getTime() - existing.checkIn.getTime()) / 3600000;
    let overtimeMinutes = 0;

    if (shift) {
      const [eh, em] = shift.checkOutTime.split(":").map(Number);
      const shiftOutMins = eh * 60 + em;
      const actualOutMins = attTime.getHours() * 60 + attTime.getMinutes();
      overtimeMinutes = Math.max(0, actualOutMins - shiftOutMins);
    }

    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: attTime,
        workHours: Math.round(workHours * 100) / 100,
        overtimeMinutes,
        checkOutLocationId: locationId ?? null,
      },
    });
  }
  // If both checkIn and checkOut exist → ignore
}
