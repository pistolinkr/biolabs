import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from "next-themes";
import type { ReactNode } from "react";
import { useColorScheme } from "@/hooks/useColorScheme";

export { useColorScheme } from "@/hooks/useColorScheme";

interface ThemeProviderProps {
  children: ReactNode;
}

/** Follows OS light/dark via `prefers-color-scheme` (defaultTheme: system). */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}

/** Resolved appearance for UI that cannot use CSS variables alone (e.g. NGL canvas). */
export function useResolvedTheme(): "light" | "dark" {
  return useColorScheme();
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextThemes();
  const resolved = useColorScheme();
  return {
    theme: resolved,
    systemTheme: theme,
    setTheme,
    toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
    switchable: true,
  };
}
