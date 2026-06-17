import type { SupportedUiLocale } from "@shared/i18n/locales";

const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK_CHARS = 4500;

type GoogleTranslateSegment = [string, string, ...unknown[]];
type GoogleTranslateResponse = [GoogleTranslateSegment[], ...unknown[]];

const GOOGLE_TARGET_LOCALES: Record<SupportedUiLocale, string> = {
  en: "en",
  ko: "ko",
  ja: "ja",
  zh: "zh-CN",
  de: "de",
  fr: "fr",
  es: "es",
};

function parseGoogleTranslateResponse(payload: unknown): string {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new Error("Unexpected Google Translate response");
  }

  const segments = payload[0] as GoogleTranslateSegment[];
  const text = segments.map((segment) => segment[0]).join("");
  if (!text.trim()) {
    throw new Error("Google Translate returned empty text");
  }
  return text;
}

function splitTextIntoChunks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_CHUNK_CHARS) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > MAX_CHUNK_CHARS) {
    let splitAt = remaining.lastIndexOf("\n\n", MAX_CHUNK_CHARS);
    if (splitAt < MAX_CHUNK_CHARS * 0.5) {
      splitAt = remaining.lastIndexOf(". ", MAX_CHUNK_CHARS);
    }
    if (splitAt < MAX_CHUNK_CHARS * 0.5) {
      splitAt = remaining.lastIndexOf(" ", MAX_CHUNK_CHARS);
    }
    if (splitAt <= 0) {
      splitAt = MAX_CHUNK_CHARS;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export async function translateTextWithGoogle(
  text: string,
  targetLocale: SupportedUiLocale,
  sourceLocale: SupportedUiLocale = "en",
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (targetLocale === sourceLocale) return text;

  const chunks = splitTextIntoChunks(trimmed);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const url = new URL(GOOGLE_TRANSLATE_URL);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", GOOGLE_TARGET_LOCALES[sourceLocale]);
    url.searchParams.set("tl", GOOGLE_TARGET_LOCALES[targetLocale]);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", chunk);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; Phaeleon/1.0)",
      },
    });

    if (!res.ok) {
      throw new Error(`Google Translate HTTP ${res.status}`);
    }

    const payload = (await res.json()) as unknown;
    translatedChunks.push(parseGoogleTranslateResponse(payload));
  }

  return translatedChunks.join("\n\n");
}

export async function translateStringsWithGoogle(
  texts: string[],
  targetLocale: SupportedUiLocale,
  sourceLocale: SupportedUiLocale = "en",
): Promise<string[]> {
  return Promise.all(texts.map((text) => translateTextWithGoogle(text, targetLocale, sourceLocale)));
}
