export function MawaridXLogo({ size = 40, animate = false }: { size?: number; animate?: boolean }) {
  const id = `mxg-${size}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg
      width={size} height={size} viewBox="0 0 40 40" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animate ? "drop-shadow-sm" : ""}
      aria-hidden="true"
    >
      <defs>
        {/* خلفية ملكيّة متدرجة */}
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#3b4fb4" />
          <stop offset="1" stopColor="#5b5bd6" />
        </linearGradient>
        {/* خيط ذهبي للتمييز */}
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        {/* لمعة سماوية للشخص الرئيسي */}
        <linearGradient id={`${id}-ac`} x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#93c5fd" />
        </linearGradient>
        {/* توهّج نحاسي للأشخاص الجانبيين */}
        <linearGradient id={`${id}-side`} x1="0" y1="20" x2="40" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      {/* خلفية مدوّرة */}
      <rect width="40" height="40" rx="11" fill={`url(#${id}-bg)`} />

      {/* نمط هندسي إسلامي خفيف */}
      <g opacity="0.14" stroke="#ffffff" strokeWidth="0.5" fill="none">
        <path d="M20 4 L36 20 L20 36 L4 20 Z" />
        <path d="M20 10 L30 20 L20 30 L10 20 Z" />
      </g>

      {/* هالة ذهبية حول الشخص الرئيسي */}
      <circle cx="20" cy="13" r="5.5" fill={`url(#${id}-gold)`} opacity="0.25" />

      {/* شخص رئيسي */}
      <circle cx="20" cy="13" r="3.8" fill={`url(#${id}-ac)`} />
      <path d="M12.5 28c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" stroke={`url(#${id}-ac)`} strokeWidth="2.6" strokeLinecap="round" fill="none" />

      {/* شخصان جانبيّان أصغر */}
      <circle cx="9" cy="18" r="2.2" fill={`url(#${id}-side)`} opacity="0.75" />
      <path d="M4.5 26.8c0-2.5 2-4.5 4.5-4.5" stroke={`url(#${id}-side)`} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75" />
      <circle cx="31" cy="18" r="2.2" fill={`url(#${id}-side)`} opacity="0.75" />
      <path d="M35.5 26.8c0-2.5-2-4.5-4.5-4.5" stroke={`url(#${id}-side)`} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75" />

      {/* نقاط ذهبية فاخرة — رمز الاتصال */}
      <circle cx="14" cy="16" r="0.9" fill="#fbbf24" opacity="0.85" />
      <circle cx="26" cy="16" r="0.9" fill="#fbbf24" opacity="0.85" />

      {animate && (
        <circle cx="20" cy="13" r="5" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.5">
          <animate attributeName="r" from="4" to="8" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

export function MawaridXWordmark({ className = "", variant = "default" }: { className?: string; variant?: "default" | "light" }) {
  const mainColor = variant === "light" ? "text-white" : "text-brand-ink dark:text-slate-100";
  return (
    <span className={`font-bold tracking-tight leading-none ${className}`}>
      <span className={mainColor}>Mawarid</span>
      <span className="text-gold-gradient font-black">X</span>
    </span>
  );
}
