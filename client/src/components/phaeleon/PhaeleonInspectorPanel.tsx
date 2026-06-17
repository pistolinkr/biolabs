import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { PhaeleonDrugSlotCard } from "@/components/phaeleon/PhaeleonDrugCards";
import {
  PhaeleonPanelHeader,
  PhaeleonPanelSection,
  phaeleonPanel,
} from "@/components/phaeleon/phaeleonPanelChrome";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { buildFdaLabelSearchUrl } from "@/lib/phaeleon/fdaLabelUrl";
import type { DrugProfile } from "@/lib/phaeleon/types";
import { cn } from "@/lib/utils";

function profileSourceLabel(t: (key: string) => string, source: DrugProfile["source"]): string {
  switch (source) {
    case "fda":
      return t("inspector.drugProfile.sourceFda");
    case "local":
      return t("inspector.drugProfile.sourceLocal");
    case "mixed":
      return t("inspector.drugProfile.sourceMixed");
    default:
      return t("inspector.drugProfile.sourceNone");
  }
}

function InspectorGuide({ recentSearches }: { recentSearches: string[] }) {
  const { t } = useTranslation("phaeleon");
  const { setSearchQuery } = usePhaeleon();

  return (
    <div className={phaeleonPanel.boxEmpty}>
      <p className={phaeleonPanel.microLabel}>{t("inspector.guide.title")}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
        <li>{t("inspector.guide.step1")}</li>
        <li>{t("inspector.guide.step2")}</li>
        <li>{t("inspector.guide.step3")}</li>
      </ol>
      {recentSearches.length > 0 ? (
        <div className="mt-3">
          <p className={phaeleonPanel.microLabel}>{t("search.recent")}</p>
          <ul className="mt-1.5 space-y-1">
            {recentSearches.slice(0, 5).map((query) => (
              <li key={query}>
                <button
                  type="button"
                  onClick={() => setSearchQuery(query)}
                  className="text-left text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {query}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DrugProfileSection({
  drug,
  profile,
  loading,
}: {
  drug: { name: string } | null;
  profile: DrugProfile | null;
  loading: boolean;
}) {
  const { t } = useTranslation("phaeleon");

  if (!drug) {
    return null;
  }

  const labelUrl = buildFdaLabelSearchUrl(drug.name);

  return (
    <div className={phaeleonPanel.box}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className={phaeleonPanel.microLabel}>{t("inspector.drugProfile.title")}</p>
          <h3 className="mt-1 text-sm font-medium">{drug.name}</h3>
        </div>
        {loading ? <Loader2 size={14} className="mt-1 shrink-0 animate-spin text-muted-foreground" /> : null}
      </div>

      <a
        href={labelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 inline-flex items-center gap-1 text-[10px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("inspector.drugProfile.fdaLink")}
        <ExternalLink size={10} />
      </a>

      {profile?.category ? (
        <div className="mb-3">
          <p className={phaeleonPanel.microLabel}>{t("inspector.drugProfile.category")}</p>
          <p className="mt-0.5 text-xs text-accent">{profile.category}</p>
        </div>
      ) : null}

      {profile?.route ? (
        <div className="mb-3">
          <p className={phaeleonPanel.microLabel}>{t("inspector.drugProfile.route")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{profile.route}</p>
        </div>
      ) : null}

      {profile?.summary ? (
        <div className="mb-3">
          <p className={phaeleonPanel.microLabel}>{t("inspector.drugProfile.overview")}</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{profile.summary}</p>
        </div>
      ) : (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{t("inspector.drugProfile.noOverview")}</p>
      )}

      {profile?.indications && profile.indications !== profile.summary ? (
        <div className="mb-3">
          <p className={phaeleonPanel.microLabel}>{t("inspector.drugProfile.indications")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profile.indications}</p>
        </div>
      ) : null}

      {profile?.warnings ? (
        <div className={cn(phaeleonPanel.box, "mb-3 bg-card p-2")}>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-red-500/90">
            {t("inspector.drugProfile.warnings")}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{profile.warnings}</p>
        </div>
      ) : null}

      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
        {profile ? profileSourceLabel(t, profile.source) : t("inspector.drugProfile.sourceNone")}
      </p>
    </div>
  );
}

export default function PhaeleonInspectorPanel() {
  const { t } = useTranslation("phaeleon");
  const {
    drug1,
    drug2,
    analysis,
    setActiveSlot,
    inspectorSlot,
    setInspectorSlot,
    clearDrug,
    drugProfile,
    drugProfileLoading,
    recentSearches,
  } = usePhaeleon();

  const [sessionOpen, setSessionOpen] = useState(false);
  const focusedDrug = inspectorSlot === "drug2" ? drug2 : drug1;
  const hasAnyDrug = Boolean(drug1 || drug2);

  const rows = analysis
    ? [
        { key: "risk", value: analysis.riskLabel },
        { key: "pair", value: `${analysis.drug1} + ${analysis.drug2}` },
        { key: "effects", value: String(analysis.expectedEffects.length) },
        { key: "steps", value: String(analysis.practicalSteps.length) },
      ]
    : [];

  const focusSlot = (slot: "drug1" | "drug2") => {
    setInspectorSlot(slot);
    setActiveSlot(slot);
  };

  return (
    <aside className={cn(phaeleonPanel.shell, "min-w-0 overflow-hidden")}>
      <PhaeleonPanelHeader kicker={t("panels.inspector.kicker")} title={t("panels.inspector.title")} />

      <div className="workstation-scroll-region min-h-0 flex-1">
        {!hasAnyDrug ? (
          <PhaeleonPanelSection>
            <InspectorGuide recentSearches={recentSearches} />
          </PhaeleonPanelSection>
        ) : null}

        <PhaeleonPanelSection label={t("inspector.assignedDrugs")} className="space-y-2">
          <PhaeleonDrugSlotCard
            label={t("drugA")}
            drug={drug1}
            active={inspectorSlot === "drug1"}
            onSelect={() => focusSlot("drug1")}
            onClear={() => clearDrug("drug1")}
          />
          <PhaeleonDrugSlotCard
            label={t("drugB")}
            drug={drug2}
            active={inspectorSlot === "drug2"}
            onSelect={() => focusSlot("drug2")}
            onClear={() => clearDrug("drug2")}
          />
        </PhaeleonPanelSection>

        {hasAnyDrug ? (
          <PhaeleonPanelSection>
            <DrugProfileSection drug={focusedDrug} profile={drugProfile} loading={drugProfileLoading} />
          </PhaeleonPanelSection>
        ) : null}

        <PhaeleonPanelSection>
          <Collapsible open={sessionOpen} onOpenChange={setSessionOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <p className={phaeleonPanel.sectionLabel}>{t("inspector.session")}</p>
              <ChevronDown
                size={14}
                className={cn("shrink-0 text-muted-foreground transition-transform", sessionOpen && "rotate-180")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {analysis ? (
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b border-border">
                        <th className="py-2 pr-2 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                          {t(`inspector.fields.${row.key}`)}
                        </th>
                        <td className={cn("py-2 text-right", row.key === "risk" && "font-medium text-accent")}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">{t("inspector.noAnalysis")}</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </PhaeleonPanelSection>

        <PhaeleonPanelSection label={t("inspector.source")} last>
          <p className="text-[10px] leading-relaxed text-muted-foreground">{t("inspector.sourceNote")}</p>
        </PhaeleonPanelSection>
      </div>
    </aside>
  );
}
