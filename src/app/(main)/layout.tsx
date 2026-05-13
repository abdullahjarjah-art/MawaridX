import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

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
