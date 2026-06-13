import React from "react";
import { useTranslation } from "react-i18next";
import type { AiClientSettings } from "@/lib/ai/aiSettingsStorage";
import type { AiKeysSettings } from "@/lib/ai/aiKeysStorage";
import { maskApiKey, providersWithKeys } from "@/lib/ai/aiKeysStorage";
import { CLIENT_MAX_OUTPUT_TOKENS } from "@/lib/ai/clientProviders";
import type { AiStatusResponse } from "@shared/ai/types";
import type { AiProviderId } from "@shared/ai/types";
import type { UiLocalePreference } from "@shared/i18n/locales";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-[55%]">
        <div className="font-mono text-[10px] uppercase tracking-wide text-foreground">{label}</div>
        {hint ? <div className="mt-0.5 font-mono text-[9px] leading-snug text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "h-5 w-10 border transition-colors disabled:opacity-40",
        checked ? "border-accent bg-accent" : "border-border bg-secondary",
      )}
    />
  );
}

export interface AiSettingsSectionProps {
  settings: AiClientSettings;
  aiKeysSettings: AiKeysSettings;
  status: AiStatusResponse | null;
  statusLoading: boolean;
  isSending: boolean;
  aiConfigured: boolean;
  usingClientKeys: boolean;
  onChange: (patch: Partial<AiClientSettings>) => void;
  onKeysChange: (patch: Partial<AiKeysSettings>) => void;
  onClearKeys: () => void;
  onReset: () => void;
  onRefreshStatus: () => void;
  onTestConnection: () => void;
  onClearChat: () => void;
}

