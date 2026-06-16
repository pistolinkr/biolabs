export interface PhaeleonInteractionResearch {
  query: string;
  source: "pubmed";
  snippets: { pmid: string; title: string; url: string }[];
}

export async function fetchInteractionResearch(
  drug1: string,
  drug2: string,
  signal?: AbortSignal,
): Promise<PhaeleonInteractionResearch> {
  const params = new URLSearchParams({ drug1, drug2 });
  const res = await fetch(`/api/phaeleon/research/interaction?${params.toString()}`, { signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Research fetch failed (${res.status})`);
  }
  return res.json() as Promise<PhaeleonInteractionResearch>;
}
