"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

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
  refresh: () => void;
};

const BrandingContext = createContext<Ctx>({
  branding: DEFAULT,
  loading:  false,
  refresh:  () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  // loading starts as false — avoids any state-before-mount issues during SSR/hydration
  const [branding, setBranding] = useState<Branding>(DEFAULT);
  const [loading, setLoading]   = useState(false);

  // Stable ref: true once the component is committed to the DOM
  const mountedRef = useRef(false);

  // Exposed refresh function — stable via ref so consumers don't re-render needlessly
  const fetchBranding = () => {
    if (!mountedRef.current) return;
    const controller = new AbortController();
    setLoading(true);

    fetch("/api/settings/branding", { cache: "no-store", signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (mountedRef.current && data) setBranding({ ...DEFAULT, ...data });
      })
      .catch(() => { /* aborted or network error — ignore */ })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return controller;
  };

  useEffect(() => {
    // Mark as mounted — this runs synchronously after commit, before any paint
    mountedRef.current = true;

    // Now safe to start the fetch
    const controller = fetchBranding();

    // طبّق اللون الأساسي على الـ CSS variables عند التغيير
    if (typeof document !== "undefined" && branding.primaryColor) {
      document.documentElement.style.setProperty("--brand-primary-custom", branding.primaryColor);
    }

    return () => {
      mountedRef.current = false;
      controller?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تحديث CSS variable عند تغيير اللون بعد الـ fetch
  useEffect(() => {
    if (typeof document === "undefined" || !branding.primaryColor) return;
    document.documentElement.style.setProperty("--brand-primary-custom", branding.primaryColor);
  }, [branding.primaryColor]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
