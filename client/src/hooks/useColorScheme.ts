import { useEffect, useState } from "react";
import { useTheme as useNextThemes } from "next-themes";

/** Resolved light/dark — synced with `html.light` / `html.dark` (Safari-safe). */
export function useColorScheme(): "light" | "dark" {
  const { resolvedTheme } = useNextThemes();
  const [scheme, setScheme] = useState<"light" | "dark">(() => readHtmlColorScheme());

  useEffect(() => {
    setScheme(readHtmlColorScheme());
    const el = document.documentElement;
    const obs = new MutationObserver(() => setScheme(readHtmlColorScheme()));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => setScheme(readHtmlColorScheme());
    mq.addEventListener("change", onMq);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  if (resolvedTheme === "light" || resolvedTheme === "dark") return resolvedTheme;
  return scheme;
}

function readHtmlColorScheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  if (root.classList.contains("light")) return "light";
  if (root.classList.contains("dark")) return "dark";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "dark";
}
