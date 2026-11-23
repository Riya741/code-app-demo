/**
 * Trace spans for AI runs (spec 024-agent-ops, task AOPS-T01; Constitution Article XII.7).
 *
 * - AOPS-OBS-007: every run, step, model call and tool call emits one span (the design's `Span`), appended as one JSON
 *   line to `<AI_RUNS_DIR>/traces/<run_id>.jsonl` when it ends.
 * - AOPS-OBS-002: a span holds only IDs, enums, counts, hashes and masked validator errors; never workbook free text,
 *   prompts or model output (ai-data-policy §6). `toTraceRecord` rebuilds every span field by field from an allow-list
 *   of shapes before it is written, so a field a caller sets wrongly is dropped rather than written.
 * - Cost comes from the response `usage` and the price table below (the one place prices live).
 * - Writing a trace never fails a run: an I/O error is reported once on the console with the run ID only.
 *
 * Extensions of the design's `Span` (recorded in the hand-off): `startedAt`, `maxTokens` / `timeoutMs` (AOPS-ORCH-003
 * asks for every setting used), `limits` (AOPS-BUDG-002), `revision`, `status`, `tool`, `toolNameHash`, `resultChars`,
 * `errorCode`, `errors` and `tokens.cacheWrite`.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { RunLimits, StepName } from "./config";
import { EFFORTS, STEP_NAMES } from "./config";
import { TOOL_NAMES } from "./tools";

/* ------------------------------------------------------------------------------------------- prices */

/** US dollars per million tokens. Model IDs with a date suffix match by prefix. */
export const PRICES_PER_MTOK: Readonly<Record<string, { input: number; output: number }>> = Object.freeze({
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
});
/** Prompt-cache reads are billed at 10% of the input price; cache writes (5-minute TTL) at 125%. */
export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite?: number;
}

/** The price row for a model; an unknown model is charged at the dearest known price, so budgets never under-count. */
export function priceFor(model: string): { input: number; output: number } {
  const id = Object.keys(PRICES_PER_MTOK)
    .sort((a, b) => b.length - a.length)
    .find((k) => model === k || model.startsWith(`${k}-`));
  if (id) return PRICES_PER_MTOK[id];
  return Object.values(PRICES_PER_MTOK).reduce((a, b) => (b.input > a.input ? b : a));
}

export function costUsd(model: string, tokens: TokenUsage): number {
  const p = priceFor(model);
  const dollars =
    tokens.input * p.input +
    tokens.output * p.output +
    tokens.cacheRead * p.input * CACHE_READ_MULTIPLIER +
    (tokens.cacheWrite ?? 0) * p.input * CACHE_WRITE_MULTIPLIER;
  return dollars / 1_000_000;
}

/** Token counts from an `Anthropic.Message["usage"]` (null counts read as 0). */
export function tokensFromUsage(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
}): TokenUsage {
  return {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
  };
}

/* ------------------------------------------------------------------------------------------- span */

export type SpanKind = "run" | "step" | "llm_call" | "tool_call";
export type SpanOutcome = "ok" | "retry" | "error" | "tool_denied" | "budget" | "cancelled";
export type RunStatus = "running" | "succeeded" | "unverified" | "failed" | "cancelled";

export interface Span {
  spanId: string;
  parentId?: string;
  runId: string;
  kind: SpanKind;
  startedAt: string;
  step?: StepName;
  agent?: string;
  agentVersion?: string;
  promptVersion?: string;
  model?: string;
  effort?: string;
  maxTokens?: number;
  timeoutMs?: number;
  limits?: RunLimits;
  revision?: number;
  tokens?: TokenUsage;
  costUsd?: number;
  latencyMs: number;
  retries?: number;
  stopReason?: string;
  outcome: SpanOutcome;
  status?: RunStatus;
  tool?: string;
  toolNameHash?: string;
  resultChars?: number;
  errorCode?: string;
  errors?: string[];
  /** AOPS-ROUTE-006: `direct` or `gateway`; on the gateway route also its host and provider slug (never a key). */
  route?: "direct" | "gateway";
  gatewayHost?: string;
  gatewayProvider?: string;
}

/** Fields a caller may set when a span starts or ends. */
export type SpanFields = Partial<Omit<Span, "spanId" | "runId" | "kind" | "startedAt" | "latencyMs" | "parentId">>;

/* ------------------------------------------------------------------------------------------- masking */

const PATH_SEGMENT = /(\.[A-Za-z_][A-Za-z0-9_]{0,63}|\[\d+\]|\[\?\])/g;
const PATH = /^(\(root\)|[A-Za-z_][A-Za-z0-9_]{0,63}|\[\d+\]|\[\?\])(\.[A-Za-z_][A-Za-z0-9_]{0,63}|\[\d+\]|\[\?\])*$/;
/** Record maps in the contracts: their keys come from data (status names) or input (gate names). */
const RECORD_MAPS = new Set(["by_status", "gates"]);
/** Every rule text `formatContractIssues` can produce (contracts.ts); anything else is masked. */
const RULES = [
  /^is required$/,
  /^expected [a-z]+, received [a-z]+$/,
  /^must equal "[A-Za-z0-9._-]{1,40}"$/,
  /^must be one of ("[A-Za-z0-9 _./-]{1,40}"(, )?){1,20}$/,
  /^does not match the required pattern$/,
  /^is not a valid [a-z_]{1,20}$/,
  /^must contain at (least|most) \d+ item\(s\)$/,
  /^must be (at least|at most|greater than|less than) -?\d+(\.\d+)?$/,
  /^must be a finite number$/,
  /^must be at most \d+ characters$/,
  /^is invalid$/,
  /^unknown contract id$/,
  // Added by the orchestrator: a hand-off from another run.
  /^does not match the run$/,
];

