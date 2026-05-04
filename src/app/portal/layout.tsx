"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, CalendarCheck, Clock, LogOut, Menu, X, ClipboardList, CheckSquare, Megaphone, DollarSign, User, Users, Package, Fingerprint, CalendarDays, FolderOpen, Star } from "lucide-react";
import { MawaridXLogo, MawaridXWordmark } from "@/components/mawaridx-logo";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeLangToggle } from "@/components/theme-lang-toggle";
import { useLang } from "@/components/lang-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { PushNotificationButton } from "@/components/push-notification-button";

type User = {
  id: string; email: string; role: string;
  employee?: { firstName: string; lastName: string; jobTitle?: string; department?: string; employeeNumber: string; position?: string; id?: string; photo?: string | null };
};

const navItems = [
  { href: "/portal", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/portal/checkin", label: "البصمة الجغرافية", icon: Fingerprint },
  { href: "/portal/attendance", label: "الحضور والانصراف", icon: Clock },
  { href: "/portal/leaves", label: "طلبات الإجازة", icon: CalendarCheck },
  { href: "/portal/requests", label: "طلباتي", icon: ClipboardList },
  { href: "/portal/salary", label: "كشف الراتب", icon: DollarSign },
  { href: "/portal/custodies", label: "عهدتي", icon: Package },
  { href: "/portal/calendar", label: "تقويمي", icon: CalendarDays },
  { href: "/portal/company-docs",   label: "مستندات المنشأة", icon: FolderOpen },
  { href: "/portal/my-evaluations", label: "تقييماتي",        icon: Star },
  { href: "/portal/profile",        label: "ملفي الشخصي",     icon: User },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push("/login"); return; }
        if (data.isSuperAdmin) { router.push("/super-admin"); return; }
        if (data.role !== "employee") { router.push("/dashboard"); return; }
        setUser(data);
      });
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isManager = user?.employee?.position === "manager";

  const inactiveLink = "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              active
                ? "bg-brand-gradient text-white shadow-brand"
                : inactiveLink
            )}>
            <Icon className="h-4 w-4 shrink-0" />
            {t(item.label)}
          </Link>
        );
      })}
      {isManager && (
        <>
          <Link href="/portal/evaluations" onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              pathname.startsWith("/portal/evaluations") ? "bg-brand-gradient text-white shadow-brand" : inactiveLink
            )}>
            <Star className="h-4 w-4 shrink-0" />
            {t("تقييم الفريق")}
          </Link>
          <Link href="/portal/team-requests" onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              pathname.startsWith("/portal/team-requests") ? "bg-brand-gradient text-white shadow-brand" : inactiveLink
            )}>
            <CheckSquare className="h-4 w-4 shrink-0" />
            {t("طلبات الفريق")}
          </Link>
          <Link href="/portal/manager-dashboard" onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              pathname.startsWith("/portal/manager-dashboard") ? "bg-brand-gradient text-white shadow-brand" : inactiveLink
            )}>
            <Users className="h-4 w-4 shrink-0" />
            {t("لوحة الفريق")}
          </Link>
          <Link href="/portal/announcements" onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              pathname.startsWith("/portal/announcements") ? "bg-brand-gradient text-white shadow-brand" : inactiveLink
            )}>
            <Megaphone className="h-4 w-4 shrink-0" />
            {t("الإعلانات")}
          </Link>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen mesh-bg relative">
      <div className="pattern-islamic absolute inset-0 pointer-events-none opacity-60" />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-strong border-l border-brand-border min-h-screen fixed right-0 top-0 z-30 shadow-soft">
        <div className="relative flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <MawaridXLogo size={38} />
          <div>
            <MawaridXWordmark className="text-base" />
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t("بوابة الموظف")}</p>
          </div>
          {user?.employee?.id && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <NotificationBell employeeId={user.employee.id} />
            </div>
          )}
        </div>

        {/* Employee Info — ذات نمط إسلامي خفيف */}
        <div className="relative px-4 py-4 border-b border-brand-border bg-brand-gradient-soft overflow-hidden">
          <div className="pattern-dots absolute inset-0 opacity-50" />
          <div className="relative flex items-center gap-3">
            <div className="ring-brand rounded-full">
              <EmployeeAvatar photo={user.employee?.photo} firstName={user.employee?.firstName ?? ""} lastName={user.employee?.lastName} size="lg" />
            </div>
            <div>
              <p className="font-bold text-sm text-brand-ink">{user.employee?.firstName} {user.employee?.lastName}</p>
              <p className="text-xs text-brand-muted">{user.employee?.jobTitle ?? user.employee?.department ?? user.employee?.employeeNumber}</p>
            </div>
          </div>
        </div>

        <div className="py-4 flex-1 overflow-y-auto">
          <NavLinks />
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <Button variant="ghost" className="justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={logout}>
            <LogOut className="h-4 w-4" />
            {t("تسجيل الخروج")}
          </Button>
          <div className="flex items-center gap-1">
            <PushNotificationButton />
            <ThemeLangToggle />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 glass-strong border-b border-brand-border px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MawaridXLogo size={28} />
          <MawaridXWordmark className="text-xs" />
        </div>
        <div className="flex items-center gap-1">
          {user?.employee?.id && <NotificationBell employeeId={user.employee.id} />}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-0 right-0 w-64 h-full bg-white dark:bg-gray-800 pt-14" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 bg-sky-50 dark:bg-sky-900/20">
              <p className="font-semibold text-sm dark:text-white">{user.employee?.firstName} {user.employee?.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.employee?.employeeNumber}</p>
            </div>
            <div className="py-4"><NavLinks /></div>
            <div className="px-4">
              <Button variant="ghost" className="w-full justify-start gap-2 text-red-500" onClick={logout}>
                <LogOut className="h-4 w-4" /> {t("تسجيل الخروج")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="lg:mr-64">
        <div className="lg:hidden h-12" />
        <div className="pb-16 lg:pb-0">
          {children}
        </div>
      </main>

      {/* Bottom Navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-brand-border flex items-stretch shadow-soft" style={{paddingBottom: "env(safe-area-inset-bottom)"}}>
        {[
          { href: "/portal", label: "الرئيسية", icon: LayoutDashboard },
          { href: "/portal/attendance", label: "الحضور", icon: Clock },
          { href: "/portal/requests", label: "الطلبات", icon: CalendarCheck },
          { href: "/portal/profile", label: "الملف الشخصي", icon: User },
        ].map(item => {
          const Icon = item.icon;
          const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn("relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200",
                active ? "text-brand-primary" : "text-brand-muted"
              )}>
              <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              <span className="text-[9px] font-medium">{item.label}</span>
              {active && <span className="absolute bottom-0 w-10 h-0.5 bg-brand-gradient rounded-t-full" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
