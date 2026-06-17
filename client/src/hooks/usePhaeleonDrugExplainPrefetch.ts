import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { prefetchDrugExplain } from "@/lib/phaeleon/phaeleonDrugExplainCache";

/** Prefetch Binary drug explain copy as soon as slots are filled (and again when FDA profile arrives). */
export function usePhaeleonDrugExplainPrefetch() {
  const { t } = useTranslation("phaeleon");
  const { resolvedLocale } = useLocale();
  const { drug1, drug2, drug1Profile, drug2Profile } = usePhaeleon();

  useEffect(() => {
    if (!drug1) return;
    prefetchDrugExplain({
      drugName: drug1.name,
      slotLabel: t("drugA"),
      profile: drug1Profile,
      locale: resolvedLocale,
    });
  }, [drug1, drug1Profile, resolvedLocale, t]);

  useEffect(() => {
    if (!drug2) return;
    prefetchDrugExplain({
      drugName: drug2.name,
      slotLabel: t("drugB"),
      profile: drug2Profile,
      locale: resolvedLocale,
    });
  }, [drug2, drug2Profile, resolvedLocale, t]);
}
