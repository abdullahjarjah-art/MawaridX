import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ── JWT secret: must be set in production ──
// Dev fallback exists only to make local development easier.
// In production, this MUST come from the environment or the
// app refuses to sign / verify tokens.
const RAW_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && (!RAW_SECRET || RAW_SECRET.length < 32)) {
  throw new Error(
    "[security] JWT_SECRET must be set to a strong value (≥32 chars) in production. " +
      "Generate with: openssl rand -base64 64"
  );
}
const SECRET = new TextEncoder().encode(RAW_SECRET || "dev-only-secret-do-not-use-in-prod");
const COOKIE = "hr_token";

// ── Session lifetime ──
// 24h is a security/convenience compromise. Users re-authenticate daily,
// limiting damage from a stolen cookie. Bump if the team complains.
const SESSION_HOURS = 24;

export type JWTPayload = {
  userId: string;
  email: string;
  role: string;
  employeeId?: string;
};

export async function signToken(payload: JWTPayload) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // tighter than "lax" — blocks cross-site cookie leakage
    maxAge: SESSION_HOURS * 60 * 60,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
