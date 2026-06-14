import type { Stage } from "ngl";

export type ColorScheme = "light" | "dark";

export const VIEWPORT_BACKGROUNDS: Record<ColorScheme, string> = {
  dark: "#0a0a0a",
  light: "#e4e4e4",
};

export const VIEWPORT_LIGHTING: Record<ColorScheme, { lightIntensity: number; ambientIntensity: number }> = {
  dark: { lightIntensity: 1.05, ambientIntensity: 0.3 },
  light: { lightIntensity: 1.0, ambientIntensity: 0.45 },
};

/** Single source of truth — matches `html.light` / `html.dark` from next-themes. */
export function readColorScheme(): ColorScheme {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  if (root.classList.contains("light")) return "light";
  if (root.classList.contains("dark")) return "dark";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/** NGL expects `#rrggbb` or named colors — normalize CSS computed values. */
export function cssColorToHex(input: string, fallback: string): string {
  const raw = input.trim();
  if (!raw) return fallback;
  if (raw.startsWith("#")) {
    if (raw.length === 4) {
      const r = raw[1];
      const g = raw[2];
      const b = raw[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return raw.length === 7 ? raw.toLowerCase() : fallback;
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(raw);
  if (rgb) {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    const r = clamp(Number(rgb[1])).toString(16).padStart(2, "0");
    const g = clamp(Number(rgb[2])).toString(16).padStart(2, "0");
    const b = clamp(Number(rgb[3])).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return fallback;
}

export function viewportBackgroundColor(scheme: ColorScheme = readColorScheme()): string {
  return VIEWPORT_BACKGROUNDS[scheme];
}

/** Keep NGL canvas background + lighting aligned with CSS `--viewport-background`. */
export function applyNglStageTheme(stage: Stage, scheme: ColorScheme): void {
  const backgroundColor = viewportBackgroundColor(scheme);
  const lighting = VIEWPORT_LIGHTING[scheme];
  try {
    stage.viewer.setBackground(backgroundColor);
  } catch {
    /* viewer not ready */
  }
  try {
    stage.setParameters({ backgroundColor, ...lighting } as never);
  } catch {
    /* */
  }
}
