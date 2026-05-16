import express, { type Request, type Response } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function forwardToOrigin(
  originBase: string,
  req: Request,
  res: Response,
  pathPrefix: string,
) {
  const suffix = req.originalUrl.slice(pathPrefix.length) || "/";
  const targetUrl = `${originBase}${suffix}`;

  const headers: Record<string, string> = {
    Accept: req.get("accept") ?? "application/json",
  };

  const init: RequestInit = { method: req.method, headers };

  if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();
    const ct = upstream.headers.get("content-type");
    res.status(upstream.status);
    if (ct) res.setHeader("Content-Type", ct);
    res.send(body);
  } catch {
    res.status(502).send("Proxy error");
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "512kb" }));

  app.use("/api/uniprot", (req, res) =>
    forwardToOrigin("https://rest.uniprot.org", req, res, "/api/uniprot"),
  );

  app.use("/api/rcsb-search", (req, res) =>
    forwardToOrigin("https://search.rcsb.org", req, res, "/api/rcsb-search"),
  );

  app.use("/api/rcsb-files", (req, res) =>
    forwardToOrigin("https://files.rcsb.org", req, res, "/api/rcsb-files"),
  );

  app.use("/api/alphafold", (req, res) =>
    forwardToOrigin("https://alphafold.ebi.ac.uk", req, res, "/api/alphafold"),
  );

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
