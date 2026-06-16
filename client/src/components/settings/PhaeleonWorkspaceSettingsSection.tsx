import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsRow, Toggle } from "@/components/settings/AiSettingsSection";
import { PresetWireframe } from "@/components/phaeleon/PhaeleonPresetWireframes";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import {
  PHAELEON_LAYOUT_PRESET_IDS,
  type PhaeleonLayoutPresetId,
} from "@/lib/phaeleon/phaeleonLayoutPresets";
import { listPhaeleonPairSessions } from "@/lib/phaeleon/phaeleonPairSessionHistory";
import { formatSessionIdShort, getOrCreateAppSessionId } from "@/lib/session/cookieSession";
import { cn } from "@/lib/utils";

export default function PhaeleonWorkspaceSettingsSection() {
  const { t } = useTranslation("settings");
  const {
    settings,
    updateSettings,
    setLayoutPreset,
    resetLayoutToPreset,
    resetSettings,
    clearSession,
    assignDrugToSlot,
    drug1,
    drug2,
    analysis,
  } = usePhaeleon();

  const activePreset = settings.layoutPreset === "custom" ? null : settings.layoutPreset;
  const sessionId = getOrCreateAppSessionId();
  const pairSessions = listPhaeleonPairSessions();

  return (
    <div className="space-y-5">
      <div>
        <div className="workbench-kicker">{t("phaeleonWorkspace.layout")}</div>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
          {t("phaeleonWorkspace.layoutHint")}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          {PHAELEON_LAYOUT_PRESET_IDS.map((preset) => {
            const selected = preset === activePreset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setLayoutPreset(preset)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-3 border border-l-2 px-2.5 py-2 text-left transition-colors",
                  selected
                    ? "border-accent/50 border-l-accent bg-secondary"
                    : "border-border border-l-transparent bg-background hover:border-muted-foreground hover:bg-secondary/60",
                )}
              >
                <PresetWireframe preset={preset} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-wide text-foreground">
                    {t(`phaeleonWorkspace.presets.${preset}`)}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] leading-snug text-muted-foreground">
                    {t(`phaeleonWorkspace.presets.${preset}Hint`)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {settings.layoutPreset === "custom" ? (
          <p className="mt-2 font-mono text-[9px] text-muted-foreground">{t("phaeleonWorkspace.customLayout")}</p>
        ) : null}
        <button
          type="button"
          onClick={resetLayoutToPreset}
          disabled={activePreset === null}
          className="btn-compact mt-2 disabled:opacity-40"
        >
          {t("phaeleonWorkspace.resetLayout")}
        </button>
      </div>

      <div className="space-y-3">
        <div className="workbench-kicker">{t("phaeleonWorkspace.analysis")}</div>
        <SettingsRow label={t("phaeleonWorkspace.analysisMode")} hint={t("phaeleonWorkspace.analysisModeHint")}>
          <div className="flex border border-border">
            {(["rules", "rules_and_ai"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateSettings({ analysisMode: mode })}
                className={cn(
                  "px-2 py-1 font-mono text-[9px] uppercase tracking-wide transition-colors",
                  settings.analysisMode === mode
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`phaeleonWorkspace.analysisModes.${mode}`)}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label={t("phaeleonWorkspace.autoAnalyze")} hint={t("phaeleonWorkspace.autoAnalyzeHint")}>
          <Toggle
            checked={settings.autoAnalyzeOnPair}
            onChange={(v) => updateSettings({ autoAnalyzeOnPair: v })}
          />
        </SettingsRow>
        <SettingsRow label={t("phaeleonWorkspace.autoOpenChat")} hint={t("phaeleonWorkspace.autoOpenChatHint")}>
          <Toggle
            checked={settings.autoOpenChatOnAnalyze}
            onChange={(v) => updateSettings({ autoOpenChatOnAnalyze: v })}
          />
        </SettingsRow>
      </div>

      <div className="space-y-3">
        <div className="workbench-kicker">{t("phaeleonWorkspace.search")}</div>
        <SettingsRow label={t("phaeleonWorkspace.fuzzySearch")} hint={t("phaeleonWorkspace.fuzzySearchHint")}>
          <Toggle
            checked={settings.fuzzySearchEnabled}
            onChange={(v) => updateSettings({ fuzzySearchEnabled: v })}
          />
        </SettingsRow>
      </div>

      <div className="space-y-3">
        <div className="workbench-kicker">{t("phaeleonWorkspace.session")}</div>
        <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
          {t("phaeleonWorkspace.sessionStatus", {
            drugA: drug1?.name ?? "—",
            drugB: drug2?.name ?? "—",
            hasAnalysis: analysis ? t("phaeleonWorkspace.sessionHasAnalysis") : t("phaeleonWorkspace.sessionNoAnalysis"),
          })}
        </p>
        <p className="font-mono text-[9px] text-muted-foreground">
          {t("phaeleonWorkspace.sessionId", { id: formatSessionIdShort(sessionId) })}
        </p>
        {pairSessions.length > 0 ? (
          <div className="space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("phaeleonWorkspace.pairHistory")}
            </p>
            <ul className="space-y-1 border border-border p-2">
            {pairSessions.slice(0, 6).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="w-full px-1 py-1 text-left font-mono text-[9px] text-muted-foreground hover:text-accent"
                  onClick={() => {
                    assignDrugToSlot(
                      { name: entry.drug1, genericNames: [], brandNames: [], relevanceScore: 1 },
                      "drug1",
                    );
                    assignDrugToSlot(
                      { name: entry.drug2, genericNames: [], brandNames: [], relevanceScore: 1 },
                      "drug2",
                    );
                  }}
                >
                  {entry.drug1} + {entry.drug2}
                  {entry.risk ? ` · ${entry.risk}` : ""}
                </button>
              </li>
            ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={clearSession} className="btn-compact">
            {t("phaeleonWorkspace.clearSession")}
          </button>
          <button type="button" onClick={resetSettings} className="btn-compact">
            {t("phaeleonWorkspace.resetDefaults")}
          </button>
        </div>
      </div>
    </div>
  );
}
