import type { ProteinSelection } from "@/lib/proteinApis";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { entityKindLabel, groupChainsByEntityKind } from "@/lib/biomolecularEntities";
import { loadSourceSearchFromSession } from "@/lib/sourceSearchStorage";
import type {
  ChainModel,
  PolymerContextSnapshot,
  StructureHierarchyModel,
  ViewportPickDetail,
} from "@/contexts/ViewerContext";
import type { WorkflowStageId, WorkflowStageStatus } from "@/core/workflow/stageTypes";
import type { WorkflowJobClient } from "@/core/workflow/orchestrationStore";
import type { AiPlatformContext } from "@shared/ai/types";

const MAX_SEQUENCE_CHARS_PER_CHAIN = 512;
const MAX_SEQUENCE_CHARS_COMPACT = 120;
const MAX_FRAGMENT_CHARS = 240;
const MAX_FRAGMENT_CHARS_COMPACT = 120;

export interface ContextBuilderInput {
  proteinSelection: ProteinSelection | null;
  structureModel: StructureHierarchyModel | null;
  selectedResidueKey: string | null;
  viewportPickDetail: ViewportPickDetail | null;
  isolateChainId: string | null;
  hoverChainId: string | null;
  polymerContextSnapshot: PolymerContextSnapshot | null;
  representation: string;
  colorScheme: string;
  contextContactRadiusAngstrom: number;
  polymerInteractionOverlayEnabled: boolean;
  nucleicBackboneAccentEnabled: boolean;
  renderOptions: Record<string, boolean | undefined>;
  measurementMode: string;
  focusResidueQuery: string;
  selectedSequencePolymerKind: string | null;
  workflow: {
    focusedStage: WorkflowStageId;
    stageStatuses: Record<WorkflowStageId, WorkflowStageStatus>;
    contextualHint: string;
    runningJobs: WorkflowJobClient[];
    queueDepth: number;
    workflowSourceSummary: string;
  };
  /** Optional extensions registered by panels (FASTA drafts, mutations, domains). */
  extensions?: Partial<
    Pick<
      AiPlatformContext,
      "domain" | "mutation" | "input_drafts" | "annotations" | "platform_generated_analysis"
    >
  >;
  /** Client AI prefs applied at build time. */
  contextOptions?: {
    includeFullSequences?: boolean;
    compactContext?: boolean;
  };
}

function truncateSeq(seq: string, max = MAX_SEQUENCE_CHARS_PER_CHAIN): string {
  if (seq.length <= max) return seq;
  const half = Math.floor(max / 2) - 2;
  return `${seq.slice(0, half)}…${seq.slice(-half)}`;
}

function truncateRecord(rec: Record<string, string>, maxPer = MAX_SEQUENCE_CHARS_PER_CHAIN): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[k] = truncateSeq(v, maxPer);
  }
  return out;
}

function parseResidueKey(key: string | null): { chain: string | null; number: string | null } {
  if (!key) return { chain: null, number: null };
  const idx = key.indexOf(":");
  if (idx <= 0) return { chain: null, number: key };
  return { chain: key.slice(0, idx), number: key.slice(idx + 1) };
}

function buildStructureSummary(model: StructureHierarchyModel | null, isolateChainId: string | null): string | null {
  if (!model) return null;
  const grouped = groupChainsByEntityKind(model.chains);
  const parts = [
    `title=${model.title}`,
    `atoms=${model.atomCount}`,
    `residues=${model.residueCount}`,
    `chains=${model.chains.length}`,
    `assemblyId=${model.assemblyId ?? "unknown"}`,
    isolateChainId ? `isolated=${isolateChainId}` : "isolated=none",
  ];
  for (const [kind, chains] of Object.entries(grouped)) {
    if (!chains?.length) continue;
    parts.push(
      `${entityKindLabel(kind as Parameters<typeof entityKindLabel>[0])}=${chains.map((c: ChainModel) => `${c.id}(${c.residueCount}res/${c.atomCount}atm${c.visible ? "" : ",hidden"})`).join(",")}`,
    );
  }
  return parts.join("; ");
}

function buildAnalysisSummary(snapshot: PolymerContextSnapshot | null): string | null {
  if (!snapshot) return null;
  return [
    `radius=${snapshot.radiusAngstrom}Å`,
    `sele=${snapshot.sele}`,
    `chains=${snapshot.chainsTouched.join(",")}`,
    `nucleic=${snapshot.nucleicChains.join(",")}`,
    `proteinRes=${snapshot.proteinResidueCount}`,
    `nucleicRes=${snapshot.nucleicResidueCount}`,
    `polarContacts=${snapshot.candidatePolarContactCount}`,
    `heavyContacts=${snapshot.candidateHeavyContactCount}`,
    `phosphatePairs=${snapshot.candidatePhosphateContactCount}`,
    `nearestNucleic=${snapshot.nearestNucleic ? `${snapshot.nearestNucleic.chainId}:${snapshot.nearestNucleic.pdbResno}` : "none"}`,
    `pairSummaries=${snapshot.candidatePairSummaries.slice(0, 8).join(" | ") || "none"}`,
    `graphEdges=${snapshot.proximityGraphEdges.length}`,
    `fingerprint=${snapshot.contextFingerprint}`,
  ].join("; ");
}

