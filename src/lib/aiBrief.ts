/**
 * Fetchers for the AI routes (spec 022-ai-account-brief, task AIB-T06; server: `server/ai/routes.ts`). Hooks in
 * `src/hooks/useAiBrief.ts` are the only callers (Article IX).
 */

const BASE = "/api/ai";

export type AiStatus = {
  enabled: boolean;
  available: boolean;
  reason?: "disabled" | "no_credentials" | "breaker_open";
  /** False on the gateway route: no automatic draft (AIB-GEN-022). */
  auto_draft: boolean;
};

export type StepName = "retrieve" | "analyse" | "write" | "guard";
export type RunStatus = "running" | "succeeded" | "unverified" | "failed" | "cancelled";

/** brief-draft.v1, the fields the UI reads. */
export type BriefDraft = {
  run_id: string;
  customer_id: number;
  status: "verified" | "unverified";
  html: string;
  citations: string[];
  issues: { type: string; detail: string }[];
  word_count: number;
};

export type RunBody = { runId: string; status: RunStatus; step?: StepName; revision?: number; draft?: BriefDraft; error?: string };
export type RunEvent = { step?: StepName; revision?: number; status: RunStatus };

/** `<id>` in messages: the first 6 characters of the run ID after `run_` (AOPS-OBS-005). */
export const shortRunId = (runId: string) => runId.replace(/^run_/, "").slice(0, 6);

/** What the UI shows when the AI service cannot be reached: AI off (AIB-GEN-019). */
export const AI_OFF: AiStatus = { enabled: false, available: false, reason: "disabled", auto_draft: false };

/** The generic run failure reason (messages catalog §5), used when the server gave no reason. */
export const AI_FAILED = "Something went wrong while drafting";

/** An AI route answered with an error; `message` is the server's catalog text or AI_FAILED. */
export class AiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AiRequestError";
  }
}

async function aiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (res.status === 204) return undefined as T;
  const json = (res.headers.get("content-type") ?? "").includes("application/json");
  const body = json ? await res.json() : undefined;
  if (!res.ok || !json) throw new AiRequestError(typeof body?.error === "string" ? body.error : AI_FAILED, res.status);
  return body as T;
}

/** AIB-API-004. Never throws: anything but a valid answer means AI is off. */
export async function getAiStatus(): Promise<AiStatus> {
  try {
    const s = await aiFetch<AiStatus>("/status");
    return typeof s?.enabled === "boolean" ? { ...s, auto_draft: s.auto_draft === true } : AI_OFF;
  } catch {
    return AI_OFF;
  }
}

export const startBrief = (customerId: number) =>
  aiFetch<{ runId: string }>("/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });

export const getRun = (runId: string) => aiFetch<RunBody>(`/runs/${encodeURIComponent(runId)}`);

export const cancelRun = (runId: string) => aiFetch<void>(`/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" });

/**
 * Follows a run's progress (AIB-API-002). Calls `onEvent` for each event and `onEnd` once, after the final event or if
 * the stream breaks. Returns a function that closes the stream.
 */
export function subscribeRun(runId: string, onEvent: (event: RunEvent) => void, onEnd: () => void): () => void {
  const source = new EventSource(`${BASE}/runs/${encodeURIComponent(runId)}/events`);
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    source.close();
    onEnd();
  };
  source.onmessage = (e: MessageEvent<string>) => {
    let event: RunEvent;
    try {
      event = JSON.parse(e.data) as RunEvent;
    } catch {
      return;
    }
    onEvent(event);
    if (event.status !== "running") end();
  };
  source.onerror = end;
  return () => {
    ended = true;
    source.close();
  };
}
