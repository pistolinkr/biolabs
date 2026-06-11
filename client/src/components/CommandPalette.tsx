import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Eye,
  Layers,
  Loader2,
  Maximize2,
  Microscope,
  Monitor,
  Download,
  Orbit,
  Palette,
  Sparkles,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { useAssistantOptional } from "@/contexts/AssistantContext";
import { useViewerOptional } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

type CommandCategory = "display" | "selection" | "view" | "analysis" | "io";

interface CommandDef {
  id: string;
  cmdId: string;
  category: CommandCategory;
  icon: React.ReactNode;
}

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  cmdId: string;
}

type AiPanelPhase = "commands" | "loading" | "answer" | "error";

interface AiPanelState {
  phase: AiPanelPhase;
  question: string;
  answer?: string;
  error?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_DEFS: CommandDef[] = [
  { id: "repr-cartoon", cmdId: "repr.cartoon", category: "display", icon: <Layers size={14} /> },
  { id: "repr-rope", cmdId: "repr.rope", category: "display", icon: <Layers size={14} /> },
  { id: "repr-surface", cmdId: "repr.surface", category: "display", icon: <Monitor size={14} /> },
  { id: "repr-bs", cmdId: "repr.ballstick", category: "display", icon: <Microscope size={14} /> },
  { id: "repr-vdw", cmdId: "repr.spacefill", category: "display", icon: <Monitor size={14} /> },
  { id: "repr-ribbon-alias", cmdId: "repr.ribbon", category: "display", icon: <Layers size={14} /> },
  { id: "repr-wire-alias", cmdId: "repr.wireframe", category: "display", icon: <Monitor size={14} /> },
  { id: "color-chain", cmdId: "color.chainid", category: "display", icon: <Palette size={14} /> },
  { id: "color-res", cmdId: "color.residueindex", category: "display", icon: <Palette size={14} /> },
  { id: "color-hp", cmdId: "color.hydrophobicity", category: "display", icon: <Palette size={14} /> },
  { id: "color-bfac", cmdId: "color.bfactor", category: "display", icon: <Palette size={14} /> },
  { id: "color-bfac-gray", cmdId: "color.bfactor.gray", category: "display", icon: <Palette size={14} /> },
  { id: "color-es", cmdId: "color.electrostatic", category: "display", icon: <Palette size={14} /> },
  { id: "isolate-a", cmdId: "isolate.A", category: "selection", icon: <Eye size={14} /> },
  { id: "isolate-b", cmdId: "isolate.B", category: "selection", icon: <Eye size={14} /> },
  { id: "isolate-clear", cmdId: "isolate.clear", category: "selection", icon: <Eye size={14} /> },
  { id: "fit-selection", cmdId: "view.fit.selection", category: "view", icon: <Maximize2 size={14} /> },
  { id: "fit-structure", cmdId: "view.fit.structure", category: "view", icon: <Maximize2 size={14} /> },
  { id: "center", cmdId: "view.center", category: "view", icon: <Maximize2 size={14} /> },
  { id: "view-readable", cmdId: "view.preset.readable", category: "view", icon: <Sparkles size={14} /> },
  { id: "quality-toggle", cmdId: "view.quality.toggle", category: "view", icon: <Monitor size={14} /> },
  { id: "fullscreen", cmdId: "view.fullscreen.toggle", category: "view", icon: <Monitor size={14} /> },
  { id: "confidence-toggle", cmdId: "overlay.confidence.toggle", category: "display", icon: <Palette size={14} /> },
  { id: "spin", cmdId: "view.spin.toggle", category: "view", icon: <Orbit size={14} /> },
  { id: "analysis-ixn", cmdId: "analysis.interactions", category: "analysis", icon: <Microscope size={14} /> },
  { id: "export-cif", cmdId: "export.cif", category: "io", icon: <Download size={14} /> },
  { id: "screenshot", cmdId: "screenshot", category: "io", icon: <Download size={14} /> },
];

const INITIAL_AI_PANEL: AiPanelState = { phase: "commands", question: "" };

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useTranslation("commands");
  const viewer = useViewerOptional();
  const assistant = useAssistantOptional();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiPanel, setAiPanel] = useState<AiPanelState>(INITIAL_AI_PANEL);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    (cmdId: string) => {
      if (viewer) {
        viewer.runViewerCommand(cmdId);
      } else {
        // eslint-disable-next-line no-console
        console.warn(t("palette.requiresWorkspace"));
      }
    },
    [viewer, t],
  );

  const commands: Command[] = useMemo(
    () =>
      COMMAND_DEFS.map((def) => ({
        id: def.id,
        cmdId: def.cmdId,
        icon: def.icon,
        title: t(`items.${def.cmdId}.title`),
        description: t(`items.${def.cmdId}.description`),
        category: t(`categories.${def.category}`),
      })),
    [t],
  );

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.cmdId.toLowerCase().includes(q),
    );
  }, [commands, query]);

  const len = filteredCommands.length;
  const showingAi = aiPanel.phase !== "commands";

  const backToCommands = useCallback(() => {
    setAiPanel(INITIAL_AI_PANEL);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleAskAi = useCallback(async () => {
    const q = query.trim();
    if (!q || !assistant || assistant.isSending) return;

    if (!assistant.status?.configured) {
      setAiPanel({ phase: "error", question: q, error: t("palette.aiNotConfigured") });
      return;
    }

    setAiPanel({ phase: "loading", question: q });

    const result = await assistant.explain({
      intent: "general",
      prompt: q,
      popoverOnly: true,
      globalPopover: false,
    });

    if (result && !result.includes("(AI_")) {
      setAiPanel({ phase: "answer", question: q, answer: result });
      return;
    }

    setAiPanel({
      phase: "error",
      question: q,
      error: result ?? t("palette.aiFailed"),
    });
  }, [assistant, query, t]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
      setAiPanel(INITIAL_AI_PANEL);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (showingAi) {
          e.preventDefault();
          backToCommands();
          return;
        }
        onClose();
        return;
      }

      if (showingAi) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev + 1) % len);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev === 0 ? len - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          run(cmd.cmdId);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, len, onClose, run, showingAi, backToCommands]);

  useEffect(() => {
    setSelectedIndex((i) => (len === 0 ? 0 : Math.min(i, len - 1)));
  }, [len, query]);

  const askDisabled = !query.trim() || !assistant || assistant.isSending || assistant.statusLoading;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center pt-20",
        isOpen ? "bg-black/55" : "pointer-events-none hidden",
      )}
      onClick={isOpen && !showingAi ? onClose : undefined}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <div
        className="relative w-full max-w-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={showingAi ? t("palette.aiTitle") : t("palette.cmd")}
      >
        {showingAi ? (
          <div className="relative z-[60] flex max-h-[min(70vh,520px)] flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#2A2A2A] px-2 py-2 font-mono">
              <button
                type="button"
                onClick={backToCommands}
                className="flex items-center gap-1 border border-[#2A2A2A] px-2 py-1 text-[9px] uppercase tracking-wide text-[#B0B0B0] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
              >
                <ArrowLeft className="size-3" />
                {t("palette.aiBack")}
              </button>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#6A6A6A]">{t("palette.aiTitle")}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono">
              <div className="mb-3 border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1.5">
                <div className="text-[8px] uppercase tracking-wide text-[#6A6A6A]">{t("palette.aiYouAsked")}</div>
                <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[#E8E8E8]">
                  {aiPanel.question}
                </p>
              </div>

              {aiPanel.phase === "loading" ? (
                <div className="flex items-center gap-2 py-6 text-[11px] text-[#9A9A9A]">
                  <Loader2 className="size-4 animate-spin" />
                  {t("palette.aiThinking")}
                </div>
              ) : aiPanel.phase === "error" ? (
                <div className="border border-[#5A3A3A] bg-[#1A1010] px-2 py-2 text-[11px] leading-relaxed text-[#E88]">
                  {aiPanel.error}
                </div>
              ) : (
                <div className="text-[11px] leading-relaxed text-[#D8D8D8]">
                  <Streamdown>{aiPanel.answer ?? ""}</Streamdown>
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-between border-t border-[#2A2A2A] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#6A6A6A]">
              <span>{t("palette.aiEscHint")}</span>
              <button
                type="button"
                onClick={onClose}
                className="text-[#8A8A8A] hover:text-[#F2F2F2]"
              >
                {t("palette.aiClose")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-[#2A2A2A] p-2 font-mono">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#6A6A6A]">{t("palette.cmd")}</span>
              <input
                ref={inputRef}
                type="text"
                placeholder={t("palette.placeholder")}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="flex-1 bg-transparent text-[13px] text-[#F2F2F2] placeholder-[#5A5A5A] focus:outline-none"
              />
              <span className="text-[10px] text-[#6A6A6A]">ESC</span>
            </div>

            <div className="max-h-96 overflow-y-auto font-mono text-[12px]">
              {len === 0 ? (
                <div className="p-8 text-center text-[#6A6A6A]">{t("palette.noMatch")}</div>
              ) : (
                <div className="divide-y divide-[#2A2A2A]">
                  {filteredCommands.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => {
                        run(cmd.cmdId);
                        onClose();
                      }}
                      className={`flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors ${
                        idx === selectedIndex ? "bg-[#1C1C1C] text-[#F2F2F2]" : "text-[#C8C8C8] hover:bg-[#141414]"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-[#8A8A8A]">{cmd.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium uppercase tracking-wide">{cmd.title}</div>
                        <div className="text-[10px] text-[#8A8A8A]">{cmd.description}</div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wider text-[#6A6A6A]">
                        {cmd.category}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#2A2A2A] px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-[#6A6A6A]">
              <span>{t("palette.navigate")}</span>
              <div className="flex items-center gap-2">
                <span>
                  {len} / {commands.length}
                </span>
                <button
                  type="button"
                  disabled={askDisabled}
                  onClick={() => void handleAskAi()}
                  title={askDisabled ? t("palette.askAiDisabledHint") : t("palette.askAiHint")}
                  className="inline-flex items-center gap-1 border border-[#3A3A3A] bg-[#1A1A1A] px-2 py-1 text-[9px] uppercase tracking-wide text-[#D8D8D8] hover:border-[#5A6A6A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {assistant?.isSending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  {t("palette.askAi")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