function buildSequenceFragment(
  model: StructureHierarchyModel | null,
  chain: string | null,
  pick: ViewportPickDetail | null,
  snapshot: PolymerContextSnapshot | null,
): string | null {
  if (snapshot) {
    const snippets = [
      ...Object.entries(snapshot.proteinSnippets).map(([c, s]) => `protein ${c}: ${s}`),
      ...Object.entries(snapshot.nucleicSnippets).map(([c, s]) => `nucleic ${c}: ${s}`),
    ];
    if (snippets.length) return snippets.join("\n").slice(0, MAX_FRAGMENT_CHARS);
  }
  if (!model || !chain) return null;
  const protein = model.sequenceByChain[chain];
  const nucleic = model.nucleicSequenceByChain[chain];
  const seq = protein ?? nucleic;
  if (!seq) return null;
  if (pick && pick.chain === chain) {
    return truncateSeq(seq, MAX_FRAGMENT_CHARS);
  }
  return truncateSeq(seq, MAX_FRAGMENT_CHARS);
}

function buildCachedSearchSummary(): string | null {
  const cached = loadSourceSearchFromSession();
  if (!cached.hits.length && !cached.searchQuery) return null;
  const hits = cached.hits
    .slice(0, 6)
    .map((h) => `${h.source}:${h.id} ${h.title}`)
    .join(" | ");
  return `query="${cached.searchQuery}" source=${cached.searchSource} hits=[${hits}]${cached.error ? ` error=${cached.error}` : ""}`;
}

function fingerprintInput(input: ContextBuilderInput): string {
  const parts = [
    input.proteinSelection ? proteinSelectionKey(input.proteinSelection) : "none",
    input.selectedResidueKey ?? "none",
    input.isolateChainId ?? "none",
    input.polymerContextSnapshot?.contextFingerprint ?? "none",
    input.workflow.focusedStage,
  ];
  return parts.join("|");
}

export function buildAiPlatformContext(input: ContextBuilderInput): AiPlatformContext {
  const sel = input.proteinSelection;
  const parsed = parseResidueKey(input.selectedResidueKey);
  const compact = input.contextOptions?.compactContext === true;
  const includeFull = input.contextOptions?.includeFullSequences !== false;
  const seqMax = compact ? MAX_SEQUENCE_CHARS_COMPACT : MAX_SEQUENCE_CHARS_PER_CHAIN;
  const chain =
    parsed.chain ??
    input.viewportPickDetail?.chain ??
    input.isolateChainId ??
    input.hoverChainId ??
    null;

  const proteinName = sel?.label.split("—")[0]?.trim() ?? sel?.id ?? null;

  const viewportState = [
    `representation=${input.representation}`,
    `colorScheme=${input.colorScheme}`,
    `contactRadius=${input.contextContactRadiusAngstrom}Å`,
    `interactionOverlay=${input.polymerInteractionOverlayEnabled}`,
    `nucleicAccent=${input.nucleicBackboneAccentEnabled}`,
    `measurement=${input.measurementMode}`,
    `focusQuery=${input.focusResidueQuery || "none"}`,
    `polymerKind=${input.selectedSequencePolymerKind ?? "none"}`,
    `render=${JSON.stringify(input.renderOptions)}`,
  ].join("; ");

  const workflowState = [
    `stage=${input.workflow.focusedStage}`,
    `hint=${input.workflow.contextualHint}`,
    `queue=${input.workflow.queueDepth}`,
    `jobs=${input.workflow.runningJobs.map((j) => `${j.id}:${j.stageId}:${j.status}`).join(",") || "none"}`,
    `summary=${input.workflow.workflowSourceSummary}`,
    `statuses=${Object.entries(input.workflow.stageStatuses)
      .map(([k, v]) => `${k}:${v}`)
      .join(",")}`,
  ].join("; ");

  const highlighted =
    input.polymerContextSnapshot?.sele ??
    (input.selectedResidueKey ? `residue ${input.selectedResidueKey}` : null);

  const ctx: AiPlatformContext = {
    protein_name: proteinName,
    protein_id: sel?.id ?? null,
    protein_source: sel?.source ?? null,
    protein_label: sel?.label ?? null,
    chain,
    selected_chain: parsed.chain ?? input.viewportPickDetail?.chain ?? null,
    isolated_chain: input.isolateChainId,
    residue_number: parsed.number ?? (input.viewportPickDetail ? String(input.viewportPickDetail.resno) : null),
    residue_name: input.viewportPickDetail?.resname ?? null,
    residue_key: input.selectedResidueKey,
    domain: input.extensions?.domain ?? null,
    mutation: input.extensions?.mutation ?? null,
    sequence_fragment: buildSequenceFragment(input.structureModel, chain, input.viewportPickDetail, input.polymerContextSnapshot),
    full_sequences: includeFull && input.structureModel ? truncateRecord(input.structureModel.sequenceByChain, seqMax) : null,
    nucleic_sequences: includeFull && input.structureModel ? truncateRecord(input.structureModel.nucleicSequenceByChain, seqMax) : null,
    annotations: input.extensions?.annotations ?? null,
    structure_summary: buildStructureSummary(input.structureModel, input.isolateChainId),
    platform_generated_analysis:
      input.extensions?.platform_generated_analysis ?? buildAnalysisSummary(input.polymerContextSnapshot),
    viewport_state: viewportState,
    workflow_state: workflowState,
    cached_search_hits: buildCachedSearchSummary(),
    input_drafts: input.extensions?.input_drafts ?? null,
    highlighted_region: highlighted,
    metadata: {
      pdb_ids: sel?.pdbIds?.join(",") ?? null,
      preferred_structure: sel?.preferredStructure ?? null,
      file_name: sel?.fileName ?? null,
      structure_title: input.structureModel?.title ?? null,
      atom_count: input.structureModel?.atomCount ?? null,
      residue_count: input.structureModel?.residueCount ?? null,
      chain_count: input.structureModel?.chains.length ?? null,
    },
    assembled_at: new Date().toISOString(),
    context_fingerprint: fingerprintInput(input),
  };

  return ctx;
}
