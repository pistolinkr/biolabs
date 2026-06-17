import React from "react";
import { useTranslation } from "react-i18next";
import LiveTranslatedText from "@/components/phaeleon/LiveTranslatedText";
import { PhaeleonPanelSection, phaeleonPanel } from "@/components/phaeleon/phaeleonPanelChrome";
import { PHAELEON_REPORT_SECTIONS } from "@/lib/phaeleon/reportSections";
import { cn } from "@/lib/utils";
import type { InteractionAnalysis, InteractionRisk } from "@/lib/phaeleon/types";

const RISK_STYLES: Record<InteractionRisk, string> = {
  low: "border-border text-muted-foreground",
  moderate: "border-yellow-600/60 text-yellow-600",
  high: "border-orange-600/70 text-orange-500",
  very_high: "border-red-600/70 text-red-500",
  unknown: "border-border text-muted-foreground",
};

export type AnalysisRiskBorderClass =
  | "border-l-green-600"
  | "border-l-yellow-500"
  | "border-l-orange-500"
  | "border-l-red-600"
  | "border-l-border";

const RISK_BORDER: Record<InteractionRisk, AnalysisRiskBorderClass> = {
  low: "border-l-green-600",
  moderate: "border-l-yellow-500",
  high: "border-l-orange-500",
  very_high: "border-l-red-600",
  unknown: "border-l-border",
};

export function riskBorderClass(risk: InteractionRisk): AnalysisRiskBorderClass {
  return RISK_BORDER[risk];
}

type SectionSeverity = "low" | "moderate" | "high";

const SECTION_SEVERITY_STYLES: Record<SectionSeverity, string> = {
  low: "border-border text-muted-foreground",
  moderate: "border-yellow-600/50 text-yellow-600",
  high: "border-red-600/60 text-red-500",
};

export function PairTitle({
  drug1,
  drug2,
  onSelectDrug1,
  onSelectDrug2,
}: {
  drug1: string;
  drug2: string;
  onSelectDrug1: () => void;
  onSelectDrug2: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onSelectDrug1}
        className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {drug1}
      </button>
      <span className="text-muted-foreground"> + </span>
      <button
        type="button"
        onClick={onSelectDrug2}
        className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {drug2}
      </button>
    </>
  );
}

export function AnalysisRiskBadge({ risk, label }: { risk: InteractionRisk; label: string }) {
  return (
    <span
      className={cn(
        "shrink-0 border border-border px-1.5 py-0 font-mono text-[9px] uppercase leading-none tracking-[0.14em]",
        RISK_STYLES[risk],
      )}
    >
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: SectionSeverity }) {
  const { t } = useTranslation("phaeleon");
  return (
    <span
      className={cn(
        "ml-2 inline-flex shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none tracking-[0.1em]",
        SECTION_SEVERITY_STYLES[severity],
      )}
    >
      {t(`severity.${severity}`)}
    </span>
  );
}

