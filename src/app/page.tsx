import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isSuperAdminEmail(session.email)) redirect("/super-admin");
  if (session.role === "employee") redirect("/portal");
  redirect("/dashboard");
}
