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

/** Read `--viewport-background` (always dark) for the NGL WebGL stage. */
export function viewportBackgroundColor(): string {
  if (typeof document === "undefined") return "#0a0a0a";
  const value = getComputedStyle(document.documentElement).getPropertyValue("--viewport-background").trim();
  return cssColorToHex(value, "#0a0a0a");
}
