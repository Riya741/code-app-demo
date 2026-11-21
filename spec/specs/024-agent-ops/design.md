# Design — Agent Orchestration and Operations

## Overview
The orchestrator is ordinary TypeScript in `server/ai/` running inside the Vite plugin process. It owns the run state
machine, budgets, checkpoints and traces; the steps are functions that take one contract and return the next. Model
calls go through one resilience layer, so retries, timeouts, fault injection and the circuit breaker are counted and
traced in one place. The orchestrator, the retriever and the guard are code steps without agent specs; only the
analyse and write steps are agents (AGENT-ANALYST, AGENT-WRITER). CR-20261121-1 removed the Critic and its revision
loop to cut tokens per run, so the state machine is a straight line (AOPS-ORCH-006).

## Components and files
| File | Role |
|---|---|
| `server/ai/client.ts` | Anthropic client factory (decision D1) behind a `ModelClient` seam (live, fake for tests, replay from AOPS-T09); created only when AI is enabled and, in live mode, a key is set. The SDK is constructed with an explicit `apiKey`, `baseURL` (`https://api.anthropic.com`), `maxRetries: 0`, `logLevel: "off"` and `openTelemetry: false`, so no environment variable can turn on SDK retries, body logging, content export or another host. Errors are classified by SDK error class only |
| `server/ai/orchestrator.ts` | State machine, budgets, checkpoints, resume, cancel, idempotency. Reads the workbook through `openReadOnlyStore`: its own `Store` instance (reloaded by mtime) behind a frozen `{ fresh, table }` view with frozen rows, never the plugin's instance, so a model never sees an in-memory change whose save failed (Article II.3). Each validated step output is cloned and deep-frozen before it is passed on or checkpointed |
| `server/ai/resilience.ts` | Retry with backoff and jitter, timeout, stop-reason handling, circuit breaker, fault injection |
| `server/ai/tools.ts` | Read-only tool functions (also used by the MCP server, 025-mcp-tooling) |
| `server/ai/trace.ts` | Spans → JSONL (`<AI_RUNS_DIR>/traces/<runId>.jsonl`), rebuilt from an allow-list of field shapes; contract error strings masked (map keys as `[?]`, unknown properties as a count); cost from `usage` and `PRICES_PER_MTOK` (Anthropic list prices per million tokens, from the platform model table cached 2026-11-03: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50; cache reads ×0.1, cache writes ×1.25; an unknown model is charged the highest price so budgets err on the safe side); retention clean-up |
| `server/ai/config.ts` | Environment parsing, never throwing and never echoing values: `AI_ENABLED` (on only when exactly `true`), `AI_MODEL_<AGENT>`, `AI_EFFORT_<AGENT>`, `AI_MAX_TOKENS_<AGENT>`, `AI_TIMEOUT_MS_<AGENT>` (`<AGENT>` = `ANALYST`, `WRITER`, `CRITIC`, as the agent specs name them; defaults from the agent specs, AOPS-ORCH-003), budgets, `AI_FAULTS` and `AI_MODEL_MODE=replay` (both only when `NODE_ENV` is `development` or `test`), `AI_RUNS_DIR` (default `../data/ai-runs`; a folder inside the project is a config error, ai-data-policy §6). Only the presence of `ANTHROPIC_API_KEY` is stored, never the key |
| `scripts/ai_metrics.ts` | `npm run ai:metrics` |
| `src/pages/AiRuns.tsx` | Run Inspector (development only) |
| `docs/ai-runbook.md` | Runbook |

## Interfaces
As built by AOPS-T01 (2026-11-20); the fields beyond the first design record every setting AOPS-ORCH-003 asks for and
keep errors as codes (AOPS-OBS-002).
```ts
interface StepContext { runId: string; customerId: number; signal: AbortSignal; budget: Budget; trace: OpenSpan;
  tools: StepTools; store: ReadOnlyStore; settings: StepSettings | null;            // null for deterministic steps
  callModel(request: Omit<ModelRequest, "model" | "max_tokens">): Promise<ModelResponse> } // model, max_tokens, effort, timeout from config
interface StepTools { definitions(): ModelToolDefinition[]; call(name: unknown, input: unknown): Promise<ToolResult> }
// a refused call records a tool_denied span and fails the step even if the step catches it (AOPS-ORCH-004)
type Step<I, O> = (input: I, ctx: StepContext) => Promise<O>;     // output validated, cloned and frozen by the orchestrator

type RunErrorCode = "steps_missing" | "workbook_unavailable" | "not_found" | "invalid_output" | "tool_denied"
  | "model_unavailable" | "model_not_allowed" | "model_error" | "step_failed";     // a step's known e.code is kept; never its message
interface RunRecord {
  runId: string; customerId: number; dataHash: string;
  status: "running" | "succeeded" | "unverified" | "failed" | "cancelled";
  completed: { step: StepName; revision: number; output: unknown }[];   // checkpoint
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number };
  startedAt: string; finishedAt?: string; error?: RunErrorCode; failedStep?: StepName;
}

interface Span { spanId: string; parentId?: string; runId: string; kind: "run" | "step" | "llm_call" | "tool_call";
  startedAt: string; step?: StepName; agent?: string; agentVersion?: string; promptVersion?: string; model?: string;
  effort?: string; maxTokens?: number; timeoutMs?: number; limits?: RunLimits; revision?: number;
  tokens?: { input: number; output: number; cacheRead: number }; costUsd?: number; latencyMs: number;
  retries?: number; stopReason?: string; outcome: "ok" | "retry" | "error" | "tool_denied" | "budget" | "cancelled";
  status?: RunStatus; tool?: string; toolNameHash?: string; resultChars?: number; errorCode?: string;
  errors?: string[] /* masked contract error strings only */ }
```

