"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// ──────────────────────────────────────────────────────────
// BrandingProvider — يقرأ branding من API ويتاحه لكامل الـ UI
// ──────────────────────────────────────────────────────────

export type Branding = {
  displayName: string;
  logoUrl: string | null;
  primaryColor: string;
  commercialReg: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
};

const DEFAULT: Branding = {
  displayName:   "MawaridX",
  logoUrl:       null,
  primaryColor:  "#0284C7",
  commercialReg: "",
  taxNumber:     "",
  address:       "",
  phone:         "",
  email:         "",
};

type Ctx = {
  branding: Branding;
  loading: boolean;
  refresh: () => Promise<void>;
};

const BrandingContext = createContext<Ctx>({
  branding: DEFAULT,
  loading:  true,
  refresh:  async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT);
  const [loading, setLoading]   = useState(true);

  const refresh = async () => {
    try {
      const r = await fetch("/api/settings/branding", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setBranding({ ...DEFAULT, ...data });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  // طبّق اللون الأساسي على الـ CSS variables
  useEffect(() => {
    if (typeof document === "undefined" || !branding.primaryColor) return;
    document.documentElement.style.setProperty("--brand-primary-custom", branding.primaryColor);
  }, [branding.primaryColor]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
