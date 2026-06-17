import { clearAllPhaeleonChatHistory } from "@/lib/phaeleon/phaeleonChatHistory";
import { clearPhaeleonActiveSession } from "@/lib/phaeleon/phaeleonActiveSessionStorage";
import { clearPhaeleonPairSessions } from "@/lib/phaeleon/phaeleonPairSessionHistory";

/** Clear all Phaeleon data scoped to the current cookie session. */
export function clearPhaeleonScopedSessionData(): void {
  clearPhaeleonActiveSession();
  clearAllPhaeleonChatHistory();
  clearPhaeleonPairSessions();
}
