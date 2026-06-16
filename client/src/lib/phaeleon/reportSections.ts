export const PHAELEON_REPORT_SECTIONS = {
  emergency: "phaeleon-report-emergency",
  summary: "phaeleon-report-summary",
  mechanism: "phaeleon-report-mechanism",
  expectedEffects: "phaeleon-report-effects",
  practicalSteps: "phaeleon-report-steps",
} as const;

export type PhaeleonReportSectionId = (typeof PHAELEON_REPORT_SECTIONS)[keyof typeof PHAELEON_REPORT_SECTIONS];

const HIGHLIGHT_CLASS = "phaeleon-report-section-highlight";

export function scrollToPhaeleonReportSection(sectionId: PhaeleonReportSectionId | string): boolean {
  const el = document.getElementById(sectionId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove(HIGHLIGHT_CLASS);
  void el.offsetWidth;
  el.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), 2200);
  return true;
}

export function isPhaeleonReportSectionHref(href: string): href is `#${PhaeleonReportSectionId}` {
  return href.startsWith("#phaeleon-report-");
}
