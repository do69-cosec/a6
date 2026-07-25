"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full border bg-muted/40 animate-pulse" />;
  }

  const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500 animate-in spin-in-12 duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500 animate-in spin-in-12 duration-300" />
      )}
    </button>
  );
}
