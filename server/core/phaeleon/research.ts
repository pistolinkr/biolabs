export interface PubMedSnippet {
  pmid: string;
  title: string;
  url: string;
}

export interface InteractionResearchResult {
  query: string;
  source: "pubmed";
  snippets: PubMedSnippet[];
}

const PUBMED_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

function sanitizeDrugToken(name: string): string {
  return name.trim().replace(/[^\w\s+-]/g, "").slice(0, 80);
}

export async function searchPubMedDrugInteraction(
  drug1: string,
  drug2: string,
): Promise<InteractionResearchResult> {
  const a = sanitizeDrugToken(drug1);
  const b = sanitizeDrugToken(drug2);
  const query = `${a} ${b} drug interaction`;
  const term = encodeURIComponent(`(${a}[Title/Abstract]) AND (${b}[Title/Abstract]) AND (drug interaction[Title/Abstract])`);

  const searchParams = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    retmax: "5",
    sort: "relevance",
    term,
  });

  const searchRes = await fetch(`${PUBMED_ESEARCH}?${searchParams.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": "Biolabs-Phaeleon/1.0" },
  });
  if (!searchRes.ok) {
    throw new Error(`PubMed search failed (${searchRes.status})`);
  }

  const searchJson = (await searchRes.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchJson.esearchresult?.idlist ?? [];
  if (ids.length === 0) {
    return { query, source: "pubmed", snippets: [] };
  }

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    id: ids.join(","),
  });

  const summaryRes = await fetch(`${PUBMED_ESUMMARY}?${summaryParams.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": "Biolabs-Phaeleon/1.0" },
  });
  if (!summaryRes.ok) {
    throw new Error(`PubMed summary failed (${summaryRes.status})`);
  }

  const summaryJson = (await summaryRes.json()) as {
    result?: Record<string, { title?: string; uid?: string } | string>;
  };
  const result = summaryJson.result ?? {};

  const snippets: PubMedSnippet[] = ids
    .map((id) => {
      const entry = result[id];
      if (!entry || typeof entry === "string") return null;
      const title = entry.title?.trim();
      if (!title) return null;
      return {
        pmid: id,
        title,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    })
    .filter((v): v is PubMedSnippet => v !== null);

  return { query, source: "pubmed", snippets };
}
