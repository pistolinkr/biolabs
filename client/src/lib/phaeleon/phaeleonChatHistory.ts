import type { AssistantUiMessage } from "@/contexts/AssistantContext";
import { normalizeDrugKey } from "@/lib/phaeleon/interactionRules";
import {
  clearScopedStore,
  readScopedStore,
  writeScopedStore,
} from "@/lib/session/scopedHistoryStore";

export const PHAELEON_CHAT_HISTORY_BASE_KEY = "biolabs.phaeleon.chatHistory.v1";

export interface StoredPhaeleonChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatHistoryStore {
  version: 1;
  byPair: Record<string, StoredPhaeleonChatMessage[]>;
}

function emptyStore(): ChatHistoryStore {
  return { version: 1, byPair: {} };
}

function readStore(): ChatHistoryStore {
  const store = readScopedStore(PHAELEON_CHAT_HISTORY_BASE_KEY, emptyStore, "session");
  if (!store || store.version !== 1 || typeof store.byPair !== "object") {
    return emptyStore();
  }
  return store;
}

function writeStore(store: ChatHistoryStore): void {
  writeScopedStore(PHAELEON_CHAT_HISTORY_BASE_KEY, store, "session");
}

export function phaeleonPairHistoryKey(drugA: string, drugB: string): string {
  return `${normalizeDrugKey(drugA)}|${normalizeDrugKey(drugB)}`;
}

export function serializePhaeleonChatMessages(messages: AssistantUiMessage[]): StoredPhaeleonChatMessage[] {
  return messages
    .filter(
      (m): m is AssistantUiMessage & { role: "user" | "assistant" } =>
        !m.pending && !m.error && (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0,
    )
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: new Date().toISOString(),
    }));
}

export function deserializePhaeleonChatMessages(stored: StoredPhaeleonChatMessage[]): AssistantUiMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));
}

export function loadPhaeleonChatHistory(drugA: string, drugB: string): AssistantUiMessage[] {
  const key = phaeleonPairHistoryKey(drugA, drugB);
  const store = readStore();
  return deserializePhaeleonChatMessages(store.byPair[key] ?? []);
}

export function savePhaeleonChatHistory(
  drugA: string,
  drugB: string,
  messages: AssistantUiMessage[],
): StoredPhaeleonChatMessage[] {
  const key = phaeleonPairHistoryKey(drugA, drugB);
  const store = readStore();
  const next = serializePhaeleonChatMessages(messages);
  store.byPair[key] = next.slice(-80);
  writeStore(store);
  return store.byPair[key];
}

export function clearPhaeleonChatHistory(drugA: string, drugB: string): void {
  const key = phaeleonPairHistoryKey(drugA, drugB);
  const store = readStore();
  delete store.byPair[key];
  writeStore(store);
}

export function clearAllPhaeleonChatHistory(): void {
  clearScopedStore(PHAELEON_CHAT_HISTORY_BASE_KEY, "session");
}
