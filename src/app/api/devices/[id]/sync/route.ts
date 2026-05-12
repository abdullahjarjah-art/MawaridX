import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncDevice } from "@/lib/zkteco-service";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "employee") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await syncDevice(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ في المزامنة" }, { status: 500 });
  }
}
