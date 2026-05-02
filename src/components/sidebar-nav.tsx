"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  AlarmClock,
  Flag,
  DollarSign,
  UserPlus,
  Star,
  BookOpen,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Settings,
  GitBranch,
  Layers,
  ClipboardList,
  Megaphone,
  BarChart3,
  Shield,
  MapPin,
  FileText,
  FolderOpen,
} from "lucide-react";
import { MawaridXLogo, MawaridXWordmark } from "@/components/mawaridx-logo";
import { useBranding } from "@/components/branding-provider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeLangToggle } from "@/components/theme-lang-toggle";
import { useLang } from "@/components/lang-provider";
import { PushNotificationButton } from "@/components/push-notification-button";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/employees", label: "الموظفون", icon: Users },
  { href: "/org-chart", label: "الهيكل التنظيمي", icon: GitBranch },
  { href: "/departments", label: "الأقسام", icon: Layers },
  { href: "/locations", label: "مواقع العمل", icon: MapPin },
  { href: "/attendance", label: "الحضور والإجازات", icon: CalendarCheck },
  { href: "/shifts",     label: "جداول الدوام",      icon: AlarmClock },
  { href: "/calendar", label: "التقويم", icon: CalendarDays },
  { href: "/holidays", label: "العطل الرسمية", icon: CalendarCheck },
  { href: "/requests", label: "الطلبات", icon: ClipboardList },
  { href: "/announcements", label: "الإعلانات", icon: Megaphone },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/salaries", label: "الرواتب", icon: DollarSign },
  { href: "/contracts",      label: "العقود",            icon: FileText },
  { href: "/company-docs",   label: "مستندات المنشأة",  icon: FolderOpen },
  { href: "/recruitment", label: "التوظيف", icon: UserPlus },
  { href: "/evaluations", label: "تقييم الأداء", icon: Star },
  { href: "/saudization", label: "نطاقات السعودة", icon: Flag },
  { href: "/training", label: "التدريب والتطوير", icon: BookOpen },
  { href: "/audit-log", label: "سجل التدقيق", icon: Shield },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { branding } = useBranding();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.employee?.id) setEmployeeId(data.employee.id);
    }).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              active
                ? "bg-brand-gradient text-white shadow-brand"
                : "text-brand-ink/80 hover:bg-brand-primary-soft hover:text-brand-primary"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-strong border-l border-brand-border min-h-screen fixed right-0 top-0 z-30 shadow-soft">
        <div className="relative flex items-center gap-3 px-5 py-4 border-b border-brand-border">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.displayName} className="h-10 w-10 rounded-lg object-contain bg-white/50" />
          ) : (
            <MawaridXLogo size={38} animate />
          )}
          <div className="min-w-0">
            {branding.logoUrl ? (
              <p className="text-base font-bold truncate" style={{ color: branding.primaryColor }}>{branding.displayName}</p>
            ) : (
              <MawaridXWordmark className="text-base" />
            )}
            <p className="text-[10px] text-brand-muted mt-0.5 truncate">{branding.logoUrl ? "نظام إدارة الموارد البشرية" : "نظام إدارة الموارد البشرية"}</p>
          </div>
          {employeeId && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <NotificationBell employeeId={employeeId} />
            </div>
          )}
        </div>
        <div className="py-4 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="px-4 py-3 border-t border-brand-border flex items-center justify-between">
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
        <div className="flex items-center gap-2 min-w-0">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.displayName} className="h-7 w-7 rounded object-contain" />
          ) : (
            <MawaridXLogo size={28} />
          )}
          {branding.logoUrl ? (
            <p className="text-xs font-bold truncate" style={{ color: branding.primaryColor }}>{branding.displayName}</p>
          ) : (
            <MawaridXWordmark className="text-xs" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {employeeId && <NotificationBell employeeId={employeeId} />}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 right-0 w-64 h-full glass-strong pt-16 flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-4 flex-1 overflow-y-auto">
              <NavLinks />
            </div>
            <div className="px-4 py-4 border-t border-brand-border flex items-center justify-between">
              <Button variant="ghost" className="justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={logout}>
                <LogOut className="h-4 w-4" />
                {t("تسجيل الخروج")}
              </Button>
              <PushNotificationButton showLabel={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