export function SectionLabel({ label, severity }: { label: string; severity?: SectionSeverity }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-foreground/85">
        {label}
      </p>
      {severity ? <SeverityBadge severity={severity} /> : null}
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 rounded-sm bg-muted" />
          <div className="h-4 w-full rounded-sm bg-muted/60" />
          <div className="h-4 w-5/6 rounded-sm bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

export function sectionSeverityForRisk(
  risk: InteractionRisk,
  section: "summary" | "mechanism" | "effects" | "steps",
): SectionSeverity {
  if (risk === "very_high" || risk === "high") {
    if (section === "steps") return "moderate";
    return "high";
  }
  if (risk === "moderate") {
    if (section === "summary" || section === "effects") return "moderate";
    return "low";
  }
  return "low";
}

export function AnalysisFailedState({ mode }: { mode: "translation" | "ai" | "ai_not_configured" }) {
  const { t } = useTranslation("phaeleon");

  const title =
    mode === "ai_not_configured"
      ? t("report.aiNotConfigured")
      : mode === "ai"
        ? t("report.aiFailed")
        : t("report.translationFailed");
  const hint =
    mode === "ai_not_configured"
      ? t("report.aiNotConfiguredHint")
      : mode === "ai"
        ? t("report.aiFailedHint")
        : t("report.translationFailedHint");

  return (
    <div className="rounded-none border border-red-600/30 bg-red-500/5 p-3" aria-live="polite">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-red-500">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AnalysisLoadingState({
  aiMode,
  compact,
  slim,
}: {
  aiMode?: boolean;
  compact?: boolean;
  slim?: boolean;
}) {
  const { t } = useTranslation("phaeleon");

  if (slim) {
    return (
      <div className="flex min-h-[min(200px,30vh)] flex-col items-center justify-center py-12" aria-live="polite" aria-busy="true">
        <p className="animate-pulse font-mono text-sm tracking-wide text-accent">
          {aiMode ? t("assistantFirst.analyzing") : t("panels.analysis.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact ? "" : "border-b border-border pb-4")} aria-live="polite" aria-busy="true">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
        {aiMode ? t("panels.analysis.aiLoading") : t("panels.analysis.loading")}
      </p>
      <ReportSkeleton />
    </div>
  );
}

export function AnalysisReportBody({
  report,
  source,
  emptyMode,
  reveal,
  embedded = false,
  flushVertical = false,
}: {
  report?: InteractionAnalysis;
  source?: InteractionAnalysis;
  emptyMode: "none" | "noPair" | "awaitAnalysis";
  reveal: boolean;
  embedded?: boolean;
  /** Binary card — first/last sections flush with top/bottom border. */
  flushVertical?: boolean;
}) {
  const { t } = useTranslation("phaeleon");
  const filled = Boolean(report && source);
  const risk = report?.risk ?? "unknown";
  const translateProps = { reveal };

  const emptyText = (section: "emergency" | "summary" | "mechanism" | "expectedEffects" | "practicalSteps") => {
    const key = emptyMode === "noPair" ? "noPair" : "awaitAnalysis";
    return t(`reportEmpty.${key}.${section}`);
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        !embedded && "workstation-scroll-region min-h-0 flex-1 bg-card",
        flushVertical && "[&>div:first-child]:pt-0 [&>div:last-child]:pb-0",
      )}
    >
      <PhaeleonPanelSection>
        <div
          id={PHAELEON_REPORT_SECTIONS.emergency}
          className={cn(phaeleonPanel.box, "scroll-mt-3 border-red-600/40 bg-red-500/5 transition-colors")}
        >
          <SectionLabel label={t("report.emergencySigns")} severity="high" />
          {filled ? (
            <ul className="space-y-1 text-xs text-foreground/90">
              {report!.emergencySigns.map((item, index) => (
                <li key={`${item}-${index}`}>
                  —{" "}
                  <LiveTranslatedText
                    text={item}
                    sourceText={source!.emergencySigns[index] ?? item}
                    {...translateProps}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">{emptyText("emergency")}</p>
          )}
        </div>
      </PhaeleonPanelSection>

      <PhaeleonPanelSection>
        <div id={PHAELEON_REPORT_SECTIONS.summary} className="scroll-mt-3 transition-colors">
          <SectionLabel
            label={t("report.summary")}
            severity={filled ? sectionSeverityForRisk(risk, "summary") : undefined}
          />
          {filled ? (
            <p className="text-base font-medium leading-relaxed">
              <LiveTranslatedText
                text={report!.summary}
                sourceText={source!.summary}
                className="block"
                {...translateProps}
              />
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">{emptyText("summary")}</p>
          )}
        </div>
      </PhaeleonPanelSection>

      <PhaeleonPanelSection>
        <div id={PHAELEON_REPORT_SECTIONS.mechanism} className="scroll-mt-3 transition-colors">
          <SectionLabel
            label={t("report.mechanism")}
            severity={filled ? sectionSeverityForRisk(risk, "mechanism") : undefined}
          />
          {filled ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              <LiveTranslatedText
                text={report!.mechanism}
                sourceText={source!.mechanism}
                className="block"
                {...translateProps}
              />
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground/80">{emptyText("mechanism")}</p>
          )}
        </div>
      </PhaeleonPanelSection>

      <PhaeleonPanelSection>
        <div id={PHAELEON_REPORT_SECTIONS.expectedEffects} className="scroll-mt-3 transition-colors">
          <SectionLabel
            label={t("report.expectedEffects")}
            severity={filled ? sectionSeverityForRisk(risk, "effects") : undefined}
          />
          {filled ? (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {report!.expectedEffects.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="text-accent/70">·</span>
                  <LiveTranslatedText
                    text={item}
                    sourceText={source!.expectedEffects[index] ?? item}
                    {...translateProps}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground/75">{emptyText("expectedEffects")}</p>
          )}
        </div>
      </PhaeleonPanelSection>

      <PhaeleonPanelSection>
        <div id={PHAELEON_REPORT_SECTIONS.practicalSteps} className="scroll-mt-3 transition-colors">
          <SectionLabel
            label={t("report.practicalSteps")}
            severity={filled ? sectionSeverityForRisk(risk, "steps") : undefined}
          />
          {filled ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {report!.practicalSteps.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="text-accent/50">·</span>
                  <LiveTranslatedText
                    text={item}
                    sourceText={source!.practicalSteps[index] ?? item}
                    {...translateProps}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground/70">{emptyText("practicalSteps")}</p>
          )}
        </div>
      </PhaeleonPanelSection>

      <PhaeleonPanelSection last={embedded}>
        <p className="phaeleon-disclaimer">{t("disclaimer")}</p>
      </PhaeleonPanelSection>
    </div>
  );
}
