import { lookupLocalDrugInfo } from "./interactionRules";
import type { DrugProfile } from "./types";

const FDA_TEXT_MAX = 1200;

export function normalizeDrugKey(name: string): string {
  return name.toLowerCase().trim().split(/\s+/)[0] ?? name.toLowerCase();
}

export function stripFdaLabelText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FDA_TEXT_MAX);
}

function firstLabelField(value: string[] | string | undefined): string | null {
  if (!value) return null;
  const text = Array.isArray(value) ? value[0] : value;
  if (!text?.trim()) return null;
  return stripFdaLabelText(text);
}

interface FdaLabelResult {
  indications_and_usage?: string[];
  purpose?: string[];
  description?: string[];
  warnings?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    pharm_class_epc?: string[];
    route?: string[];
  };
}

export function buildDrugProfileFromFdaLabel(name: string, result: FdaLabelResult | null): DrugProfile {
  const local = lookupLocalDrugInfo(name);
  const purpose = result ? firstLabelField(result.purpose) : null;
  const indications = result ? firstLabelField(result.indications_and_usage) : null;
  const description = result ? firstLabelField(result.description) : null;
  const warnings = result ? firstLabelField(result.warnings) : null;
  const pharmClass = result?.openfda?.pharm_class_epc?.[0] ?? null;
  const route = result?.openfda?.route?.[0] ?? null;

  const category = local?.category ?? pharmClass;
  const summary =
    purpose ??
    indications ??
    description ??
    local?.description ??
    null;

  const hasFda = Boolean(purpose || indications || description || warnings || pharmClass || route);
  const source: DrugProfile["source"] = local && hasFda ? "mixed" : hasFda ? "fda" : local ? "local" : "none";

  return {
    name,
    category,
    summary,
    purpose,
    indications,
    description,
    warnings,
    route,
    source,
  };
}

export function buildLocalOnlyDrugProfile(name: string): DrugProfile {
  return buildDrugProfileFromFdaLabel(name, null);
}
