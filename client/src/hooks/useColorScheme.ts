import { useEffect, useState } from "react";
import { readColorScheme, type ColorScheme } from "@/lib/themeColors";

/** Resolved light/dark — always synced with `html.light` / `html.dark` (CSS + NGL). */
export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() => readColorScheme());

  useEffect(() => {
    const sync = () => setScheme(readColorScheme());
    sync();
    const el = document.documentElement;
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", sync);
    };
  }, []);

  return scheme;
}
