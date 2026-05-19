# Workflow orchestration (client)

- **`stageTypes.ts`** — canonical stage IDs / labels; re-exported from `@/contexts/WorkflowContext`.
- **`orchestrationStore.ts`** — vanilla subscribe store updated by `WorkflowProvider` polling.
- **`mergeStageStatuses.ts`** — overlays server job rows (`running` / `failed`) on viewer-derived statuses.
- **`workflowRuntime.ts`** (in `core/events/`) — lightweight pub/sub for viewer + poll events.

Inspector copy and the dev-only JSON panel document that **most stage colors come from selection + loaded structure**, not from a remote inference FSM, until jobs are registered on the server queue.
