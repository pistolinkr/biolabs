/** Normalize user input for protein database search (preserve case for accessions). */
export function normalizeProteinSearchQuery(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** Map UI locale to Accept-Language for UniProt display fields. */
export function acceptLanguageForSearch(uiLocale: string): string {
  switch (uiLocale) {
    case "ko":
      return "ko-KR,ko;q=0.9,en;q=0.8";
    case "ja":
      return "ja-JP,ja;q=0.9,en;q=0.8";
    case "zh":
      return "zh-CN,zh;q=0.9,en;q=0.8";
    case "de":
      return "de-DE,de;q=0.9,en;q=0.8";
    case "fr":
      return "fr-FR,fr;q=0.9,en;q=0.8";
    case "es":
      return "es-ES,es;q=0.9,en;q=0.8";
    default:
      return "en-US,en;q=0.9";
  }
}
