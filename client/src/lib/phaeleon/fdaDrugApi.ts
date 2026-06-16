import type { DrugProfile, FdaSearchResponse } from "./types";

export interface FdaSearchOptions {
  fuzzy?: boolean;
  signal?: AbortSignal;
}

export async function searchFdaDrugs(
  query: string,
  options: FdaSearchOptions = {},
): Promise<FdaSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (options.fuzzy === false) params.set("fuzzy", "0");
  const res = await fetch(`/api/phaeleon/fda/search?${params.toString()}`, { signal: options.signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `FDA search failed (${res.status})`);
  }
  return res.json() as Promise<FdaSearchResponse>;
}

export async function fetchDrugProfile(
  name: string,
  options: { signal?: AbortSignal } = {},
): Promise<DrugProfile> {
  const params = new URLSearchParams({ name });
  const res = await fetch(`/api/phaeleon/fda/label?${params.toString()}`, { signal: options.signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Drug profile failed (${res.status})`);
  }
  return res.json() as Promise<DrugProfile>;
}
