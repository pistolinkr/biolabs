import { beforeEach, describe, expect, it, vi } from "vitest";

// Avoid pulling i18n (and the DOM bootstrap) into the test via userErrors.
vi.mock("@/lib/ai/userErrors", () => {
  class AiRequestError extends Error {
    code: string;
    retryAfterMs?: number;
    constructor(code: string, message: string, retryAfterMs?: number) {
      super(message);
      this.code = code;
      this.retryAfterMs = retryAfterMs;
    }
  }
  return { AiRequestError };
});

import {
  __resetCallGate,
  assertCallAllowed,
  beginCall,
  configureCallGate,
  recordCall,
  type AssertParams,
} from "@/lib/ai/callGate";

function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

function expectBlocked(fn: () => void, code: string): void {
  try {
    fn();
    throw new Error("expected call to be blocked");
  } catch (e) {
    expect((e as { code?: string }).code).toBe(code);
  }
}

const base: AssertParams = {
  intent: "general",
  contextFingerprint: "fp-1",
  prompt: "hello",
};

describe("callGate", () => {
  beforeEach(() => {
    installLocalStorage();
    __resetCallGate();
  });

  it("blocks an identical request within the dedup window", () => {
    assertCallAllowed(base);
    recordCall(base);
    expectBlocked(() => assertCallAllowed(base), "AI_RATE_LIMITED");
  });

  it("enforces a per-intent minimum interval for heavy intents", () => {
    const structure: AssertParams = { intent: "structure", contextFingerprint: "fp", prompt: "a" };
    recordCall(structure);
    // Different prompt avoids dedup, so the spacing rule is what blocks.
    expectBlocked(
      () => assertCallAllowed({ ...structure, prompt: "b" }),
      "AI_RATE_LIMITED",
    );
    // A different, unthrottled intent is still allowed.
    assertCallAllowed({ intent: "general", contextFingerprint: "fp", prompt: "c" });
  });

  it("limits concurrent in-flight calls", () => {
    const r1 = beginCall();
    beginCall();
    expectBlocked(() => assertCallAllowed(base), "AI_CONCURRENCY_LIMIT");
    r1();
    assertCallAllowed(base);
  });

  it("enforces the local daily soft cap", () => {
    configureCallGate({ localDailyCap: 2 });
    recordCall({ ...base, prompt: "p1" });
    recordCall({ ...base, prompt: "p2" });
    expectBlocked(
      () => assertCallAllowed({ ...base, prompt: "p3" }),
      "AI_DAILY_BUDGET_EXCEEDED",
    );
  });
});
