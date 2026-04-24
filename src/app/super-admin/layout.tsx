import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { SuperAdminNav } from "./nav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!isSuperAdminEmail(session.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen mesh-bg relative">
      <div className="pattern-islamic absolute inset-0 pointer-events-none opacity-50" />
      <SuperAdminNav email={session.email} />
      <main className="relative lg:mr-64">
        <div className="lg:hidden h-14" />
        <div className="animate-fade-in p-3 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
