import { beforeEach, describe, expect, it } from "vitest";
import type { AiServerConfig } from "./config.ts";
import {
  __resetCallPolicy,
  acquireSlot,
  checkCallPolicy,
  recordCallPolicy,
  releaseSlot,
} from "./callPolicy.ts";

function makeConfig(overrides: Partial<AiServerConfig> = {}): AiServerConfig {
  return {
    globalRpm: 100,
    globalDaily: 100,
    maxConcurrent: 2,
    strictLimits: true,
    intentWeights: { structure: 2, agent: 2, test: 0.5 },
    ...overrides,
  } as unknown as AiServerConfig;
}

describe("callPolicy", () => {
  beforeEach(() => __resetCallPolicy());

  it("blocks with AI_RATE_LIMITED when the RPM window is exhausted", () => {
    const config = makeConfig({ globalRpm: 5, globalDaily: 1000 });
    for (let i = 0; i < 5; i += 1) {
      expect(checkCallPolicy("general", config).ok).toBe(true);
      recordCallPolicy("general", config);
    }
    const decision = checkCallPolicy("general", config);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toBe("rpm");
    expect(decision.retryAfterMs).toBeGreaterThan(0);
  });

  it("blocks with the daily reason when the daily budget is exhausted", () => {
    const config = makeConfig({ globalRpm: 1000, globalDaily: 3 });
    for (let i = 0; i < 3; i += 1) recordCallPolicy("general", config);
    const decision = checkCallPolicy("general", config);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toBe("daily");
  });

  it("limits concurrent in-flight calls via acquire/release", () => {
    const config = makeConfig({ maxConcurrent: 2 });
    expect(acquireSlot(config)).toBe(true);
    expect(acquireSlot(config)).toBe(true);
    expect(acquireSlot(config)).toBe(false);
    releaseSlot();
    expect(acquireSlot(config)).toBe(true);
  });

  it("drains the daily budget faster for higher-weight intents", () => {
    const config = makeConfig({ globalRpm: 1000, globalDaily: 4 });
    recordCallPolicy("structure", config); // weight 2
    recordCallPolicy("structure", config); // weight 2 → 4 units used
    expect(checkCallPolicy("structure", config).ok).toBe(false);

    __resetCallPolicy();
    for (let i = 0; i < 4; i += 1) {
      expect(checkCallPolicy("general", config).ok).toBe(true); // weight 1
      recordCallPolicy("general", config);
    }
    expect(checkCallPolicy("general", config).ok).toBe(false);
  });
});
