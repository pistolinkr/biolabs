import { drugNameMapping } from "./drugNameMapping";
import { calculateSimilarity, convertSearchTerm } from "./drugSearch";
import type { DrugSearchHit } from "./types";

const MAX_LOCAL_HITS = 12;

function pushHit(
  hits: Map<string, DrugSearchHit>,
  name: string,
  score: number,
  genericNames: string[] = [],
  brandNames: string[] = [],
): void {
  const key = name.toLowerCase();
  const existing = hits.get(key);
  if (existing && existing.relevanceScore >= score) return;
  hits.set(key, {
    name,
    genericNames,
    brandNames,
    relevanceScore: score,
  });
}

/** Instant local suggestions from KO/EN mapping before OpenFDA round-trip. */
export function searchLocalDrugMapping(rawQuery: string): DrugSearchHit[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const lower = query.toLowerCase();
  const converted = convertSearchTerm(query);
  const convertedLower = converted.toLowerCase();
  const hits = new Map<string, DrugSearchHit>();

  if (drugNameMapping[lower]) {
    pushHit(hits, drugNameMapping[lower], 100, [drugNameMapping[lower]]);
  }

  if (convertedLower !== lower) {
    pushHit(hits, converted, 95, [converted]);
  }

  for (const [alias, english] of Object.entries(drugNameMapping)) {
    if (alias === lower || english.toLowerCase() === lower) {
      pushHit(hits, english, 100, [english], [alias]);
      continue;
    }
    if (alias.includes(lower) || lower.includes(alias)) {
      pushHit(hits, english, 75, [english], [alias]);
      continue;
    }
    if (english.toLowerCase().includes(lower) || lower.includes(english.toLowerCase())) {
      pushHit(hits, english, 70, [english]);
    }
  }

  for (const english of Array.from(new Set(Object.values(drugNameMapping)))) {
    const enLower = english.toLowerCase();
    if (enLower.startsWith(lower)) {
      pushHit(hits, english, 85, [english]);
    } else if (enLower.includes(lower)) {
      pushHit(hits, english, 65, [english]);
    } else if (lower.length >= 3) {
      const sim = calculateSimilarity(enLower, lower);
      if (sim > 0.78) pushHit(hits, english, Math.round(sim * 50), [english]);
    }
  }

  return Array.from(hits.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_LOCAL_HITS);
}

export function mergeDrugSearchHits(local: DrugSearchHit[], remote: DrugSearchHit[]): DrugSearchHit[] {
  const merged = new Map<string, DrugSearchHit>();
  for (const hit of [...local, ...remote]) {
    const key = hit.name.toLowerCase();
    const existing = merged.get(key);
    if (!existing || hit.relevanceScore > existing.relevanceScore) {
      merged.set(key, hit);
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
}
