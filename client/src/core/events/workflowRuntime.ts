/**
 * Thin workflow/runtime event channel — subscribers can react without coupling to React.
 * Emitted from WorkflowProvider (viewer + poll hooks).
 */

export type WorkflowRuntimeEvent =
  | {
      type: "viewer:context";
      hasSelection: boolean;
      hasStructureModel: boolean;
      isPredicted: boolean;
    }
  | {
      type: "workflow:poll";
      connected: boolean;
      queueDepth: number;
      jobCount: number;
    }
  | {
      type: "workflow:poll-error";
      message: string;
    };

type Handler = (e: WorkflowRuntimeEvent) => void;

const handlers = new Set<Handler>();

export function subscribeWorkflowRuntime(h: Handler): () => void {
  handlers.add(h);
  return () => handlers.delete(h);
}

export function emitWorkflowRuntimeEvent(event: WorkflowRuntimeEvent): void {
  handlers.forEach((h) => {
    try {
      h(event);
    } catch {
      /* isolate subscriber errors */
    }
  });
}
