import { Dna, FileStack, Layers } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAssistant } from "@/contexts/AssistantContext";
import { useViewer } from "@/contexts/ViewerContext";
import type { ProteinSelection } from "@/lib/proteinApis";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { cn } from "@/lib/utils";

function parseFasta(text: string): { header: string; sequence: string } | null {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;
  const header = lines[0].startsWith(">") ? lines[0].slice(1).trim() : "sequence";
  const seqLines = lines[0].startsWith(">") ? lines.slice(1) : lines;
  const sequence = seqLines.join("").replace(/\s/g, "").toUpperCase();
  if (!sequence.length) return null;
  return { header, sequence };
}

/**
 * Workspace-style input rail: structure stack, file import, FASTA / MSA / preset placeholders.
 */
export default function InputWorkspacePanel() {
  const { t } = useTranslation("workbench");
  const { registerContextExtension } = useAssistant();
  const {
    proteinSelection,
    setProteinSelection,
    structureModel,
    setFocusResidueQuery,
  } = useViewer();
  const [fastaDraft, setFastaDraft] = useState("");
  const [fastaParsed, setFastaParsed] = useState<{ header: string; sequence: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".cif") && !lower.endsWith(".mmcif") && !lower.endsWith(".pdb") && !lower.endsWith(".ent")) {
        return;
      }
      const structureObjectUrl = URL.createObjectURL(file);
      const sel: ProteinSelection = {
        source: "file",
        id: file.name.replace(/\.[^.]+$/, ""),
        label: file.name,
        fileName: file.name,
        structureObjectUrl,
      };
      setProteinSelection(sel);
    },
    [setProteinSelection],
  );

  const parseFastaLocal = () => {
    const p = parseFasta(fastaDraft);
    setFastaParsed(p);
    if (p) setFocusResidueQuery("");
  };

  useEffect(() => {
    const drafts: string[] = [];
    if (fastaDraft.trim()) drafts.push(`FASTA draft (${fastaDraft.trim().length} chars)`);
    if (fastaParsed) {
      drafts.push(`FASTA parsed header=${fastaParsed.header} length=${fastaParsed.sequence.length}`);
    }
    if (!drafts.length) return undefined;
    return registerContextExtension({ input_drafts: drafts.join("; ") });
  }, [fastaDraft, fastaParsed, registerContextExtension]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 font-mono text-[10px] text-muted-foreground">
      <div className="workbench-panel-inset p-2">
        <div className="workbench-kicker mb-1 flex items-center gap-1">
          <Layers className="size-3" />
          {t("input.entityStack")}
        </div>
        {proteinSelection ? (
          <div className="space-y-1 text-foreground">
            <div className="break-all">{proteinSelection.label}</div>
            <div className="text-muted-foreground">
              {proteinSelection.source} · {proteinSelectionKey(proteinSelection)}
            </div>
            {structureModel ? (
              <div className="text-muted-foreground">
                {t("input.atomsChains", {
                  atoms: structureModel.atomCount.toLocaleString(),
                  chains: structureModel.chains.length,
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground">{t("input.noDocument")}</div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "border border-dashed p-4 text-center transition-colors",
          dragOver ? "border-accent bg-secondary" : "border-border bg-card",
        )}
      >
        <FileStack className="mx-auto mb-2 size-6 text-muted-foreground" />
        <div className="workbench-kicker text-foreground">{t("input.structureImport")}</div>
        <div className="mt-1 text-muted-foreground">{t("input.dropHint")}</div>
      </div>

      <div className="workbench-panel">
        <div className="workbench-kicker mb-1 flex items-center gap-1">
          <Dna className="size-3" />
          {t("input.sequenceFasta")}
        </div>
        <textarea
          value={fastaDraft}
          onChange={(e) => setFastaDraft(e.target.value)}
          placeholder=">header MKFL..."
          className="mb-1 min-h-[72px] w-full border bg-input p-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={parseFastaLocal}
          className="w-full border border-border bg-background py-1 uppercase tracking-wide text-muted-foreground hover:border-accent hover:text-foreground"
        >
          {t("input.parseFasta")}
        </button>
        {fastaParsed ? (
          <div className="mt-2 text-foreground">
            <div className="text-muted-foreground">{fastaParsed.header}</div>
            <div className="line-clamp-2 break-all">{fastaParsed.sequence.slice(0, 120)}…</div>
            <div className="mt-1 text-muted-foreground">{t("input.pipelineNotAttached")}</div>
          </div>
        ) : null}
      </div>

      <div className="workbench-panel opacity-80">
        <div className="workbench-kicker">{t("input.msaAttachment")}</div>
        <div className="mt-1 text-muted-foreground">{t("input.msaHint")}</div>
      </div>

      <div className="workbench-panel opacity-80">
        <div className="workbench-kicker">{t("input.simulationPreset")}</div>
        <div className="mt-1 text-muted-foreground">{t("input.simulationHint")}</div>
      </div>
    </div>
  );
}
