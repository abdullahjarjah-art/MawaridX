import { NextResponse } from "next/server";

// GET /api/push/vapid-key — إرجاع المفتاح العام
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  });
}
