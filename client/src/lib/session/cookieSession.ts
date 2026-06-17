import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const SESSION_MAX_AGE_SEC = Math.floor(ONE_YEAR_MS / 1000);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const hit = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Read or create the persistent app session id (cookie). */
export function getOrCreateAppSessionId(): string {
  const existing = readCookie(COOKIE_NAME);
  if (existing) return existing;
  const id = newSessionId();
  writeCookie(COOKIE_NAME, id, SESSION_MAX_AGE_SEC);
  return id;
}

/** Start a fresh cookie session — caller should reset in-memory workstation state. */
export function rotateAppSessionId(): string {
  const id = newSessionId();
  writeCookie(COOKIE_NAME, id, SESSION_MAX_AGE_SEC);
  return id;
}

export function clearAppSessionCookie(): void {
  writeCookie(COOKIE_NAME, "", 0);
}

export function formatSessionIdShort(sessionId: string, length = 8): string {
  return sessionId.replace(/-/g, "").slice(0, length);
}
