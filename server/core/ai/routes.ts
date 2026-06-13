import { Router } from "express";
import { handleAiChat, handleAiStatus } from "./handlers.ts";

export function createAiRouter(): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    const { status, json } = handleAiStatus();
    res.status(status).json(json);
  });

  router.post("/chat", async (req, res) => {
    const { status, json } = await handleAiChat(req.body);
    res.status(status).json(json);
  });

  return router;
}
