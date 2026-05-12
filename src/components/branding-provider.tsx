"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, ReactNode } from "react";

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

const CACHE_KEY = "hr_branding_cache";

/** قراءة آخر branding محفوظ من localStorage (يُعرض فوراً بدون انتظار API) */
function readCache(): Branding {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT;
}

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
  // ابدأ بالكاش المحفوظ — يُحلّ مشكلة وميض اللوقو عند التنقل
  const [branding, setBranding] = useState<Branding>(DEFAULT);
  const [loading, setLoading]   = useState(false);
  const mountedRef = useRef(false);

  const fetchBranding = () => {
    if (!mountedRef.current) return;
    const controller = new AbortController();
    setLoading(true);

    fetch("/api/settings/branding", { cache: "no-store", signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!mountedRef.current || !data) return;
        const merged = { ...DEFAULT, ...data };
        setBranding(merged);
        // احفظ في localStorage لاستخدامه فوراً عند التحميل القادم
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      })
      .catch(() => { /* aborted or network error — ignore */ })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return controller;
  };

  // useLayoutEffect يعمل قبل أي رسم على الشاشة — يمنع flash اللوقو الافتراضي تماماً
  useLayoutEffect(() => {
    const cached = readCache();
    setBranding(cached);
    if (cached.primaryColor) {
      document.documentElement.style.setProperty("--brand-primary-custom", cached.primaryColor);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // حدّث من الـ API في الخلفية بعد الرسم
    const controller = fetchBranding();
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
