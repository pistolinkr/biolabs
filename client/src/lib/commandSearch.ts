import type { i18n as I18nInstance } from "i18next";
import { SUPPORTED_UI_LOCALES } from "@shared/i18n/locales";

/** Extra aliases always searchable (English technical terms). */
const COMMAND_ALIASES: Record<string, string[]> = {
  "repr.cartoon": ["cartoon", "ribbon", "trace", "cartoon"],
  "repr.rope": ["rope", "ribbon", "trace"],
  "repr.surface": ["surface", "sas", "msms"],
  "repr.ballstick": ["ball", "stick", "ballstick", "atoms"],
  "repr.spacefill": ["spacefill", "vdw", "spheres", "vdw"],
  "repr.ribbon": ["ribbon"],
  "repr.wireframe": ["wire", "wireframe", "line"],
  "color.chainid": ["chain", "chainid"],
  "color.residueindex": ["residue", "sequence", "index"],
  "color.hydrophobicity": ["hydrophobic", "hp", "kyte"],
  "color.bfactor": ["bfactor", "confidence", "plddt", "tempfactor"],
  "color.bfactor.gray": ["grey", "gray", "confidence"],
  "color.electrostatic": ["electrostatic", "charge", "coulomb"],
  "isolate.A": ["chain a", "isolate a"],
  "isolate.B": ["chain b", "isolate b"],
  "isolate.clear": ["clear", "show all", "reset isolate"],
  "view.fit.selection": ["fit", "zoom", "selection"],
  "view.fit.structure": ["fit all", "autoview", "structure"],
  "view.center": ["center", "centre", "focus"],
  "view.preset.readable": ["readable", "preset", "default view"],
  "view.quality.toggle": ["quality", "render", "performance"],
  "view.fullscreen.toggle": ["fullscreen", "full screen"],
  "overlay.confidence.toggle": ["confidence overlay"],
  "view.spin.toggle": ["spin", "rotate", "turntable"],
  "analysis.interactions": ["interaction", "contact", "ixn", "distance"],
  "export.cif": ["export", "cif", "mmCif", "download"],
  screenshot: ["screenshot", "png", "image", "capture"],
};

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

/** Build a multilingual search blob for one command (all UI locales + aliases). */
export function buildCommandSearchBlob(
  i18n: I18nInstance,
  cmdId: string,
  category: string,
): string {
  const parts: string[] = [cmdId, cmdId.replace(/\./g, " "), ...(COMMAND_ALIASES[cmdId] ?? [])];

  for (const lng of SUPPORTED_UI_LOCALES) {
    parts.push(i18n.t(`items.${cmdId}.title`, { lng, ns: "commands", defaultValue: "" }));
    parts.push(i18n.t(`items.${cmdId}.description`, { lng, ns: "commands", defaultValue: "" }));
    parts.push(i18n.t(`categories.${category}`, { lng, ns: "commands", defaultValue: "" }));
  }

  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

export function commandMatchesQuery(searchBlob: string, query: string): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return searchBlob.includes(q);
}
