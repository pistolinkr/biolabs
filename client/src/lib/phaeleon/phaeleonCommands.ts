import type { PhaeleonLayoutPresetId } from "@/lib/phaeleon/phaeleonLayoutPresets";
import { PHAELEON_SEARCH_FOCUS_EVENT, type HelixDrugSlot } from "@/contexts/PhaeleonContext";
import type { DrugSearchHit } from "@/lib/phaeleon/types";
import type { PhaeleonClientSettings } from "@/lib/phaeleon/phaeleonSettingsStorage";

export const WHITELISTED_PHAELEON_AGENT_COMMANDS = new Set([
  "phaeleon.analyze",
  "phaeleon.clear.session",
  "phaeleon.swap.drugs",
  "phaeleon.slot.drug1",
  "phaeleon.slot.drug2",
  "phaeleon.search.focus",
  "phaeleon.fuzzy.toggle",
  "phaeleon.layout.binary",
  "phaeleon.layout.consult",
  "phaeleon.layout.classic",
  "phaeleon.layout.reset",
  "phaeleon.settings.open",
  "phaeleon.ai.chat",
  "assistant.chat.open",
]);

export interface PhaeleonCommandHandlers {
  runAnalysis: () => Promise<void>;
  clearSession: () => void;
  swapDrugs: () => void;
  setActiveSlot: (slot: HelixDrugSlot) => void;
  updateSettings: (patch: Partial<PhaeleonClientSettings>) => void;
  settings: PhaeleonClientSettings;
  setLayoutPreset: (presetId: Exclude<PhaeleonLayoutPresetId, "custom">) => void;
  resetLayoutToPreset: () => void;
  onSettingsOpen?: () => void;
  focusAssistantDock?: () => void;
}

export function runPhaeleonCommand(cmdId: string, handlers: PhaeleonCommandHandlers): boolean {
  if (!WHITELISTED_PHAELEON_AGENT_COMMANDS.has(cmdId)) return false;

  switch (cmdId) {
    case "phaeleon.analyze":
      void handlers.runAnalysis();
      break;
    case "phaeleon.clear.session":
      handlers.clearSession();
      break;
    case "phaeleon.swap.drugs":
      handlers.swapDrugs();
      break;
    case "phaeleon.slot.drug1":
      handlers.setActiveSlot("drug1");
      break;
    case "phaeleon.slot.drug2":
      handlers.setActiveSlot("drug2");
      break;
    case "phaeleon.search.focus":
      window.dispatchEvent(new Event(PHAELEON_SEARCH_FOCUS_EVENT));
      break;
    case "phaeleon.fuzzy.toggle":
      handlers.updateSettings({ fuzzySearchEnabled: !handlers.settings.fuzzySearchEnabled });
      break;
    case "phaeleon.layout.binary":
    case "phaeleon.layout.consult":
    case "phaeleon.layout.classic": {
      const presetId = cmdId.replace("phaeleon.layout.", "") as Exclude<PhaeleonLayoutPresetId, "custom">;
      handlers.setLayoutPreset(presetId);
      break;
    }
    case "phaeleon.layout.reset":
      handlers.resetLayoutToPreset();
      break;
    case "phaeleon.settings.open":
      handlers.onSettingsOpen?.();
      break;
    case "phaeleon.ai.chat":
    case "assistant.chat.open":
      handlers.focusAssistantDock?.();
      break;
    default:
      return false;
  }
  return true;
}

export function assignDrugHit(
  hit: DrugSearchHit,
  slot: HelixDrugSlot,
  handlers: {
    assignDrugToSlot: (hit: DrugSearchHit, slot: HelixDrugSlot) => void;
  },
): void {
  handlers.assignDrugToSlot(hit, slot);
}
