import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/super-admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true, department: true,
          employeeNumber: true, position: true, managerId: true, startDate: true,
          photo: true, nationality: true, basicSalary: true,
          housingAllowance: true, transportAllowance: true, otherAllowance: true,
          multiLocation: true,
          assignedLocations: {
            include: { location: { select: { id: true, name: true, address: true, latitude: true, longitude: true, radius: true, active: true } } },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: isSuperAdminEmail(user.email),
    employee: user.employee,
  });
}
