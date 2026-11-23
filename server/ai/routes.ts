/**
 * The AI routes under `/api/ai` (spec 022-ai-account-brief, task AIB-T05), mounted by the workbook plugin.
 *
 * - AIB-API-004, AIB-GEN-022: `GET /status` → `{ enabled, available, reason?, auto_draft }`, without calling a model;
 *   `auto_draft` is false on the gateway route.
 * - AIB-API-001: `POST /brief { customerId }` → `202 { runId }`; 404 for an unknown customer; 503 when AI is off.
 * - AIB-API-002: `GET /runs/:id/events` → Server-Sent Events: one per step change, then one final `{ status }`.
 * - AIB-API-003: `GET /runs/:id` → status, step and, once finished, the brief-draft.v1 draft.
 * - `POST /runs/:id/cancel` → 204 (AIB-GEN-008 cancels a run the user no longer needs).
 *
 * Runs live in memory (the newest `MAX_RUNS`); checkpoints on disk and resume are AOPS-T05. Errors reach the browser as
 * messages-catalog texts mapped from the run's error code, never as raw error text (Article V, AOPS-OBS-002). The config
 * and model client are built on the first AI request, so AI settings never affect `/api/workbook` (AOPS-FAIL-007).
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { aiStatus, createModelClient, type AiStatus, type ModelClient } from "./client";
import { loadAiConfig, type AiConfigResult, type Env } from "./config";
import type { BriefDraftV1 } from "./contracts";
import {
  newRunId,
  openReadOnlyStore,
  runBrief,
  type RunErrorCode,
  type RunRecord,
  type RunStatus,
  type StepRegistry,
} from "./orchestrator";
import type { StepName } from "./config";
import type { ReadOnlyStore } from "./tools";
import { analystStep } from "./steps/analyst";
import { guardStep } from "./steps/guard";
import { retrieve } from "./steps/retriever";
import { writerStep } from "./steps/writer";

/** Texts the routes return (messages catalog §5). */
export const AI_MESSAGES = {
  disabled: "AI is not enabled",
  breakerOpen: "AI is temporarily unavailable. Try again in a few minutes.",
  unavailable: "AI is unavailable right now",
  failed: "Something went wrong while drafting",
  finalCheck: "Draft did not pass the final check",
  customerNotFound: "Customer not found",
  runNotFound: "Run not found",
  badRequest: "customerId must be a whole number",
  unknownRoute: "Unknown AI request",
} as const;

/** The run error code → the reason shown in "Could not draft the summary: <reason> (run <id>)". */
export function errorReason(code: RunErrorCode | undefined, failedStep?: StepName): string {
  if (code === "model_unavailable" || code === "workbook_unavailable") return AI_MESSAGES.unavailable;
  if (code === "invalid_output" && failedStep === "guard") return AI_MESSAGES.finalCheck;
  return AI_MESSAGES.failed;
}

export const MAX_RUNS = 50;

export type StatusBody = AiStatus & { auto_draft: boolean };

export interface RunEvent {
  step?: StepName;
  revision?: number;
  status: RunStatus;
}

export interface RunBody {
  runId: string;
  status: RunStatus;
  step?: StepName;
  revision?: number;
  draft?: BriefDraftV1;
  error?: string;
}

interface RunState {
  runId: string;
  status: RunStatus;
  step?: StepName;
  revision?: number;
  record?: RunRecord;
  controller: AbortController;
  events: RunEvent[];
  listeners: Set<(event: RunEvent) => void>;
}

export interface AiRouteDeps {
  /** The workbook file (the plugin's). */
  readonly file: string;
  /** Default: `process.env`. */
  readonly env?: Env;
  readonly projectDir?: string;
  /** Tests: a model client instead of the one built from the config. */
  readonly client?: ModelClient | null;
  /** Tests: steps replacing the real ones. */
  readonly steps?: Partial<StepRegistry>;
  /** Tests: a store instead of a read-only view of `file`. */
  readonly store?: ReadOnlyStore;
  readonly log?: (line: string) => void;
}

const DEFAULT_STEPS: StepRegistry = {
  retrieve: { run: (input, ctx) => retrieve({ customerId: input.customerId }, { store: ctx.store, runId: input.runId }) },
  analyse: analystStep,
  write: writerStep,
  guard: guardStep,
};

function sendJson(res: ServerResponse, status: number, body?: unknown) {
  res.statusCode = status;
  if (body === undefined) {
    res.end();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 10_000) return undefined;
    chunks.push(c as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
  } catch {
    return undefined;
  }
}

