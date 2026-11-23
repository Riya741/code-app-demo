/**
 * The brief pipeline's orchestrator (spec 024-agent-ops, tasks AOPS-T01 and AOPS-T11; ADR-0008). A code step, not an agent.
 *
 * Deterministic code, not an LLM. In this task it is the skeleton: the state machine, hand-off validation, the tool and
 * model helpers that steps must use, settings, and traces. Steps are registered by the caller (stubs in tests; the real
 * steps arrive with AIB-T02..T04). Resilience (AOPS-T03), the repair retry (AOPS-T04), checkpoints on disk, resume and
 * idempotent start (AOPS-T05) and budget enforcement (AOPS-T06) plug in at the places marked below.
 *
 * - AOPS-ORCH-006: `nextStep` is the whole state machine: retrieve → analyse → write → guard, with no branch (the Critic
 *   and its revision loop were removed by CR-20261121-1). Only analyse and write call a model.
 * - AOPS-FAIL-008: the run ends `unverified` when the guard's draft is `unverified` (failed citation checks), else
 *   `succeeded`.
 * - AOPS-ORCH-002: every step's output is checked with `validateContract` against the step's fixed output contract
 *   (`STEP_OUTPUT_CONTRACT`, not chosen by the step) and must carry the run's `run_id`. An invalid hand-off fails the
 *   run; it is never passed on and never repaired (the one repair retry of AOPS-FAIL-002 is AOPS-T04).
 * - AOPS-ORCH-003: an LLM step reaches the model only through `ctx.callModel`, which sets the model, effort,
 *   `max_tokens` and timeout from the config (agent-spec defaults); the step and model-call spans record them.
 * - AOPS-ORCH-004: a step reaches tools only through `ctx.tools.call`, which grants the agent's listed tools
 *   (`buildToolSet`; a code step is keyed `code:<step>` and gets none); a refused call records a `tool_denied` span and
 *   fails the step, even if the step catches it.
 * - AOPS-OBS-007/002: one span per run, step, model call and tool call (trace.ts), with no free text; only spans of
 *   agent steps carry an agent spec ID and version. The console gets one line per run with the run ID, status and
 *   error code only.
 * - Article II.3 / XII.3: the workbook is read through its own read-only `Store` view (`openReadOnlyStore`), reloaded
 *   from disk by mtime, never the plugin's instance: a model never sees an in-memory change whose save later failed,
 *   and `save()` is not reachable (not in the type, not on the object).
 */
import crypto from "node:crypto";
import {
  validateContract,
  type AnalystToWriterV1,
  type BriefDraftV1,
  type ContractId,
  type FactSheetV1,
  type WriterDraftV1,
} from "./contracts";
import { classifyModelError, type ModelClient, type ModelRequest, type ModelResponse } from "./client";
import { STEP_AGENTS, STEP_NAMES, type AiConfig, type RunLimits, type StepName, type StepSettings } from "./config";
import { costUsd, fileSink, hashLabel, tokensFromUsage, Tracer, type OpenSpan, type SpanSink, type TokenUsage } from "./trace";
import {
  TOOL_NAMES,
  buildToolSet,
  callTool,
  modelToolDefinitions,
  type ModelToolDefinition,
  type ReadOnlyStore,
  type ToolResult,
} from "./tools";
import { Store } from "../workbook";

/* ------------------------------------------------------------------------------------------- store */

/** Freezes a value and everything reachable from it; returns the same value. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * A read-only view of the workbook for the AI pipeline: a separate `Store` instance (re-read from disk when the file
 * changes), exposing only `fresh()` and `table()`. The sheets it returns are frozen (rows, columns and the sheet), so a
 * step cannot change what a later step or tool reads; a reload builds new sheet objects, so freezing costs one pass per
 * sheet per file change. The view's rows belong to this instance only and are never saved.
 */
export function openReadOnlyStore(file: string): ReadOnlyStore {
  const store = new Store(file);
  return Object.freeze({ fresh: () => store.fresh(), table: (name: string) => deepFreeze(store.table(name)) });
}

/* ------------------------------------------------------------------------------------------- state machine */

/** Each step's output contract (agent specs, "Outputs"; spec/contracts/README.md for the code steps). */
export const STEP_OUTPUT_CONTRACT: Readonly<Record<StepName, ContractId>> = Object.freeze({
  retrieve: "fact-sheet.v1",
  analyse: "analyst-to-writer.v1",
  write: "writer-draft.v1",
  guard: "brief-draft.v1",
});

