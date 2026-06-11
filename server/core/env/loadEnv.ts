import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

let loaded = false;

/** Load repo-root .env once for dev middleware and server handlers. */
export function ensureEnvLoaded(): void {
  if (loaded) return;
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
  const localPath = path.join(PROJECT_ROOT, ".env.local");
  if (fs.existsSync(localPath)) {
    loadDotenv({ path: localPath, override: true });
  }
  loaded = true;
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}
