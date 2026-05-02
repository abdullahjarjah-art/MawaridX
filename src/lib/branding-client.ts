// ──────────────────────────────────────────────────────────
// Branding helpers — للاستخدام في الكلاينت (PDF generation)
// ──────────────────────────────────────────────────────────

import type { Branding } from "@/components/branding-provider";

/** يجيب logo الشركة كـ data URL ليستخدم في jsPDF */
export async function fetchLogoDataUrl(logoUrl: string | null): Promise<string | undefined> {
  if (!logoUrl) return undefined;

  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    // jsPDF لا يدعم SVG عبر addImage — رجّع undefined
    if (blob.type === "image/svg+xml") return undefined;

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/** يحوّل branding إلى الحقول اللي يحتاجها letters-pdf */
export async function brandingForPdf(branding: Branding) {
  const logoDataUrl = await fetchLogoDataUrl(branding.logoUrl);
  return {
    logoDataUrl,
    primaryColor:   branding.primaryColor,
    companyName:    branding.displayName,
    commercialReg:  branding.commercialReg || undefined,
    taxNumber:      branding.taxNumber     || undefined,
    companyAddress: branding.address       || undefined,
    companyPhone:   branding.phone         || undefined,
    companyEmail:   branding.email         || undefined,
  };
}