/** Where a run is. `revision` stays 0 since CR-20261121-1 (no revision loop); kept for the contracts and checkpoints. */
export interface Position {
  readonly step: StepName;
  readonly revision: number;
}

/** The state machine (AOPS-ORCH-006): a straight line with no branch. Returns `null` after `guard` (the run is over). */
export function nextStep(at: Position): Position | null {
  switch (at.step) {
    case "retrieve":
      return { step: "analyse", revision: 0 };
    case "analyse":
      return { step: "write", revision: 0 };
    case "write":
      return { step: "guard", revision: 0 };
    case "guard":
      return null;
  }
}

/* ------------------------------------------------------------------------------------------- step types */

export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export interface StepInputs {
  retrieve: { runId: string; customerId: number };
  analyse: FactSheetV1;
  write: { runId: string; revision: number; analysis: AnalystToWriterV1 };
  guard: {
    runId: string;
    customerId: number;
    revisions: number;
    draft: WriterDraftV1;
    factSheet: FactSheetV1;
    usage: RunUsage;
  };
}

export interface StepOutputs {
  retrieve: FactSheetV1;
  analyse: AnalystToWriterV1;
  write: WriterDraftV1;
  guard: BriefDraftV1;
}

/** Per-run limits and what has been used so far (enforced by AOPS-T06). */
export interface Budget {
  readonly limits: RunLimits;
  used(): { tokens: number; costUsd: number; seconds: number };
}

/**
 * The tools a step may use: only through `call`, which applies the agent's allow-list (AOPS-ORCH-004). The underlying
 * `ToolSet` is deliberately not exposed, so no step can reach `callTool`/`runTool` around the span and the step failure.
 */
export interface StepTools {
  /** Definitions to offer the model (only the allowed tools, strict). */
  definitions(): ModelToolDefinition[];
  /** Calls a tool. A refused tool records a `tool_denied` span and throws `StepFailure("tool_denied")`. */
  call(name: unknown, input: unknown): Promise<ToolResult>;
}

/** A model request without the settings the orchestrator owns (model, `max_tokens`, effort). */
export type StepModelRequest = Omit<ModelRequest, "model" | "max_tokens">;

export interface StepContext {
  readonly runId: string;
  readonly customerId: number;
  readonly signal: AbortSignal;
  readonly budget: Budget;
  /** The step's span; model and tool calls are traced under it. */
  readonly trace: OpenSpan;
  readonly tools: StepTools;
  /** Read-only workbook view (the Retriever's input). */
  readonly store: ReadOnlyStore;
  /** The step's model settings; `null` for deterministic steps. */
  readonly settings: StepSettings | null;
  /** Calls the model with this step's settings (AOPS-ORCH-003). Deterministic steps may not call it. */
  callModel(request: StepModelRequest): Promise<ModelResponse>;
}

export type Step<I, O> = (input: I, ctx: StepContext) => Promise<O>;

export interface StepDefinition<N extends StepName> {
  /** The step function. Its output is validated by the orchestrator, whatever its static type says. */
  readonly run: Step<StepInputs[N], StepOutputs[N]>;
  /** Prompt version recorded on its spans (LLM steps), e.g. `analyst.v1`. */
  readonly promptVersion?: string;
}

export type StepRegistry = { readonly [N in StepName]: StepDefinition<N> };

/* ------------------------------------------------------------------------------------------- run record */

export type RunStatus = "running" | "succeeded" | "unverified" | "failed" | "cancelled";

/** Why a run failed: a code, never free text; user-facing reasons are mapped from it by the routes (AIB-T05). */
export const RUN_ERROR_CODES = [
  "steps_missing",
  "workbook_unavailable",
  "not_found",
  "invalid_output",
  "tool_denied",
  "model_unavailable",
  "model_not_allowed",
  "model_error",
  "step_failed",
] as const;
export type RunErrorCode = (typeof RUN_ERROR_CODES)[number];

/**
 * The code a step reported by throwing an error with a `code` property (e.g. the Retriever's `CustomerNotFoundError`
 * → `not_found`, `FactSheetInvalidError` → `invalid_output`), if it is a known run error code. `tool_denied` is not
 * taken from a step: only a refused call through `ctx.tools.call` sets it. The error's message is never read.
 */
function reportedCode(e: unknown): RunErrorCode | undefined {
  const code = e !== null && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : undefined;
  return typeof code === "string" && code !== "tool_denied" && (RUN_ERROR_CODES as readonly string[]).includes(code)
    ? (code as RunErrorCode)
    : undefined;
}

