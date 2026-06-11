import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loadAiConfig } from "./config.ts";
import { handleAiChat, handleAiStatus } from "./handlers.ts";

export function createAiRouter(): Router {
  const config = loadAiConfig();
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: config.rateLimitPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "AI rate limit exceeded. Try again in a minute." },
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
