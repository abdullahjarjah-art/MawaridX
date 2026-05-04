import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // السوبر أدمن ما يدخل قسم الموارد البشرية — يروح لوحته مباشرة
  if (session && isSuperAdminEmail(session.email)) {
    redirect("/super-admin");
  }

  return (
    <div className="min-h-screen mesh-bg relative">
      <div className="pattern-islamic absolute inset-0 pointer-events-none opacity-60" />
      <SidebarNav />
      <main className="relative lg:mr-64 pt-0 lg:pt-0">
        <div className="lg:hidden h-12" />
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
