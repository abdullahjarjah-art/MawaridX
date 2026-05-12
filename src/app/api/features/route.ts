import { NextResponse } from "next/server";
import { getFeatures, getCurrentPlan } from "@/lib/features";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ plan: getCurrentPlan(), features: getFeatures() });
}
