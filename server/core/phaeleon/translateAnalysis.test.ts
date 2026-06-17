import { describe, expect, it } from "vitest";
import { isServerAnalysisTranslationAvailable } from "./translateAnalysis.ts";

describe("translateAnalysis", () => {
  it("reports translation as always available without AI keys", () => {
    expect(isServerAnalysisTranslationAvailable()).toBe(true);
  });
});
