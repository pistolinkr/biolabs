import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextThemes,
} from "next-themes";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/** Follows OS light/dark via `prefers-color-scheme` (defaultTheme: system). */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

/** Resolved appearance for UI that cannot use CSS variables alone (e.g. NGL canvas). */
export function useResolvedTheme(): "light" | "dark" {
  const { resolvedTheme } = useNextThemes();
  if (resolvedTheme === "light" || resolvedTheme === "dark") return resolvedTheme;
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextThemes();
  const resolved = resolvedTheme === "light" ? "light" : "dark";
  return {
    theme: resolved,
    systemTheme: theme,
    setTheme,
    toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
    switchable: true,
  };
}