function splitPath(p: string): string[] {
  const first = p.match(/^(\(root\)|[A-Za-z_][A-Za-z0-9_]{0,63}|\[\d+\]|\[\?\])/)![0];
  return [first, ...(p.slice(first.length).match(PATH_SEGMENT) ?? [])];
}

function joinPath(segments: string[]): string {
  if (segments.length === 0) return "(root)";
  const [head, ...rest] = segments;
  return (head.startsWith(".") ? head.slice(1) : head) + rest.join("");
}

/**
 * Validator errors (`validateContract`) made safe for a trace (AOPS-OBS-002):
 * - a key inside a record map (`by_status`, `gates`) is always shown as `[?]`, whatever it looks like;
 * - unexpected property names are never shown: they are counted at their parent path;
 * - a line that does not match the validator's own grammar is replaced, so free text cannot slip through.
 */
export function maskContractErrors(errors: readonly string[]): string[] {
  const out: string[] = [];
  const unexpected = new Map<string, number>();
  for (const line of errors) {
    if (/^\(\d+ more errors\)$/.test(line)) {
      out.push(line);
      continue;
    }
    const at = line.indexOf(": ");
    const p = at < 0 ? "" : line.slice(0, at);
    const rule = at < 0 ? "" : line.slice(at + 2);
    if (!PATH.test(p)) {
      out.push("(masked): (masked)");
      continue;
    }
    const segments = splitPath(p);
    // The segment right after a record map is a key taken from data: always masked, even if it looks like a name.
    const masked = segments.map((s, i) => (i > 0 && RECORD_MAPS.has(segments[i - 1].replace(/^\./, "")) ? "[?]" : s));
    if (rule === "unexpected property") {
      const parent = masked[0] === "(root)" ? "(root)" : joinPath(masked.slice(0, -1));
      unexpected.set(parent, (unexpected.get(parent) ?? 0) + 1);
      continue;
    }
    out.push(`${joinPath(masked)}: ${RULES.some((r) => r.test(rule)) ? rule : "(masked)"}`);
  }
  for (const [parent, n] of unexpected) out.push(`${parent}: ${n} unexpected ${n === 1 ? "property" : "properties"}`);
  return [...new Set(out)];
}

/* ------------------------------------------------------------------------------------------- allow-list */

const RUN_ID = /^run_[0-9a-z]{8,32}$/;
const SPAN_ID = /^[0-9a-f]{16}$/;
const AGENT = /^AGENT-[A-Z][A-Z-]{0,40}$/;
const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const PROMPT_VERSION = /^[a-z0-9][a-z0-9._-]{0,31}$/;
const MODEL = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const CODE = /^[a-z][a-z0-9_]{0,39}$/;
const HASH = /^[0-9a-f]{12,64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const STOP_REASONS = ["end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal", "model_context_window_exceeded"];
const KINDS: readonly SpanKind[] = ["run", "step", "llm_call", "tool_call"];
const OUTCOMES: readonly SpanOutcome[] = ["ok", "retry", "error", "tool_denied", "budget", "cancelled"];
const STATUSES: readonly RunStatus[] = ["running", "succeeded", "unverified", "failed", "cancelled"];

const count = (v: unknown): number | undefined => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : undefined);
const amount = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
const match = (v: unknown, re: RegExp): string | undefined => (typeof v === "string" && re.test(v) ? v : undefined);
const member = <T extends string>(v: unknown, options: readonly T[]): T | undefined =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : undefined;

/**
 * The record written for a span: every field re-checked against its allowed shape; anything else is dropped
 * (AOPS-OBS-002). Returns `null` if the span's identity fields are malformed.
 */
/** Shapes of the route fields (AOPS-ROUTE-006): a DNS host name and a `@provider` slug. */
const GATEWAY_HOST = /^[a-z0-9]([a-z0-9-]{0,62}\.)+[a-z0-9-]{1,63}$/;
const GATEWAY_PROVIDER = /^@[a-z0-9][a-z0-9-]{0,62}$/;

