import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  dismissLocaleSuggestion,
  isLocaleSuggestionDismissed,
} from "@/lib/localeSuggestionStorage";
import {
  getRegionDisplayName,
  inferRegionalLocale,
  type RegionalLocaleInference,
} from "@shared/i18n/locales";

export default function LocaleSuggestionBanner() {
  const { t } = useTranslation("common");
  const { resolvedLocale, setUiLocale, localeLabels } = useLocale();
  const [inference, setInference] = useState<RegionalLocaleInference | null>(null);

  useEffect(() => {
    const regional = inferRegionalLocale();
    if (!regional) {
      setInference(null);
      return;
    }
    if (regional.locale === resolvedLocale) {
      setInference(null);
      return;
    }
    if (isLocaleSuggestionDismissed(regional.locale)) {
      setInference(null);
      return;
    }
    setInference(regional);
  }, [resolvedLocale]);

  const regionName = useMemo(() => {
    if (!inference) return "";
    return getRegionDisplayName(inference.regionCode, resolvedLocale);
  }, [inference, resolvedLocale]);

  if (!inference) return null;

  const languageName = localeLabels[inference.locale];

  const handleAccept = () => {
    dismissLocaleSuggestion(inference.locale);
    void setUiLocale(inference.locale);
    setInference(null);
  };

  const handleDismiss = () => {
    dismissLocaleSuggestion(inference.locale);
    setInference(null);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("localeSuggestion.ariaLabel")}
      className="fixed bottom-4 left-1/2 z-[70] flex w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 border border-border bg-card px-4 py-3 text-card-foreground shadow-2xl"
    >
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] leading-relaxed text-foreground">
          {t("localeSuggestion.message", { region: regionName, language: languageName })}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="border border-accent bg-accent/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:bg-accent/20"
        >
          {t("localeSuggestion.accept", { language: languageName })}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="border border-border bg-secondary px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          {t("localeSuggestion.dismiss")}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("actions.close")}
          className="border border-transparent p-1 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
