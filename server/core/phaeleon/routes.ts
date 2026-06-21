import { Router, type Request, type Response } from "express";
import {
  convertSearchTerm,
  deduplicateAndSort,
  generateFlexibleQueries,
  sanitizeDrugInput,
} from "../../../client/src/lib/phaeleon/drugSearch.ts";
import { buildDrugProfileFromFdaLabel } from "../../../client/src/lib/phaeleon/drugProfile.ts";
import { searchPubMedDrugInteraction } from "./research.ts";
import {
  generateInteractionAnalysisOnServer,
  isServerAiAnalysisAvailable,
} from "./generateAnalysis.ts";
import {
  isServerAnalysisTranslationAvailable,
  translateAnalysisFieldsOnServer,
  type AnalysisTranslationFields,
} from "./translateAnalysis.ts";
import type { SupportedUiLocale } from "@shared/i18n/locales";

const FDA_BASE_URL = "https://api.fda.gov/drug/label.json";

async function fetchFdaSearch(apiKey: string, searchExpr: string, limit = 20): Promise<unknown[]> {
  const url = `${FDA_BASE_URL}?api_key=${encodeURIComponent(apiKey)}&search=${searchExpr}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`FDA HTTP ${res.status}`);
  }
  const data = (await res.json()) as { results?: unknown[] };
  return data.results ?? [];
}

async function fetchFdaLabel(apiKey: string, drugName: string): Promise<unknown | null> {
  const term = convertSearchTerm(drugName);
  const searchExpr = `openfda.brand_name:"${term}"+OR+openfda.generic_name:"${term}"`;
  const results = await fetchFdaSearch(apiKey, searchExpr, 1);
  return results[0] ?? null;
}

export function createPhaeleonRouter(): Router {
  const router = Router();

  router.get("/fda/search", async (req: Request, res: Response) => {
    const raw = typeof req.query.q === "string" ? req.query.q : "";
    const sanitized = sanitizeDrugInput(raw);
    if (!sanitized) {
      res.status(400).json({ error: "Missing or invalid query", hits: [], query: "" });
      return;
    }

    const apiKey = process.env.FDA_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({ error: "FDA API key not configured on server", hits: [], query: sanitized });
      return;
    }

    const searchTerm = convertSearchTerm(sanitized);
    const fuzzyEnabled = req.query.fuzzy !== "0";
    const flexibleQueries = generateFlexibleQueries(searchTerm);
    const queriesToRun = fuzzyEnabled ? flexibleQueries : flexibleQueries.slice(0, 1);
    const combined: unknown[] = [];

    try {
      for (let i = 0; i < queriesToRun.length; i++) {
        try {
          const batch = await fetchFdaSearch(apiKey, queriesToRun[i]!);
          if (batch.length > 0) {
            combined.push(...batch);
            if (i === 0 && batch.length >= 5) break;
          }
        } catch {
          continue;
        }
      }

      const hits = deduplicateAndSort(combined as Parameters<typeof deduplicateAndSort>[0], searchTerm);
      res.json({ hits, query: searchTerm });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "FDA search failed",
        hits: [],
        query: searchTerm,
      });
    }
  });

  router.get("/fda/label", async (req: Request, res: Response) => {
    const raw = typeof req.query.name === "string" ? req.query.name : "";
    const sanitized = sanitizeDrugInput(raw);
    if (!sanitized) {
      res.status(400).json({ error: "Missing or invalid drug name" });
      return;
    }

    const apiKey = process.env.FDA_API_KEY?.trim();
    if (!apiKey) {
      res.json(buildDrugProfileFromFdaLabel(sanitized, null));
      return;
    }

    try {
      const label = await fetchFdaLabel(apiKey, sanitized);
      res.json(buildDrugProfileFromFdaLabel(sanitized, label as Parameters<typeof buildDrugProfileFromFdaLabel>[1]));
    } catch {
      res.json(buildDrugProfileFromFdaLabel(sanitized, null));
    }
  });

  router.get("/research/interaction", async (req: Request, res: Response) => {
    const drug1 = typeof req.query.drug1 === "string" ? sanitizeDrugInput(req.query.drug1) : "";
    const drug2 = typeof req.query.drug2 === "string" ? sanitizeDrugInput(req.query.drug2) : "";
    if (!drug1 || !drug2) {
      res.status(400).json({ error: "Missing drug1 or drug2" });
      return;
    }

    try {
      const result = await searchPubMedDrugInteraction(drug1, drug2);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "Research search failed",
        query: `${drug1} ${drug2}`,
        source: "pubmed",
        snippets: [],
      });
    }
  });

  router.get("/analyze/status", (_req: Request, res: Response) => {
    res.json({ available: isServerAiAnalysisAvailable() });
  });

  router.post("/analyze/ai", async (req: Request, res: Response) => {
    const body = req.body as Partial<{ drug1: string; drug2: string; locale: SupportedUiLocale }>;
    const drug1 = typeof body.drug1 === "string" ? sanitizeDrugInput(body.drug1) : "";
    const drug2 = typeof body.drug2 === "string" ? sanitizeDrugInput(body.drug2) : "";
    const locale = body.locale;
    const supported = new Set<SupportedUiLocale>(["en", "ko", "ja", "zh", "de", "fr", "es"]);

    if (!drug1 || !drug2) {
      res.status(400).json({ error: "Missing drug1 or drug2" });
      return;
    }

    if (!locale || !supported.has(locale)) {
      res.status(400).json({ error: "Invalid or unsupported locale" });
      return;
    }

    if (!isServerAiAnalysisAvailable()) {
      res.status(503).json({ error: "Server AI not configured" });
      return;
    }

    try {
      const analysis = await generateInteractionAnalysisOnServer(drug1, drug2, locale);
      res.json({ analysis });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "AI analysis failed",
      });
    }
  });

  router.get("/translate/status", (_req: Request, res: Response) => {
    res.json({ available: isServerAnalysisTranslationAvailable() });
  });

  router.post("/translate/analysis", async (req: Request, res: Response) => {
    const body = req.body as Partial<{ locale: SupportedUiLocale } & AnalysisTranslationFields>;
    const locale = body.locale;
    const supported = new Set<SupportedUiLocale>(["en", "ko", "ja", "zh", "de", "fr", "es"]);

    if (!locale || !supported.has(locale) || locale === "en") {
      res.status(400).json({ error: "Invalid or unsupported locale" });
      return;
    }

    if (typeof body.summary !== "string" || typeof body.mechanism !== "string") {
      res.status(400).json({ error: "Missing summary or mechanism" });
      return;
    }

    const pickStrings = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((item): item is string => typeof item === "string") : [];

    const fields: AnalysisTranslationFields = {
      summary: body.summary.trim(),
      mechanism: body.mechanism.trim(),
      expectedEffects: pickStrings(body.expectedEffects),
      practicalSteps: pickStrings(body.practicalSteps),
      emergencySigns: pickStrings(body.emergencySigns),
    };

    if (!isServerAnalysisTranslationAvailable()) {
      res.status(503).json({ error: "Server AI not configured" });
      return;
    }

    try {
      const translated = await translateAnalysisFieldsOnServer(fields, locale);
      res.json({ translated });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "Translation failed",
      });
    }
  });

  return router;
}

