import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import LiveTranslatedText from "@/components/phaeleon/LiveTranslatedText";
import {
  AnalysisRiskBadge,
  SectionLabel,
  sectionSeverityForRisk,
} from "@/components/phaeleon/PhaeleonAnalysisReportContent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PHAELEON_REPORT_SECTIONS } from "@/lib/phaeleon/reportSections";
import type { InteractionAnalysis } from "@/lib/phaeleon/types";
import { cn } from "@/lib/utils";

type ProgressiveSection = "summary" | "mechanism" | "expectedEffects" | "practicalSteps" | "emergency";

const STAGGER_MS = 150;

function reportKey(report: InteractionAnalysis): string {
  return `${report.drug1}|${report.drug2}|${report.risk}|${report.summary.slice(0, 40)}`;
}

function sectionsForReport(report: InteractionAnalysis): ProgressiveSection[] {
  const out: ProgressiveSection[] = [];
  if (report.summary.trim()) out.push("summary");
  if (report.mechanism.trim()) out.push("mechanism");
  if (report.expectedEffects.length > 0) out.push("expectedEffects");
  if (report.practicalSteps.length > 0) out.push("practicalSteps");
  if (
    (report.risk === "high" || report.risk === "very_high") &&
    report.emergencySigns.length > 0
  ) {
    out.push("emergency");
  }
  return out;
}

export default function AssistantFirstProgressiveReport({
  report,
  source,
  reveal,
}: {
  report: InteractionAnalysis;
  source: InteractionAnalysis;
  reveal: boolean;
}) {
  const { t } = useTranslation("phaeleon");
  const [visible, setVisible] = useState<ProgressiveSection[]>([]);
  const planned = useMemo(() => sectionsForReport(report), [report]);
  const translateProps = { reveal };
  const risk = report.risk;

  useEffect(() => {
    setVisible([]);
    if (!planned.length) return;

    const timers: number[] = [];
    planned.forEach((section, index) => {
      timers.push(
        window.setTimeout(() => {
          setVisible((prev) => (prev.includes(section) ? prev : [...prev, section]));
        }, index * STAGGER_MS),
      );
    });

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reportKey(report), planned.join(",")]);

  const show = (section: ProgressiveSection) => visible.includes(section);

  return (
    <article className="phaeleon-assistant-first-report mx-auto max-w-3xl space-y-8 py-2">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {report.drug1}
          <span className="mx-2 font-normal text-muted-foreground">×</span>
          {report.drug2}
        </h1>
        <AnalysisRiskBadge risk={risk} label={t(`risk.${risk}`)} />
      </header>

      {show("summary") ? (
        <section id={PHAELEON_REPORT_SECTIONS.summary} className="scroll-mt-4 opacity-100 transition-opacity duration-300">
          <SectionLabel
            label={t("report.summary")}
            severity={sectionSeverityForRisk(risk, "summary")}
          />
          <p className="text-lg font-medium leading-relaxed text-foreground">
            <LiveTranslatedText text={report.summary} sourceText={source.summary} className="block" {...translateProps} />
          </p>
        </section>
      ) : null}

      {show("mechanism") ? (
        <section id={PHAELEON_REPORT_SECTIONS.mechanism} className="scroll-mt-4 opacity-100 transition-opacity duration-300">
          <SectionLabel
            label={t("report.mechanism")}
            severity={sectionSeverityForRisk(risk, "mechanism")}
          />
          <p className="text-base leading-relaxed text-muted-foreground">
            <LiveTranslatedText text={report.mechanism} sourceText={source.mechanism} className="block" {...translateProps} />
          </p>
        </section>
      ) : null}

      {show("expectedEffects") ? (
        <section id={PHAELEON_REPORT_SECTIONS.expectedEffects} className="scroll-mt-4 opacity-100 transition-opacity duration-300">
          <SectionLabel
            label={t("report.expectedEffects")}
            severity={sectionSeverityForRisk(risk, "effects")}
          />
          <ul className="space-y-2 text-base text-muted-foreground">
            {report.expectedEffects.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span className="text-accent/70">·</span>
                <LiveTranslatedText
                  text={item}
                  sourceText={source.expectedEffects[index] ?? item}
                  {...translateProps}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {show("practicalSteps") ? (
        <section id={PHAELEON_REPORT_SECTIONS.practicalSteps} className="scroll-mt-4 opacity-100 transition-opacity duration-300">
          <SectionLabel
            label={t("report.practicalSteps")}
            severity={sectionSeverityForRisk(risk, "steps")}
          />
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {report.practicalSteps.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span className="text-accent/50">·</span>
                <LiveTranslatedText
                  text={item}
                  sourceText={source.practicalSteps[index] ?? item}
                  {...translateProps}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {show("emergency") ? (
        <section
          id={PHAELEON_REPORT_SECTIONS.emergency}
          className={cn(
            "scroll-mt-4 opacity-100 transition-opacity duration-300 border border-red-600/40 bg-red-500/5 p-4",
          )}
        >
          <SectionLabel label={t("report.emergencySigns")} severity="high" />
          <ul className="space-y-1 text-sm text-foreground/90">
            {report.emergencySigns.map((item, index) => (
              <li key={`${item}-${index}`}>
                —{" "}
                <LiveTranslatedText
                  text={item}
                  sourceText={source.emergencySigns[index] ?? item}
                  {...translateProps}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visible.length >= planned.length && planned.length > 0 ? (
        <footer className="space-y-2 border-t border-border/50 pt-4">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground hover:text-foreground">
              <ChevronDown className="size-3" />
              {t("assistantFirst.dataSource")}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">
              {t("assistantFirst.inlineDisclaimer")}
            </CollapsibleContent>
          </Collapsible>
        </footer>
      ) : null}
    </article>
  );
}
