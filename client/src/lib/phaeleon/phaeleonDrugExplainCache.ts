import type { AiErrorCode } from "@shared/ai/types";
import type { SupportedUiLocale } from "@shared/i18n/locales";
import { loadAiClientSettings } from "@/lib/ai/aiSettingsStorage";
import { loadAiKeysSettings } from "@/lib/ai/aiKeysStorage";
import { AiRequestError, noticeFromUnknownError } from "@/lib/ai/userErrors";
import { explainDrugWithAi } from "@/lib/phaeleon/phaeleonDrugExplain";
import type { DrugProfile } from "@/lib/phaeleon/types";

export type DrugExplainStatus = "idle" | "loading" | "ready" | "error";

export interface DrugExplainSnapshot {
  status: DrugExplainStatus;
  content: string | null;
  error: string | null;
  errorCode?: AiErrorCode;
}

const EMPTY_SNAPSHOT: DrugExplainSnapshot = { status: "idle", content: null, error: null };

const cache = new Map<string, DrugExplainSnapshot>();
const listeners = new Map<string, Set<(snapshot: DrugExplainSnapshot) => void>>();

function profileFingerprint(profile: DrugProfile | null): string {
  if (!profile) return "pending";
  return profile.source;
}

export function drugExplainCacheKey(
  locale: SupportedUiLocale,
  drugName: string,
  profile: DrugProfile | null,
): string {
  return `${locale}::${drugName.trim().toLowerCase()}::${profileFingerprint(profile)}`;
}

function notify(key: string) {
  const snapshot = cache.get(key) ?? EMPTY_SNAPSHOT;
  listeners.get(key)?.forEach((listener) => listener(snapshot));
}

export function getDrugExplainSnapshot(key: string): DrugExplainSnapshot {
  return cache.get(key) ?? EMPTY_SNAPSHOT;
}

export function subscribeDrugExplain(key: string, listener: (snapshot: DrugExplainSnapshot) => void) {
  const set = listeners.get(key) ?? new Set();
  if (!listeners.has(key)) listeners.set(key, set);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

export function prefetchDrugExplain(params: {
  drugName: string;
  slotLabel: string;
  profile: DrugProfile | null;
  locale: SupportedUiLocale;
}): string {
  const key = drugExplainCacheKey(params.locale, params.drugName, params.profile);
  const existing = cache.get(key);
  if (existing?.status === "loading" || existing?.status === "ready") return key;

  cache.set(key, { status: "loading", content: null, error: null });
  notify(key);

  const keys = loadAiKeysSettings().keys;
  const aiSettings = loadAiClientSettings();

  void explainDrugWithAi({
    drugName: params.drugName,
    slotLabel: params.slotLabel,
    profile: params.profile,
    locale: params.locale,
    keys,
    preferredProvider: aiSettings.preferredProvider,
  })
    .then((content) => {
      cache.set(key, { status: "ready", content, error: null });
      notify(key);
    })
    .catch((err) => {
      cache.set(key, {
        status: "error",
        content: null,
        error: noticeFromUnknownError(err),
        errorCode: err instanceof AiRequestError ? err.code : "AI_UNKNOWN",
      });
      notify(key);
    });

  return key;
}
