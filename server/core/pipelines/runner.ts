import type { JobRecord } from "../types/jobSchemas.js";
import type { JobStore } from "../jobs/store.js";
import type { AiEnvConfig } from "../config/env.js";
import { loadAiEnv } from "../config/env.js";
import { scheduleJob } from "../ai/orchestrator.js";
import { PRESET_PIPELINES } from "./presets.js";
import { extractMsaAlignmentFromResult } from "./msaResult.js";

const WAIT_MS = 900_000;

function presetExists(id: string): boolean {
  return PRESET_PIPELINES.some((p) => p.id === id);
}

async function waitForTerminalJob(store: JobStore, jobId: string): Promise<JobRecord | null> {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    const j = await store.get(jobId);
    if (!j) return null;
    if (j.status === "completed" || j.status === "failed") return j;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

export type PipelineRunResult =
  | { ok: true; presetId: string; msaJob: JobRecord; foldJob: JobRecord }
  | { ok: false; presetId: string; error: string; msaJob?: JobRecord; foldJob?: JobRecord };

/**
 * Run `fasta_msa_af3`: MSA search, then AlphaFold3 with real A3M.
 * Blocks until MSA completes (up to {@link WAIT_MS}), then enqueues folding.
 */
export async function runFastaMsaAf3Pipeline(
  store: JobStore,
  sequence: string,
  dryRun: boolean,
): Promise<PipelineRunResult> {
  const presetId = "fasta_msa_af3";
  if (!presetExists(presetId)) {
    return { ok: false, presetId, error: "preset not found" };
  }

  const seq = sequence.trim();
  if (!seq) {
    return { ok: false, presetId, error: "sequence required" };
  }

  const cfg = loadAiEnv() as AiEnvConfig;

  const msaInput: Record<string, unknown> = {
    sequence: seq.toUpperCase(),
    output_alignment_formats: ["a3m"],
  };
  if (dryRun) {
    msaInput.__biolabsDryRun = true;
  }

  const msaJob = await store.create("msa_search", msaInput);
  scheduleJob(msaJob.id, store, cfg);

  const msaDone = await waitForTerminalJob(store, msaJob.id);
  if (!msaDone) {
    return { ok: false, presetId, error: "MSA job timed out", msaJob };
  }
  if (msaDone.status === "failed") {
    return { ok: false, presetId, error: msaDone.error ?? "MSA job failed", msaJob: msaDone };
  }

  let alignment: string | null = null;
  if (dryRun) {
    alignment = ">stub\nAAAA\n";
  } else {
    alignment = msaDone.result ? extractMsaAlignmentFromResult(msaDone.result) : null;
  }

  if (!alignment) {
    return {
      ok: false,
      presetId,
      error: "MSA completed but no alignmentText in normalized result",
      msaJob: msaDone,
    };
  }

  const foldInput: Record<string, unknown> = {
    sequence: seq.toUpperCase(),
    use_external_msa: true,
    msa_alignment_text: alignment,
  };
  if (dryRun) {
    foldInput.__biolabsDryRun = true;
  }

  const foldJob = await store.create("alphafold3", foldInput);
  scheduleJob(foldJob.id, store, cfg);

  return { ok: true, presetId, msaJob: msaDone, foldJob };
}