export default function AiSettingsSection({
  settings,
  aiKeysSettings,
  status,
  statusLoading,
  isSending,
  aiConfigured,
  usingClientKeys,
  onChange,
  onKeysChange,
  onClearKeys,
  onReset,
  onRefreshStatus,
  onTestConnection,
  onClearChat,
}: AiSettingsSectionProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { uiLocale, setUiLocale, supportedLocales, localeLabels } = useLocale();
  const clientProviders = providersWithKeys(aiKeysSettings.keys);
  const providerOptions: AiProviderId[] = usingClientKeys
    ? ["auto", ...Array.from(new Set([...clientProviders, ...(status?.available_providers ?? [])]))]
    : ["auto", ...(status?.available_providers ?? [])];
  const maxTokensCap = usingClientKeys
    ? Math.max(CLIENT_MAX_OUTPUT_TOKENS, status?.max_output_tokens ?? 0)
    : (status?.max_output_tokens ?? 1024);

  const providerLabel = (p: AiProviderId) => t(`ai.providers.${p}`);

  const handleResponseLanguageChange = (lang: AiClientSettings["responseLanguage"]) => {
    onChange({ responseLanguage: lang });
  };

  return (
    <div className="space-y-4">
      <div className="workbench-panel-inset p-3">
        <div className="workbench-kicker mb-2">{t("ai.serverStatus")}</div>
        {statusLoading ? (
          <p className="font-mono text-[10px] text-muted-foreground">{t("ai.checking")}</p>
        ) : usingClientKeys ? (
          <div className="space-y-1 font-mono text-[10px] text-foreground">
            <div>{t("ai.clientActive")}</div>
            <div className="text-muted-foreground">
              {t("ai.available", {
                list: clientProviders.join(", ") || t("ai.none"),
              })}
            </div>
            <div className="text-muted-foreground">{t("ai.clientKeysNote")}</div>
            {status?.provider_health && status.provider_health.length > 0 ? (
              <div className="text-muted-foreground">{t("ai.serverFallbackNote")}</div>
            ) : null}
          </div>
        ) : status?.configured ? (
          <div className="space-y-1 font-mono text-[10px] text-foreground">
            <div>
              {t("ai.active", {
                provider: status.active_provider ?? "—",
                model:
                  status.active_provider && status.models[status.active_provider]
                    ? t("ai.activeModel", { model: status.models[status.active_provider] })
                    : "",
              })}
            </div>
            <div className="text-muted-foreground">
              {t("ai.available", {
                list: status.available_providers.join(", ") || t("ai.none"),
              })}
            </div>
            <div className="text-muted-foreground">
              {t("ai.outputLimits", {
                tokens: status.max_output_tokens,
                chars: status.max_context_chars.toLocaleString(),
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {t("ai.notConfigured")}
            </p>
            <p className="font-mono text-[9px] leading-relaxed text-muted-foreground/90">
              {t("ai.staticDeployNote")}
            </p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onRefreshStatus} className="btn-compact">
            {t("ai.refreshStatus")}
          </button>
          <button
            type="button"
            onClick={onTestConnection}
            disabled={!aiConfigured || isSending}
            className="btn-compact disabled:opacity-40"
          >
            {t("ai.testConnection")}
          </button>
        </div>
      </div>

      {status?.configured && !usingClientKeys && status.provider_health && status.provider_health.length > 0 ? (
        <div className="workbench-panel-inset p-3">
          <div className="workbench-kicker mb-1">{t("ai.providerHealth")}</div>
          <p className="mb-2 font-mono text-[9px] leading-snug text-muted-foreground">
            {t("ai.providerHealthHint")}
          </p>
          <div className="space-y-2">
            {status.provider_health.map((h) => {
              const cooling = h.cooldown_until != null && h.cooldown_until > Date.now();
              return (
                <div key={h.id} className="border-b border-border pb-2 font-mono text-[10px] last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{providerLabel(h.id)}</span>
                    <span
                      className={cn(
                        "border px-1.5 py-0.5 text-[9px]",
                        cooling
                          ? "border-amber-500/40 text-amber-600 dark:text-amber-300"
                          : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {cooling ? t("ai.health.cooldown") : t("ai.health.ready")}
                    </span>
                  </div>
                  {h.models.length > 0 ? (
                    <div className="mt-0.5 truncate text-muted-foreground/80" title={h.models.join(", ")}>
                      {t("ai.health.models", { list: h.models.join("  →  ") })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <div className="workbench-kicker mb-2 px-1">{t("ai.clientPrefs")}</div>

        <SettingsRow label={t("ai.interfaceLanguage")} hint={t("ai.interfaceLanguageHint")}>
          <select
            value={uiLocale}
            onChange={(e) => void setUiLocale(e.target.value as UiLocalePreference)}
            className="min-w-[180px] border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground focus:border-accent focus:outline-none"
          >
            <option value="auto">{tc("locale.auto")}</option>
            {supportedLocales.map((code) => (
              <option key={code} value={code}>
                {localeLabels[code]}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow label={t("ai.preferredProvider")} hint={t("ai.preferredProviderHint")}>
          <select
            value={settings.preferredProvider}
            onChange={(e) => onChange({ preferredProvider: e.target.value as AiProviderId })}
            className="min-w-[180px] border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground focus:border-accent focus:outline-none"
          >
            {providerOptions.map((p) => (
              <option key={p} value={p}>
                {providerLabel(p)}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow label={t("ai.responseLanguage")} hint={t("ai.responseLanguageHint")}>
          <select
            value={settings.responseLanguage}
            onChange={(e) =>
              handleResponseLanguageChange(e.target.value as AiClientSettings["responseLanguage"])
            }
            className="min-w-[140px] border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground focus:border-accent focus:outline-none"
          >
            <option value="auto">{t("ai.responseLanguageAuto")}</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
            <option value="ja">日本語</option>
          </select>
        </SettingsRow>

        <SettingsRow
          label={t("ai.temperature")}
          hint={t("ai.temperatureHint", { value: settings.temperature.toFixed(2) })}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-36 accent-accent"
          />
        </SettingsRow>

        <SettingsRow
          label={t("ai.maxTokens")}
          hint={t("ai.maxTokensHint", { value: settings.maxOutputTokens, cap: maxTokensCap })}
        >
          <input
            type="range"
            min={256}
            max={maxTokensCap}
            step={64}
            value={Math.min(settings.maxOutputTokens, maxTokensCap)}
            onChange={(e) => onChange({ maxOutputTokens: parseInt(e.target.value, 10) })}
            className="w-36 accent-accent"
          />
        </SettingsRow>

        <SettingsRow label={t("ai.includeSequences")} hint={t("ai.includeSequencesHint")}>
          <Toggle
            checked={settings.includeFullSequences}
            onChange={(v) => onChange({ includeFullSequences: v })}
          />
        </SettingsRow>

        <SettingsRow label={t("ai.compactContext")} hint={t("ai.compactContextHint")}>
          <Toggle checked={settings.compactContext} onChange={(v) => onChange({ compactContext: v })} />
        </SettingsRow>

        <SettingsRow label={t("ai.autoOpenChat")} hint={t("ai.autoOpenChatHint")}>
          <Toggle
            checked={settings.autoOpenChatOnExplain}
            onChange={(v) => onChange({ autoOpenChatOnExplain: v })}
          />
        </SettingsRow>

        <SettingsRow label={t("ai.residuePanel")} hint={t("ai.residuePanelHint")}>
          <Toggle
            checked={settings.showResidueExplainPopup}
            onChange={(v) => onChange({ showResidueExplainPopup: v })}
          />
        </SettingsRow>
      </div>

      <div className="workbench-panel-inset p-3">
        <div className="workbench-kicker mb-1">{t("ai.apiKeys")}</div>
        <p className="mb-3 font-mono text-[9px] leading-relaxed text-muted-foreground">{t("ai.apiKeysHint")}</p>

        <SettingsRow label={t("ai.useOwnKeys")} hint={t("ai.useOwnKeysHint")}>
          <Toggle
            checked={aiKeysSettings.useOwnApiKeys}
            onChange={(v) => onKeysChange({ useOwnApiKeys: v })}
          />
        </SettingsRow>

        {aiKeysSettings.useOwnApiKeys ? (
          <div className="space-y-2 pt-1">
            {(
              [
                { id: "gemini" as const, label: "Gemini", link: "https://aistudio.google.com/apikey" },
                { id: "openrouter" as const, label: "OpenRouter", link: "https://openrouter.ai/keys" },
                { id: "huggingface" as const, label: "Hugging Face", link: "https://huggingface.co/settings/tokens" },
              ] as const
            ).map(({ id, label, link }) => (
              <div key={id} className="border-b border-border pb-2 last:border-b-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-foreground">{label}</span>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] text-accent hover:underline"
                  >
                    {t("ai.getKey")}
                  </a>
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  value={aiKeysSettings.keys[id]}
                  placeholder={
                    aiKeysSettings.keys[id]
                      ? t("ai.keySaved", { mask: maskApiKey(aiKeysSettings.keys[id]) })
                      : t("ai.keyPlaceholder", { provider: label })
                  }
                  onChange={(e) =>
                    onKeysChange({ keys: { ...aiKeysSettings.keys, [id]: e.target.value } })
                  }
                  className="w-full border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                />
              </div>
            ))}
            <button type="button" onClick={onClearKeys} className="btn-compact mt-1">
              {t("ai.clearKeys")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={onClearChat} className="btn-compact">
          {t("ai.clearChat")}
        </button>
        <button type="button" onClick={onReset} className="btn-compact">
          {t("ai.resetDefaults")}
        </button>
      </div>
    </div>
  );
}

export { SettingsRow, Toggle };