/** Builds the `/api/ai` handler. Connect strips the mount path, so `req.url` starts after `/api/ai`. */
export function createAiRoutes(deps: AiRouteDeps): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  let ready: { result: AiConfigResult; client: ModelClient | null; store: ReadOnlyStore } | undefined;
  const runs = new Map<string, RunState>();

  function setup() {
    if (!ready) {
      const result = loadAiConfig(deps.env ?? process.env, { projectDir: deps.projectDir });
      // Config errors name the variable and the rule only (config.ts); they are for the server log, not the browser.
      if ("errors" in result) (deps.log ?? console.warn)(`[ai] config: ${result.errors.join("; ")}`);
      const client = deps.client !== undefined ? deps.client : createModelClient(result);
      ready = { result, client, store: deps.store ?? openReadOnlyStore(deps.file) };
    }
    return ready;
  }

  function status(): StatusBody {
    const { result } = setup();
    return { ...aiStatus(result), auto_draft: result.ok && result.config.route === "direct" };
  }

  function emit(state: RunState, event: RunEvent) {
    state.events.push(event);
    for (const listener of state.listeners) listener(event);
  }

  function remember(state: RunState) {
    runs.set(state.runId, state);
    // Keep the newest runs; drop the oldest finished ones.
    for (const [id, old] of runs) {
      if (runs.size <= MAX_RUNS) break;
      if (old.status !== "running") runs.delete(id);
    }
  }

  async function startRun(customerId: number): Promise<string> {
    const { result, client, store } = setup();
    if (!result.ok) throw new Error("unreachable: AI is enabled only with a valid config");
    const runId = newRunId();
    const state: RunState = { runId, status: "running", controller: new AbortController(), events: [], listeners: new Set() };
    remember(state);
    void runBrief(
      {
        config: result.config,
        steps: { ...DEFAULT_STEPS, ...deps.steps },
        store,
        client,
        log: deps.log,
        onProgress: (p) => {
          state.step = p.step;
          state.revision = p.revision;
          emit(state, { step: p.step, revision: p.revision, status: "running" });
        },
      },
      { customerId, runId, signal: state.controller.signal },
    ).then((record) => {
      state.record = record;
      state.status = record.status;
      emit(state, { status: record.status });
    });
    return runId;
  }

  function runBody(state: RunState): RunBody {
    const body: RunBody = { runId: state.runId, status: state.status };
    if (state.step) body.step = state.step;
    if (state.revision !== undefined) body.revision = state.revision;
    const record = state.record;
    if (record && (record.status === "succeeded" || record.status === "unverified")) {
      body.draft = record.completed.find((c) => c.step === "guard")?.output as BriefDraftV1;
    }
    if (record?.status === "failed") body.error = errorReason(record.error, record.failedStep);
    return body;
  }

  function stream(state: RunState, req: IncomingMessage, res: ServerResponse) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const write = (event: RunEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    const done = () => {
      state.listeners.delete(listener);
      res.end();
    };
    const listener = (event: RunEvent) => {
      write(event);
      if (event.status !== "running") done();
    };
    for (const event of state.events) write(event);
    if (state.status !== "running") {
      res.end();
      return;
    }
    state.listeners.add(listener);
    req.on("close", () => state.listeners.delete(listener));
  }

  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://local");
    const parts = url.pathname.split("/").filter(Boolean);
    const method = req.method ?? "GET";
    try {
      if (method === "GET" && parts[0] === "status" && parts.length === 1) return sendJson(res, 200, status());

      if (method === "POST" && parts[0] === "brief" && parts.length === 1) {
        const s = status();
        if (!s.enabled) return sendJson(res, 503, { error: AI_MESSAGES.disabled });
        if (!s.available) return sendJson(res, 503, { error: AI_MESSAGES.breakerOpen });
        const body = await readJson(req);
        const customerId = body !== null && typeof body === "object" ? (body as { customerId?: unknown }).customerId : undefined;
        if (typeof customerId !== "number" || !Number.isSafeInteger(customerId)) return sendJson(res, 400, { error: AI_MESSAGES.badRequest });
        const { store } = setup();
        await store.fresh();
        const exists = (store.table("customer").rows as { id?: unknown }[]).some((r) => r.id === customerId);
        if (!exists) return sendJson(res, 404, { error: AI_MESSAGES.customerNotFound });
        return sendJson(res, 202, { runId: await startRun(customerId) });
      }

      if (parts[0] === "runs" && parts[1]) {
        const state = runs.get(parts[1]);
        if (!state) return sendJson(res, 404, { error: AI_MESSAGES.runNotFound });
        if (method === "GET" && parts.length === 2) return sendJson(res, 200, runBody(state));
        if (method === "GET" && parts[2] === "events" && parts.length === 3) return stream(state, req, res);
        if (method === "POST" && parts[2] === "cancel" && parts.length === 3) {
          state.controller.abort();
          return sendJson(res, 204);
        }
      }
      return sendJson(res, 404, { error: AI_MESSAGES.unknownRoute });
    } catch {
      // Never raw error text to the browser (Article V); the code path is the server's to log.
      (deps.log ?? console.error)("[ai] route_error");
      if (!res.headersSent) sendJson(res, 500, { error: AI_MESSAGES.failed });
    }
  };
}
