"use client";

type Props = {
  photo?: string | null;
  firstName: string;
  lastName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeMap = {
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-8 h-8", text: "text-xs" },
  md: { container: "w-9 h-9", text: "text-sm" },
  lg: { container: "w-10 h-10", text: "text-sm" },
  xl: { container: "w-16 h-16", text: "text-2xl" },
};

export function EmployeeAvatar({ photo, firstName, lastName, size = "md", className = "" }: Props) {
  const s = sizeMap[size];
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`;

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={`${firstName} ${lastName ?? ""}`}
        className={`${s.container} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${s.container} bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center text-sky-700 dark:text-sky-400 font-bold ${s.text} shrink-0 ${className}`}>
      {initials}
    </div>
  );
}