export interface RunRecord {
  runId: string;
  customerId: number;
  /** Hash of the fact sheet's data (without run ID and time); set after `retrieve` (idempotent start: AOPS-T05). */
  dataHash: string;
  status: RunStatus;
  /** Validated outputs in order: the checkpoint content (written to disk by AOPS-T05). */
  completed: { step: StepName; revision: number; output: unknown }[];
  usage: RunUsage;
  startedAt: string;
  finishedAt?: string;
  error?: RunErrorCode;
  failedStep?: StepName;
}

/** A step failure with a code. Thrown by the helpers; caught by the orchestrator. Carries no free text. */
export class StepFailure extends Error {
  constructor(readonly code: RunErrorCode) {
    super(code);
    this.name = "StepFailure";
  }
}

/* ------------------------------------------------------------------------------------------- orchestrator */

export interface OrchestratorDeps {
  readonly config: AiConfig;
  readonly steps: Partial<StepRegistry>;
  readonly store: ReadOnlyStore;
  /** `null` when AI may not reach a model (AOPS-FAIL-007); LLM steps then fail with `model_unavailable`. */
  readonly client: ModelClient | null;
  /** Where spans go. Default: `<config.tracesDir>/<run_id>.jsonl`. */
  readonly sink?: (runId: string) => SpanSink;
  /** Server log line per run: run ID, status, error code (AOPS-OBS-002). Default: `console.info`. */
  readonly log?: (line: string) => void;
  /** Called after each completed step with the run record (checkpoint hook, AOPS-T05). */
  readonly onCheckpoint?: (record: Readonly<RunRecord>) => void | Promise<void>;
  /** Progress for the SSE route (AIB-T05). */
  readonly onProgress?: (event: { runId: string; step: StepName; revision: number; status: RunStatus }) => void;
  readonly now?: () => number;
  readonly clock?: () => number;
}

export interface RunRequest {
  readonly customerId: number;
  readonly runId?: string;
  readonly signal?: AbortSignal;
}

/** `run_` + 24 lower-case hex characters (matches every contract's `run_id`). */
export function newRunId(): string {
  return `run_${crypto.randomBytes(12).toString("hex")}`;
}

function dataHashOf(factSheet: FactSheetV1): string {
  // Run ID and time are not data.
  const { run_id, generated_at, ...data } = factSheet;
  return crypto.createHash("sha256").update(JSON.stringify(data), "utf8").digest("hex");
}

function addTokens(into: TokenUsage, more: TokenUsage) {
  into.input += more.input;
  into.output += more.output;
  into.cacheRead += more.cacheRead;
  into.cacheWrite = (into.cacheWrite ?? 0) + (more.cacheWrite ?? 0);
}

