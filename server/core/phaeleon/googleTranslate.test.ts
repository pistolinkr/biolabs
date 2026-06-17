import { describe, expect, it } from "vitest";
import { translateTextWithGoogle } from "./googleTranslate.ts";

describe("translateTextWithGoogle", () => {
  it("translates English text to Korean", async () => {
    const translated = await translateTextWithGoogle("hello world", "ko");
    expect(translated).toMatch(/[가-힣]/);
    expect(translated.toLowerCase()).not.toBe("hello world");
  }, 15_000);

  it("returns the original text when locales match", async () => {
    const text = "No translation needed";
    await expect(translateTextWithGoogle(text, "en", "en")).resolves.toBe(text);
  });
});