## Flows
```
start ─► retrieve ─► analyse ─► write ─► guard ─┬─ verified ───► succeeded
                                                 └─ unverified ─► unverified (citation checks failed, AOPS-FAIL-008)
any step: invalid output ─► repair retry ─► fail · transient error ─► backoff retry ×3 ─► fail
          budget exceeded ─► last verified draft or failed · cancel ─► cancelled
checkpoint written after each completed step; resume reloads RunRecord.completed and continues
```

**SDK usage notes.** Structured outputs (`output_config.format`) for LLM hand-offs, then zod again at the boundary.
Tools use strict schemas with `additionalProperties: false`; `tool_choice` stays `auto` (forced tool choice is
rejected on the current Opus and Sonnet models) and the prompt names the tool. Effort is set explicitly per step.
Check `stop_reason` before reading content. Stable system prompts and tool definitions carry `cache_control`, and
`usage.cache_read_input_tokens` is traced to confirm caching works.

## Error handling
Each AOPS-FAIL criterion is one branch in `resilience.ts` or the orchestrator, and each produces a span with its
`outcome`. User-visible messages (AIB-GEN-004, AIB-GEN-012) always carry the short run ID (AOPS-OBS-005).

**Run volume (CR-20261120-1).** Runs now also start automatically when a customer without a saved summary is
selected (AIB-GEN-021, was AIB-GEN-016 before CR-20261121-1 and AIB-GEN-007 before CR-20261120-2), and the client cancels them when the user changes
customer (AIB-GEN-008) but not when the summary dialog is closed (AIB-HUMAN-010). The pipeline is
unchanged; cancel (AOPS-REC-002), idempotent start (AOPS-REC-003), the per-run budget (AOPS-BUDG-001) and the
breaker (AOPS-FAIL-006, which also stops automatic runs, AIB-GEN-012) bound the cost. `npm run ai:metrics`
(AOPS-OBS-008) should show the share of cancelled runs; a high share is the signal to revisit the trigger.

## Testing approach
A **replay model** (`AI_MODEL_MODE=replay`) returns recorded responses from `tests/fixtures/ai/`, so all tests run
offline. Fault injection drives one test per failure criterion (AOPS-TEST-002). A chaos script runs 20 briefs live
with faults on and writes the report (AOPS-TEST-003).

## Alternatives considered
- **Agent SDK / autonomous loop:** see ADR-0008; harder to bound and to resume at a known step.
- **SDK built-in retries:** hidden from traces; disabled in favour of `resilience.ts`.
- **A queue or database for runs:** unnecessary for one local user; JSON checkpoints suffice (Article VIII.1).

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Failure behaviour specified before code, one requirement per failure. ✅ |
| II Workbook is truth | Read-only access through `Store`; checkpoints are not business data. ✅ |
| III Safe by default | No free text in traces or logs; key only in the environment. ✅ |
| IV Valid by construction | Every hand-off validated (AOPS-ORCH-002). ✅ |
| V Clear feedback | Short run ID in every AI error; progress events. ✅ |
| VI Theme & responsive | Run Inspector uses tokens; checked in both themes (G5). ✅ |
| VII Accessible | Run Inspector table and actions keyboard-operable. ✅ |
| VIII Simple & local-first | Files, no queue; AI optional. ✅ |
| IX Layered architecture | Server logic in `server/ai`; Inspector uses hooks and fetchers. ✅ |
| X Testable & traceable | Fault-injection test per failure row; traces per span. ✅ |
| XI Performance budget | Wall-clock budget per run; p50/p95 per step measured. ✅ |
| XII AI agents & data | Tool allow-list enforced, contracts validated, runs traced; agent spec IDs on model-step spans only, as code steps are not agents (AOPS-OBS-007). ✅ |

**Exceptions:** none.