/** Runs one brief to an end state: `succeeded`, `unverified`, `failed` or `cancelled`. Never throws. */
export async function runBrief(deps: OrchestratorDeps, request: RunRequest): Promise<RunRecord> {
  const runId = request.runId ?? newRunId();
  const signal = request.signal ?? new AbortController().signal;
  const clock = deps.clock ?? Date.now;
  const writeLog = deps.log ?? ((line: string) => console.info(line));
  // Hooks and the log are the caller's code: none of them may make `runBrief` reject or leave the run span open.
  const log = (line: string) => {
    try {
      writeLog(line);
    } catch {
      // A broken logger must not change the run's outcome.
    }
  };
  let sink: SpanSink;
  try {
    sink = (deps.sink ?? ((id) => fileSink(deps.config.tracesDir, id)))(runId);
  } catch {
    sink = { write: () => undefined };
    log(`[ai] ${runId} trace_unavailable`);
  }
  const tracer = new Tracer({ runId, sink, now: deps.now, clock });
  const t0 = clock();

  const record: RunRecord = {
    runId,
    customerId: request.customerId,
    dataHash: "",
    status: "running",
    completed: [],
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0 },
    startedAt: new Date(t0).toISOString(),
  };
  const runTokens: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const budget: Budget = {
    limits: deps.config.limits,
    used: () => ({
      tokens: runTokens.input + runTokens.output + runTokens.cacheRead + (runTokens.cacheWrite ?? 0),
      costUsd: record.usage.costUsd,
      seconds: (clock() - t0) / 1000,
    }),
  };
  // The orchestrator is code, not an agent: the run span carries no agent ID (AOPS-OBS-007).
  // AOPS-ROUTE-006: where model calls go, on the run span and every llm_call span (host and provider only, never a key).
  const gw = deps.config.gateway;
  const routeFields = { route: deps.config.route ?? "direct", ...(gw ? { gatewayHost: gw.host, gatewayProvider: gw.provider } : {}) };
  const runSpan = tracer.start("run", { limits: deps.config.limits, retries: 0, ...routeFields });

  /** Runs one step: helpers, then validation of its output (AOPS-ORCH-002). Throws `StepFailure`. */
  async function runStep<N extends StepName>(at: Position, input: StepInputs[N]): Promise<StepOutputs[N]> {
    const step = at.step as N;
    const def = deps.steps[step] as StepDefinition<N>;
    // Code steps (retrieve, guard) have no agent spec: their spans carry no agent ID (AOPS-OBS-007).
    const agent = STEP_AGENTS[step].agent ?? undefined;
    const agentVersion = STEP_AGENTS[step].agentVersion ?? undefined;
    const settings = deps.config.steps[step] ?? null;
    const promptVersion = def.promptVersion;
    const settingFields = settings ? { model: settings.model, effort: settings.effort, maxTokens: settings.maxTokens, timeoutMs: settings.timeoutMs } : {};
    const span = tracer.start("step", { step, agent, agentVersion, promptVersion, revision: at.revision, retries: 0, ...settingFields }, runSpan);
    const stepTokens: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    let stepCost = 0;
    let denied = false;
    const toolSet = buildToolSet(agent ?? `code:${step}`, { store: deps.store, customerId: request.customerId });

    const tools: StepTools = {
      definitions: () => modelToolDefinitions(toolSet),
      async call(name, input) {
        const known = typeof name === "string" && (TOOL_NAMES as readonly string[]).includes(name);
        // A tool name the model made up is model output: only its hash is traced (AOPS-OBS-002).
        const label = known
          ? { tool: name as string }
          : { tool: "unknown", toolNameHash: hashLabel(typeof name === "string" ? name : String(name)) };
        const toolSpan = tracer.start("tool_call", { step, agent, agentVersion, ...label }, span);
        const result = await callTool(toolSet, name, input);
        if (result.outcome === "tool_denied") {
          denied = true;
          toolSpan.end({ outcome: "tool_denied", errorCode: "tool_denied" });
          throw new StepFailure("tool_denied");
        }
        if (result.outcome === "ok") toolSpan.end({ outcome: "ok", resultChars: result.result_chars });
        else toolSpan.end({ outcome: "error", errorCode: result.code });
        return result;
      },
    };

    const ctx: StepContext = {
      runId,
      customerId: request.customerId,
      signal,
      budget,
      trace: span,
      tools,
      store: deps.store,
      settings,
      async callModel(req) {
        if (!settings) throw new StepFailure("model_not_allowed");
        if (!deps.client) throw new StepFailure("model_unavailable");
        // The orchestrator's settings win over anything in the request (AOPS-ORCH-003).
        const params: ModelRequest = {
          ...req,
          model: settings.model,
          max_tokens: settings.maxTokens,
          output_config: { ...(req.output_config ?? {}), effort: settings.effort },
        };
        const callSpan = tracer.start("llm_call", { step, agent, agentVersion, promptVersion, revision: at.revision, ...settingFields, ...routeFields }, span);
        // Resilience (retry, timeout, stop reasons, faults, breaker: AOPS-T03, AOPS-T06) wraps this call.
        let response: ModelResponse;
        try {
          response = await deps.client.create(params, { signal, timeoutMs: settings.timeoutMs });
        } catch (e) {
          callSpan.end({ outcome: signal.aborted ? "cancelled" : "error", errorCode: classifyModelError(e), retries: 0 });
          throw new StepFailure("model_error");
        }
        const tokens = tokensFromUsage(response.usage);
        const cost = costUsd(settings.model, tokens);
        addTokens(stepTokens, tokens);
        addTokens(runTokens, tokens);
        stepCost += cost;
        record.usage.inputTokens += tokens.input;
        record.usage.outputTokens += tokens.output;
        record.usage.cacheReadTokens += tokens.cacheRead;
        record.usage.costUsd += cost;
        callSpan.end({ outcome: "ok", tokens, costUsd: cost, stopReason: response.stop_reason ?? undefined, retries: 0 });
        return response;
      },
    };

    const usageFields = () => (settings ? { tokens: stepTokens, costUsd: stepCost } : {});
    let output: unknown;
    try {
      output = await def.run(input, ctx);
    } catch (e) {
      // A known code the step reported is kept (e.g. the Retriever's `not_found`); the error's message never is.
      const code: RunErrorCode = denied ? "tool_denied" : e instanceof StepFailure && e.code !== "tool_denied" ? e.code : (reportedCode(e) ?? "step_failed");
      span.end({ outcome: code === "tool_denied" ? "tool_denied" : signal.aborted ? "cancelled" : "error", errorCode: code, ...usageFields() });
      throw new StepFailure(code);
    }
    // A refused tool fails the step even if the step caught the failure and carried on (AOPS-ORCH-004).
    if (denied) {
      span.end({ outcome: "tool_denied", errorCode: "tool_denied", ...usageFields() });
      throw new StepFailure("tool_denied");
    }
    const checked = validateContract(STEP_OUTPUT_CONTRACT[step], output);
    // `"errors" in` narrows under both the strict (server) and non-strict (tests) compiler settings.
    const errors =
      "errors" in checked
        ? checked.errors
        : (checked.value as { run_id?: unknown }).run_id === runId
          ? []
          : ["run_id: does not match the run"];
    if (errors.length) {
      // Rejected, never repaired and never passed on (AOPS-ORCH-002); the errors are masked by the tracer.
      span.end({ outcome: "error", errorCode: "invalid_output", errors, ...usageFields() });
      throw new StepFailure("invalid_output");
    }
    span.end({ outcome: "ok", ...usageFields() });
    // A frozen copy is what later steps and the checkpoint get: neither the producing step (which may still hold a
    // reference) nor a later step can change a validated hand-off after the fact (AOPS-ORCH-002).
    return deepFreeze(structuredClone((checked as { ok: true; value: StepOutputs[N] }).value));
  }

  const finish = (status: RunStatus, error?: RunErrorCode, failedStep?: StepName): RunRecord => {
    record.status = status;
    record.finishedAt = new Date(clock()).toISOString();
    if (error) record.error = error;
    if (failedStep) record.failedStep = failedStep;
    runSpan.end({
      outcome: status === "failed" ? (error === "tool_denied" ? "tool_denied" : "error") : status === "cancelled" ? "cancelled" : "ok",
      status,
      errorCode: error,
      step: failedStep,
      tokens: runTokens,
      costUsd: record.usage.costUsd,
    });
    log(`[ai] ${runId} ${status}${error ? ` ${error}` : ""}${failedStep ? ` ${failedStep}` : ""}`);
    return record;
  };

  try {
    return await drive();
  } catch {
    // Unreachable by design (every step error is caught below); kept so `runBrief` can never reject.
    return finish("failed", "step_failed");
  }

  /** The state machine loop; every path ends in `finish`. */
  async function drive(): Promise<RunRecord> {
    if (STEP_NAMES.some((s) => typeof deps.steps[s]?.run !== "function")) return finish("failed", "steps_missing");
    try {
      await deps.store.fresh();
    } catch {
      return finish("failed", "workbook_unavailable");
    }

    const out: Partial<StepOutputs> = {};
    let at: Position | null = { step: "retrieve", revision: 0 };
    while (at) {
      // Cancel between steps (AOPS-REC-002 also aborts in-flight calls through `signal`; AOPS-T05).
      if (signal.aborted) return finish("cancelled", undefined, at.step);
      try {
        deps.onProgress?.({ runId, step: at.step, revision: at.revision, status: "running" });
      } catch {
        // Progress is for the UI (AIB-T05); a broken listener must not change the run.
      }
      try {
        switch (at.step) {
          case "retrieve":
            out.retrieve = await runStep<"retrieve">(at, { runId, customerId: request.customerId });
            record.dataHash = dataHashOf(out.retrieve);
            break;
          case "analyse":
            out.analyse = await runStep<"analyse">(at, out.retrieve!);
            break;
          case "write":
            out.write = await runStep<"write">(at, { runId, revision: at.revision, analysis: out.analyse! });
            break;
          case "guard":
            out.guard = await runStep<"guard">(at, {
              runId,
              customerId: request.customerId,
              revisions: at.revision,
              draft: out.write!,
              factSheet: out.retrieve!,
              usage: { ...record.usage },
            });
            break;
        }
      } catch (e) {
        if (signal.aborted) return finish("cancelled", undefined, at.step);
        return finish("failed", e instanceof StepFailure ? e.code : "step_failed", at.step);
      }
      record.completed.push({ step: at.step, revision: at.revision, output: out[at.step] });
      try {
        await deps.onCheckpoint?.(record);
      } catch {
        // Checkpoint writing (AOPS-T05) must not fail a run that has a valid result in memory.
      }
      at = nextStep(at);
    }
    // The guard's citation checks decide (AOPS-FAIL-008).
    return finish(out.guard?.status === "verified" ? "succeeded" : "unverified");
  }
}
