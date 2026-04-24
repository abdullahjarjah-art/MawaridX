"use client";

import { Moon, Sun, Languages } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useLang } from "./lang-provider";

export function ThemeLangToggle() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={theme === "light" ? "الوضع الليلي" : "الوضع النهاري"}
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-400" />
        )}
      </button>
      <button
        onClick={toggleLang}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs font-bold text-gray-600 dark:text-gray-300"
        title={lang === "ar" ? "English" : "عربي"}
      >
        {lang === "ar" ? "EN" : "ع"}
      </button>
    </div>
  );
}
