/** أدوات التحقق من المدخلات */

export type ValidationError = { field: string; message: string };

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  // أرقام سعودية: 05XXXXXXXX أو +9665XXXXXXXX أو 009665XXXXXXXX أو أي رقم 7-15 خانة
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
}

export function isValidIBAN(iban: string): boolean {
  // IBAN سعودي: SA متبوعة بـ 22 رقماً، مجموعها 24 حرف
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/.test(cleaned) && cleaned.length >= 15 && cleaned.length <= 34;
}

export function isValidNationalId(id: string): boolean {
  // هوية سعودية: 10 أرقام تبدأ بـ 1 أو 2، إقامة تبدأ بـ 2
  const cleaned = id.replace(/\s/g, "");
  return /^\d{10}$/.test(cleaned);
}

/** جمع أخطاء التحقق وإرجاعها */
export function collectErrors(checks: Array<[boolean, string, string]>): ValidationError[] {
  return checks
    .filter(([ok]) => !ok)
    .map(([, field, message]) => ({ field, message }));
}

/** إرجاع أول خطأ كـ string للعرض */
export function firstError(errors: ValidationError[]): string | null {
  return errors.length > 0 ? errors[0].message : null;
}