export function toTraceRecord(span: Span): Record<string, unknown> | null {
  const runId = match(span.runId, RUN_ID);
  const spanId = match(span.spanId, SPAN_ID);
  const kind = member(span.kind, KINDS);
  const outcome = member(span.outcome, OUTCOMES);
  if (!runId || !spanId || !kind || !outcome) return null;
  const tokens =
    span.tokens && count(span.tokens.input) !== undefined && count(span.tokens.output) !== undefined
      ? {
          input: span.tokens.input,
          output: span.tokens.output,
          cacheRead: count(span.tokens.cacheRead) ?? 0,
          cacheWrite: count(span.tokens.cacheWrite) ?? 0,
        }
      : undefined;
  const limits =
    span.limits && count(span.limits.maxTokens) !== undefined && amount(span.limits.maxCostUsd) !== undefined && count(span.limits.maxSeconds) !== undefined
      ? { maxTokens: span.limits.maxTokens, maxCostUsd: span.limits.maxCostUsd, maxSeconds: span.limits.maxSeconds }
      : undefined;
  const record: Record<string, unknown> = {
    spanId,
    parentId: match(span.parentId, SPAN_ID),
    runId,
    kind,
    startedAt: match(span.startedAt, ISO),
    step: member(span.step, STEP_NAMES),
    agent: match(span.agent, AGENT),
    agentVersion: match(span.agentVersion, VERSION),
    promptVersion: match(span.promptVersion, PROMPT_VERSION),
    model: match(span.model, MODEL),
    effort: member(span.effort, EFFORTS),
    maxTokens: count(span.maxTokens),
    timeoutMs: count(span.timeoutMs),
    limits,
    revision: count(span.revision),
    tokens,
    costUsd: amount(span.costUsd),
    latencyMs: amount(span.latencyMs) ?? 0,
    retries: count(span.retries),
    stopReason: member(span.stopReason, STOP_REASONS),
    outcome,
    status: member(span.status, STATUSES),
    tool: member(span.tool, [...TOOL_NAMES, "unknown"]),
    toolNameHash: match(span.toolNameHash, HASH),
    resultChars: count(span.resultChars),
    errorCode: match(span.errorCode, CODE),
    route: member(span.route, ["direct", "gateway"] as const),
    gatewayHost: match(span.gatewayHost, GATEWAY_HOST),
    gatewayProvider: match(span.gatewayProvider, GATEWAY_PROVIDER),
    errors: Array.isArray(span.errors) && span.errors.length ? maskContractErrors(span.errors.filter((e) => typeof e === "string")) : undefined,
  };
  for (const key of Object.keys(record)) if (record[key] === undefined) delete record[key];
  return record;
}

/** A short, non-reversible label for a value that must not be written (e.g. a tool name the model invented). */
export function hashLabel(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

/* ------------------------------------------------------------------------------------------- tracer */

export interface SpanSink {
  write(record: Record<string, unknown>): void;
}

/** Appends each span as one line to `<tracesDir>/<run_id>.jsonl`. */
export function fileSink(tracesDir: string, runId: string, warn: (line: string) => void = console.warn): SpanSink {
  let failed = false;
  const file = path.join(tracesDir, `${runId}.jsonl`);
  return {
    write(record) {
      try {
        fs.mkdirSync(tracesDir, { recursive: true });
        fs.appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
      } catch {
        // Tracing must not fail the run; report once, with the run ID only (AOPS-OBS-002).
        if (!failed) warn(`[ai] ${runId} trace_write_failed`);
        failed = true;
      }
    },
  };
}

export interface OpenSpan {
  readonly spanId: string;
  readonly runId: string;
  /** Adds fields before the span ends (e.g. tokens once the response arrives). */
  set(fields: SpanFields): void;
  /** Ends the span once; later calls are ignored. Returns what was written (or `null`). */
  end(fields: SpanFields & { outcome: SpanOutcome }): Record<string, unknown> | null;
  readonly ended: boolean;
}

export interface TracerOptions {
  readonly runId: string;
  readonly sink: SpanSink;
  /** Monotonic milliseconds for latency. Default: `performance.now`. */
  readonly now?: () => number;
  /** Wall clock for `startedAt`. Default: `Date.now`. */
  readonly clock?: () => number;
}

export class Tracer {
  readonly runId: string;
  private readonly sink: SpanSink;
  private readonly now: () => number;
  private readonly clock: () => number;

  constructor(options: TracerOptions) {
    this.runId = options.runId;
    this.sink = options.sink;
    this.now = options.now ?? (() => performance.now());
    this.clock = options.clock ?? Date.now;
  }

  start(kind: SpanKind, fields: SpanFields = {}, parent?: OpenSpan): OpenSpan {
    const spanId = crypto.randomBytes(8).toString("hex");
    const t0 = this.now();
    const startedAt = new Date(this.clock()).toISOString();
    let current: SpanFields = { ...fields };
    let ended = false;
    const self: OpenSpan = {
      spanId,
      runId: this.runId,
      set: (more) => {
        current = { ...current, ...more };
      },
      end: (last) => {
        if (ended) return null;
        ended = true;
        const span: Span = {
          ...current,
          ...last,
          spanId,
          parentId: parent?.spanId,
          runId: this.runId,
          kind,
          startedAt,
          latencyMs: Math.max(0, Math.round(this.now() - t0)),
        };
        const record = toTraceRecord(span);
        try {
          if (record) this.sink.write(record);
        } catch {
          // A sink that throws (a caller's own) never fails the run; `fileSink` reports its own failures.
        }
        return record;
      },
      get ended() {
        return ended;
      },
    };
    return self;
  }
}
