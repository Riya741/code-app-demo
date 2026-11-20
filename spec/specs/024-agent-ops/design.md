# Design — Agent Orchestration and Operations

## Overview
The orchestrator is ordinary TypeScript in `server/ai/` running inside the Vite plugin process. It owns the run state
machine, budgets, checkpoints and traces; the steps are functions that take one contract and return the next. Model
calls go through one resilience layer, so retries, timeouts, fault injection and the circuit breaker are counted and
traced in one place. The orchestrator's own agent spec is [AGENT-ORCHESTRATOR](../../agents/orchestrator.md).

## Components and files
| File | Role |
|---|---|
| `server/ai/client.ts` | Anthropic client factory (decision D1); created only when AI is enabled; SDK `maxRetries: 0` |
| `server/ai/orchestrator.ts` | State machine, budgets, checkpoints, resume, cancel, idempotency |
| `server/ai/resilience.ts` | Retry with backoff and jitter, timeout, stop-reason handling, circuit breaker, fault injection |
| `server/ai/tools.ts` | Read-only tool functions (also used by the MCP server, 025-mcp-tooling) |
| `server/ai/trace.ts` | Spans → JSONL; cost from `usage` and a price table; retention clean-up |
| `server/ai/config.ts` | Environment parsing: `AI_ENABLED`, `AI_MODEL_<STEP>`, `AI_EFFORT_<STEP>`, budgets, `AI_FAULTS`, `AI_RUNS_DIR` |
| `scripts/ai_metrics.ts` | `npm run ai:metrics` |
| `src/pages/AiRuns.tsx` | Run Inspector (development only) |
| `docs/ai-runbook.md` | Runbook |

## Interfaces
```ts
interface StepContext { runId: string; signal: AbortSignal; budget: Budget; trace: Span; tools: ToolSet }
type Step<I, O> = (input: I, ctx: StepContext) => Promise<O>;     // output validated by the orchestrator

interface RunRecord {
  runId: string; customerId: number; dataHash: string;
  status: "running" | "succeeded" | "unverified" | "failed" | "cancelled";
  completed: { step: StepName; revision: number; output: unknown }[];   // checkpoint
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number };
  startedAt: string; finishedAt?: string; error?: string;
}

interface Span { spanId: string; parentId?: string; runId: string; kind: "run" | "step" | "llm_call" | "tool_call";
  step?: StepName; agent?: string; agentVersion?: string; promptVersion?: string; model?: string; effort?: string;
  tokens?: { input: number; output: number; cacheRead: number }; costUsd?: number; latencyMs: number;
  retries?: number; stopReason?: string; outcome: "ok" | "retry" | "error" | "tool_denied" | "budget" | "cancelled" }
```

## Flows
```
start ─► retrieve ─► analyse ─► write ─► critique ─pass─► guard ─► succeeded
                                  ▲          │fail (rev < 2)
                                  └──issues──┘          fail (rev = 2) ─► guard ─► unverified
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
selected (AIB-GEN-007), and the client cancels them when the user changes customer (AIB-GEN-008). The pipeline is
unchanged; cancel (AOPS-REC-002), idempotent start (AOPS-REC-003), the per-run budget (AOPS-BUDG-001) and the
breaker (AOPS-FAIL-006, which also stops automatic runs, AIB-GEN-012) bound the cost. `npm run ai:metrics`
(AOPS-OBS-003) should show the share of cancelled runs; a high share is the signal to revisit the trigger.

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
| XII AI agents & data | Tool allow-list enforced, contracts validated, runs traced. ✅ |

**Exceptions:** none.
