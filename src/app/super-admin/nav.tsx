"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MawaridXLogo, MawaridXWordmark } from "@/components/mawaridx-logo";
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Crown,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/super-admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/companies", label: "الشركات", icon: Building2 },
];

export function SuperAdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <>
      {/* شريط علوي للموبايل */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 glass-strong border-b border-brand-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MawaridXLogo size={28} />
          <div className="flex items-center gap-1.5">
            <MawaridXWordmark className="text-sm" />
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gold-gradient text-white px-1.5 py-0.5 rounded-md">
              <Crown className="h-2.5 w-2.5" /> SA
            </span>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-brand-primary/10"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* سايدبار الموبايل */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* السايدبار */}
      <aside
        className={`fixed inset-y-0 right-0 w-64 z-40 glass-strong border-l border-brand-border transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* رأس السايدبار */}
          <div className="p-5 border-b border-brand-border">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="bg-brand-gradient rounded-xl p-2 shadow-brand">
                <MawaridXLogo size={28} animate />
              </div>
              <div>
                <MawaridXWordmark className="text-lg" />
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-gold-gradient text-white px-1.5 py-0.5 rounded-md">
                    <Crown className="h-2.5 w-2.5" /> SUPER ADMIN
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-brand-muted truncate">{email}</p>
          </div>

          {/* روابط التنقل */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-brand-gradient text-white shadow-brand"
                      : "text-brand-ink hover:bg-brand-primary/5"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-brand-primary"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* تذييل */}
          <div className="p-3 border-t border-brand-border space-y-1.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-brand-muted hover:text-brand-primary hover:bg-brand-primary/5 transition-colors"
            >
              ← العودة للوحة HR
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
