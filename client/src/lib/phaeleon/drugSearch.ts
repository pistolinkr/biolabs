import { drugNameMapping } from "./drugNameMapping";
import type { DrugSearchHit } from "./types";

/** Normalize Korean / typo aliases to canonical English drug names. */
export function convertSearchTerm(term: string): string {
  const lowerTerm = term.toLowerCase().trim();
  if (drugNameMapping[lowerTerm]) return drugNameMapping[lowerTerm];

  for (const [korean, english] of Object.entries(drugNameMapping)) {
    if (korean.includes(lowerTerm) || lowerTerm.includes(korean)) return english;
  }

  const englishNames = Object.values(drugNameMapping);
  for (const englishName of englishNames) {
    const en = englishName.toLowerCase();
    if (en.includes(lowerTerm) || lowerTerm.includes(en)) return englishName;
  }

  return term.trim();
}

export function generateFlexibleQueries(searchTerm: string): string[] {
  const queries: string[] = [];
  const term = searchTerm.toLowerCase().trim();

  queries.push(`openfda.brand_name:"${searchTerm}"+OR+openfda.generic_name:"${searchTerm}"`);

  if (term.length >= 3) {
    queries.push(`openfda.brand_name:${term}+OR+openfda.generic_name:${term}`);
    queries.push(`openfda.brand_name:*${term}*+OR+openfda.generic_name:*${term}*`);
  }

  const words = term.split(/\s+/).filter((word) => word.length >= 2);
  if (words.length > 1) {
    const wordQuery = words
      .map((word) => `openfda.brand_name:*${word}*+OR+openfda.generic_name:*${word}*`)
      .join("+AND+");
    queries.push(wordQuery);
  }

  if (term.length >= 4) {
    for (const fuzzyTerm of generateFuzzyTerms(term)) {
      queries.push(`openfda.brand_name:${fuzzyTerm}+OR+openfda.generic_name:${fuzzyTerm}`);
    }
  }

  return queries;
}

function generateFuzzyTerms(term: string): string[] {
  const fuzzyTerms = new Set<string>();
  const commonMistakes: Record<string, string> = {
    ph: "f",
    f: "ph",
    th: "t",
    t: "th",
    c: "k",
    k: "c",
    z: "s",
    s: "z",
    i: "y",
    y: "i",
  };

  for (const [from, to] of Object.entries(commonMistakes)) {
    if (term.includes(from)) {
      fuzzyTerms.add(term.replace(new RegExp(from, "g"), to));
    }
  }

  return Array.from(fuzzyTerms);
}

export function calculateSimilarity(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) matrix[i] = [i];
  for (let j = 0; j <= len1; j++) matrix[0][j] = j;

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
}

interface OpenFdaResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
  };
}

export function deduplicateAndSort(results: OpenFdaResult[], searchTerm: string): DrugSearchHit[] {
  const uniqueDrugs = new Map<string, DrugSearchHit>();
  const searchLower = searchTerm.toLowerCase();

  for (const drug of results) {
    if (!drug.openfda) continue;
    const brandNames = drug.openfda.brand_name ?? [];
    const genericNames = drug.openfda.generic_name ?? [];

    for (const name of [...brandNames, ...genericNames]) {
      const nameLower = name.toLowerCase();
      if (uniqueDrugs.has(nameLower)) continue;

      let relevanceScore = 0;
      if (nameLower === searchLower) relevanceScore = 100;
      else if (nameLower.startsWith(searchLower)) relevanceScore = 80;
      else if (nameLower.includes(searchLower)) relevanceScore = 60;
      else {
        const similarity = calculateSimilarity(nameLower, searchLower);
        if (similarity > 0.7) relevanceScore = Math.round(similarity * 50);
      }

      if (relevanceScore > 0) {
        uniqueDrugs.set(nameLower, {
          name,
          genericNames,
          brandNames,
          relevanceScore,
        });
      }
    }
  }

  return Array.from(uniqueDrugs.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function sanitizeDrugInput(input: string, maxLength = 80): string {
  if (typeof input !== "string") return "";
  let sanitized = input.slice(0, maxLength);
  sanitized = sanitized.replace(/[<>"']/g, "");
  sanitized = sanitized.replace(/[^\w\s\-().\u3131-\u318E\uAC00-\uD7A3\u1100-\u11FF]/g, "");
  return sanitized.trim();
}
