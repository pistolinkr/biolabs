import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import AiSettingsSection from "@/components/settings/AiSettingsSection";
import { SettingsRow, Toggle } from "@/components/settings/AiSettingsSection";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { UiLocalePreference } from "@shared/i18n/locales";
import { resolveUiLocale } from "@shared/i18n/locales";
import { APP_VERSION_LABEL } from "@shared/version";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "ai" | "workspace" | "about";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export default function SettingsPanel({ isOpen, onClose, initialTab = "general" }: SettingsPanelProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const { systemTheme, setTheme } = useTheme();
  const { uiLocale, resolvedLocale, setUiLocale, supportedLocales, localeLabels } = useLocale();
  const {
    aiSettings,
    updateAiSettings,
    resetAiSettings,
    status,
    statusLoading,
    isSending,
    refreshAiStatus,
    testAiConnection,
    clearMessages,
  } = useAssistant();

  const [workspacePrefs, setWorkspacePrefs] = useState({
    autoSave: true,
    autoSaveInterval: 5,
  });

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "general", label: t("tabs.general") },
    { id: "ai", label: t("tabs.ai") },
    { id: "workspace", label: t("tabs.workspace") },
    { id: "about", label: t("tabs.about") },
  ];

  const syncAiResponseLanguage = (preference: UiLocalePreference) => {
    const resolved = resolveUiLocale(preference);
    if (preference === "auto") {
      updateAiSettings({ responseLanguage: "auto" });
      return;
    }
    if (resolved === "en" || resolved === "ko" || resolved === "ja") {
      updateAiSettings({ responseLanguage: resolved });
    }
  };

  const handleUiLocaleChange = (next: UiLocalePreference) => {
    void setUiLocale(next);
    syncAiResponseLanguage(next);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-[min(640px,85vh)] w-[min(920px,calc(100vw-2rem))] flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
              {t("title")}
            </h2>
            <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-transparent p-1.5 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav className="flex w-[140px] shrink-0 flex-col border-r border-border bg-background">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "border-b border-border px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                  tab === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="panel-content min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {tab === "general" && (
              <div className="space-y-4">
                <div className="workbench-kicker">{t("general.appearance")}</div>
                <SettingsRow label={tc("locale.label")} hint={tc("locale.hint")}>
                  <select
                    value={uiLocale}
                    onChange={(e) => handleUiLocaleChange(e.target.value as UiLocalePreference)}
                    className="min-w-[160px] border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="auto">{tc("locale.auto")}</option>
                    {supportedLocales.map((code) => (
                      <option key={code} value={code}>
                        {localeLabels[code]}
                      </option>
                    ))}
                  </select>
                </SettingsRow>
                {uiLocale === "auto" ? (
                  <p className="px-1 font-mono text-[9px] text-muted-foreground">
                    {tc("locale.autoResolved", { locale: localeLabels[resolvedLocale] })}
                  </p>
                ) : null}
                <SettingsRow label={t("general.colorTheme")} hint={t("general.colorThemeHint")}>
                  <select
                    value={systemTheme ?? "system"}
                    onChange={(e) => setTheme(e.target.value)}
                    className="min-w-[140px] border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="system">{tc("theme.system")}</option>
                    <option value="dark">{tc("theme.dark")}</option>
                    <option value="light">{tc("theme.light")}</option>
                  </select>
                </SettingsRow>
                <SettingsRow label={t("general.scientificHud")} hint={t("general.scientificHudHint")}>
                  <Toggle checked={true} onChange={() => {}} disabled />
                </SettingsRow>
                <p className="font-mono text-[9px] text-muted-foreground">{t("general.viewportNote")}</p>
              </div>
            )}

            {tab === "ai" && (
              <AiSettingsSection
                settings={aiSettings}
                status={status}
                statusLoading={statusLoading}
                isSending={isSending}
                onChange={updateAiSettings}
                onReset={resetAiSettings}
                onRefreshStatus={() => void refreshAiStatus()}
                onTestConnection={() => void testAiConnection()}
                onClearChat={clearMessages}
              />
            )}

            {tab === "workspace" && (
              <div className="space-y-4">
                <div className="workbench-kicker">{t("workspace.persistence")}</div>
                <SettingsRow label={t("workspace.autoSave")} hint={t("workspace.autoSaveHint")}>
                  <Toggle
                    checked={workspacePrefs.autoSave}
                    onChange={(v) => setWorkspacePrefs((p) => ({ ...p, autoSave: v }))}
                  />
                </SettingsRow>
                {workspacePrefs.autoSave ? (
                  <SettingsRow
                    label={t("workspace.autoSaveInterval")}
                    hint={t("workspace.autoSaveIntervalHint", { minutes: workspacePrefs.autoSaveInterval })}
                  >
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={workspacePrefs.autoSaveInterval}
                      onChange={(e) =>
                        setWorkspacePrefs((p) => ({
                          ...p,
                          autoSaveInterval: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-36 accent-accent"
                    />
                  </SettingsRow>
                ) : null}
                <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">{t("workspace.saveNote")}</p>
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-3 font-mono text-[10px] text-muted-foreground">
                <div className="workbench-kicker text-foreground">{t("about.kicker")}</div>
                <div>{t("about.version", { version: APP_VERSION_LABEL })}</div>
                <div>{t("about.stack")}</div>
                <div className="pt-2 text-[9px]">{t("about.copyright")}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-4 py-3">
          <button type="button" onClick={onClose} className="btn-compact">
            {tc("actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SettingsTab };
