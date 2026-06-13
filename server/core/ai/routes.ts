import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loadAiConfig } from "./config.ts";
import { handleAiChat, handleAiStatus } from "./handlers.ts";
import { rateLimited } from "./userErrors.ts";

export function createAiRouter(): Router {
  const config = loadAiConfig();
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: config.rateLimitPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const info = (req as unknown as { rateLimit?: { resetTime?: Date } }).rateLimit;
      const resetMs = info?.resetTime
        ? Math.max(0, info.resetTime.getTime() - Date.now())
        : undefined;
      res.status(429).json(rateLimited("AI_RATE_LIMITED", resetMs));
    },
  });

  router.get("/status", (_req, res) => {
    const { status, json } = handleAiStatus();
    res.status(status).json(json);
  });

  router.post("/chat", limiter, async (req, res) => {
    const { status, json } = await handleAiChat(req.body);
    res.status(status).json(json);
  });

  return router;
}
