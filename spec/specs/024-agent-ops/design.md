# Design — Agent Orchestration and Operations

## Overview
The orchestrator is ordinary TypeScript in `server/ai/` running inside the Vite plugin process. It owns the run state
machine, budgets, checkpoints and traces; the steps are functions that take one contract and return the next. Model
calls go through one resilience layer, so retries, timeouts, fault injection and the circuit breaker are counted and
traced in one place. The orchestrator, the retriever and the guard are code steps without agent specs; only the
analyse and write steps are agents (AGENT-ANALYST, AGENT-WRITER). CR-20261121-1 removed the Critic and its revision
loop to cut tokens per run, so the state machine is a straight line (AOPS-ORCH-006). CR-20261123-1 lets the client
reach the same model through an AI gateway, off by default (section "Model route", [ADR-0009](../../adr/0009-ai-gateway-route.md)).

## Components and files
| File | Role |
|---|---|
| `server/ai/client.ts` | Anthropic client factory (decision D1) behind a `ModelClient` seam (live, fake for tests, replay from AOPS-T09); created only when AI is enabled and, in live mode, a key is set. The SDK is constructed with an explicit `apiKey`, `baseURL` (`https://api.anthropic.com`), `maxRetries: 0`, `logLevel: "off"` and `openTelemetry: false`, so no environment variable can turn on SDK retries, body logging, content export or another host. Errors are classified by SDK error class only. Planned (AOPS-T12): on the gateway route the same SDK gets `AI_GATEWAY_URL`, the Portkey key in a gateway header, `apiKey: null` and `authToken: null`, and the model prefix is added on the wire (section "Model route") |
| `server/ai/orchestrator.ts` | State machine, budgets, checkpoints, resume, cancel, idempotency. Reads the workbook through `openReadOnlyStore`: its own `Store` instance (reloaded by mtime) behind a frozen `{ fresh, table }` view with frozen rows, never the plugin's instance, so a model never sees an in-memory change whose save failed (Article II.3). Each validated step output is cloned and deep-frozen before it is passed on or checkpointed |
| `server/ai/resilience.ts` | Retry with backoff and jitter, timeout, stop-reason handling, circuit breaker, fault injection |
| `server/ai/tools.ts` | Read-only tool functions (also used by the MCP server, 025-mcp-tooling) |
| `server/ai/trace.ts` | Spans → JSONL (`<AI_RUNS_DIR>/traces/<runId>.jsonl`), rebuilt from an allow-list of field shapes; contract error strings masked (map keys as `[?]`, unknown properties as a count); cost from `usage` and `PRICES_PER_MTOK` (Anthropic list prices per million tokens, from the platform model table cached 2026-11-03: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50; cache reads ×0.1, cache writes ×1.25; an unknown model is charged the highest price so budgets err on the safe side); retention clean-up |
| `server/ai/config.ts` | Environment parsing, never throwing and never echoing values: `AI_ENABLED` (on only when exactly `true`), `AI_MODEL_<AGENT>`, `AI_EFFORT_<AGENT>`, `AI_MAX_TOKENS_<AGENT>`, `AI_TIMEOUT_MS_<AGENT>` (`<AGENT>` = `ANALYST`, `WRITER`, `CRITIC`, as the agent specs name them; defaults from the agent specs, AOPS-ORCH-003), budgets, `AI_FAULTS` and `AI_MODEL_MODE=replay` (both only when `NODE_ENV` is `development` or `test`), `AI_RUNS_DIR` (default `../data/ai-runs`; a folder inside the project is a config error, ai-data-policy §6). Only the presence of `ANTHROPIC_API_KEY` is stored, never the key. Planned (AOPS-T12): `AI_GATEWAY`, `AI_GATEWAY_URL`, `AI_GATEWAY_MODEL_PREFIX`, `AI_GATEWAY_ALLOW_BULK`, and the presence of the selected route's key only (section "Model route") |
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
  errors?: string[] /* masked contract error strings only */
  route?: "direct" | "gateway"; gatewayHost?: string; gatewayProvider?: string } // planned, AOPS-ROUTE-006 (AOPS-T12)
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
`usage.cache_read_input_tokens` is traced to confirm caching works. The same notes hold on the gateway route: the
probe of 2026-11-23 confirmed structured output with effort, a strict tool with `pattern`, `cache_control` on the
system prompt and a tool, and `tool_choice: auto` through the gateway (ADR-0009).

## Model route (gateway mode, CR-20261123-1, planned in AOPS-T12)
The **direct route** (default) calls `https://api.anthropic.com` with `ANTHROPIC_API_KEY`, exactly as AOPS-T01 built
it. The **gateway route** reaches the same model through an AI gateway that speaks the Anthropic-native Messages API
(today the employer's Portkey gateway, which forwards to AWS Bedrock in us-east-2). It is for the owner's few live
runs only and is never the default ([ADR-0009](../../adr/0009-ai-gateway-route.md)).

| Variable | Default | Rule (errors name the variable and the rule, never the value) |
|---|---|---|
| `AI_GATEWAY` | `none` | `none` or `portkey`; blank = `none`; anything else is a config error (AOPS-ROUTE-001) |
| `AI_GATEWAY_URL` | — | Read only when `portkey`, then required: `https`, no user info, query or fragment, path not ending in `/v1` (the SDK appends `/v1/messages`, so the value is the gateway root, e.g. `https://portkeygateway.perficient.com`), host not `anthropic.com` or a subdomain (AOPS-ROUTE-002) |
| `AI_GATEWAY_MODEL_PREFIX` | — | Read only when `portkey`, then required: `^@[a-z0-9][a-z0-9-]{0,62}/([a-z0-9-]{1,32}\.){0,4}$`, e.g. `@aws-bedrock-use2/us.anthropic.`; the part before `/` is the provider slug that traces record |
| `PORTKEY_API_KEY` | — | The gateway key; only its presence is kept in the config, and only on the gateway route (AOPS-ROUTE-004) |
| `AI_GATEWAY_ALLOW_BULK` | unset | Exactly `1` lets the eval harness and the chaos run use the gateway route (AOPS-ROUTE-008); set it for one command, not in a profile |

```ts
interface AiConfig { /* … as built … */ route: "direct" | "gateway"; gateway: GatewayConfig | null;
  gatewayAllowBulk: boolean }   // hasCredentials: presence of the selected route's key only
interface GatewayConfig { kind: "portkey"; url: string; host: string; provider: string /* "@aws-bedrock-use2" */;
  modelPrefix: string }
// gateway route; the direct route is unchanged
new Sdk({ apiKey: null, authToken: null, baseURL: gateway.url, defaultHeaders: { "x-portkey-api-key": key },
  maxRetries: 0, logLevel: "off", openTelemetry: false });
/** For eval and chaos runners: null when the run may start, else a refusal naming AI_GATEWAY_ALLOW_BULK. */
function gatewayBulkRefusal(config: AiConfig): string | null;
```

- **One model ID everywhere.** `AI_MODEL_<AGENT>` and the agent-spec defaults stay plain IDs (`claude-sonnet-5-5`),
  so `MODEL_ID` validation, `PRICES_PER_MTOK`, budgets and the trace `model` are the same on both routes. Only
  `LiveModelClient.create` sends `modelPrefix + model`. It accepts a response only if its `model` ends with the plain
  ID (the gateway answers `us.anthropic.claude-sonnet-5-5`), which catches a gateway fallback to another model, and
  returns the message with `model` set to the plain ID (AOPS-ROUTE-003).
- **Keys.** `apiKey: null` and `authToken: null` stop the SDK from reading `ANTHROPIC_API_KEY` or
  `ANTHROPIC_AUTH_TOKEN` on the gateway route. The Portkey key goes in an explicit header. `x-portkey-api-key` is
  Portkey's documented header; the probe also sent `Authorization: Bearer`. AOPS-T12's live check settles the
  smallest set that works and records it here. If the SDK's own authentication check needs an auth header, mark
  `x-api-key` as omitted, or send the Portkey key as the bearer token to the gateway; never use a placeholder
  Anthropic key. On the direct route `PORTKEY_API_KEY` is never read (AOPS-ROUTE-005, SEC-SUPPLY-005).
- **Status.** `aiStatus` is unchanged in shape: `no_credentials` when the selected route's key is missing in live
  mode. The UI shows the existing "AI unavailable" texts; no new user-facing message.
- **Traces.** The run span and `llm_call` spans carry `route`, and on the gateway route `gatewayHost` and
  `gatewayProvider`, rebuilt through the trace allow-list (host `^[a-z0-9.-]{1,253}$`, provider `^@[a-z0-9-]{1,63}$`).
  Never a key, a header or the full URL (AOPS-ROUTE-006).
- **Cost.** Anthropic list prices on both routes. What the gateway operator is billed (Bedrock prices) may differ;
  budgets remain the safety limit, in the same unit.
- **Minimal use.** AI off and the direct route are the defaults. `npm test` uses fakes and replay only. A live check
  runs only with `AI_LIVE_CHECK=1` and makes the calls of one run (AOPS-ROUTE-007). Eval and chaos runs on the
  gateway route also need `AI_GATEWAY_ALLOW_BULK=1` (AOPS-ROUTE-008). On the gateway route, the eval harness sends
  single requests; Message Batches are not assumed to pass through. `npm run ai:metrics` reads traces only and makes
  no call.
- **Not covered by code.** The gateway's own retries, fallbacks and response cache must be off in the gateway
  configuration (owner, CR open question). A fallback to another model is caught by the model check. Hidden retries
  show only as latency, and a cached response would show tokens the run did not spend.

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

**Gateway route (AOPS-T12).** Unit tests use an injected fake `SdkConstructor` that records its options: gateway
options, no Anthropic key even when `ANTHROPIC_API_KEY` is set, the prefix on the wire and the plain ID in traces and
cost, and a response from another model rejected. One test constructs the real SDK class with the gateway options
(no request is sent) and checks that `apiKey` and `authToken` are `null`. The direct route is tested with an
environment object that records which names are read, to show `PORTKEY_API_KEY` is never read. Config tests cover each
rule with a value that must not appear in the error. One live check (`tests/integration/gateway.live.test.ts`) makes a
single request with a fixed prompt and no project data, only with `AI_LIVE_CHECK=1` and gateway credentials.

## Alternatives considered
- **Agent SDK / autonomous loop:** see ADR-0008; harder to bound and to resume at a known step.
- **SDK built-in retries:** hidden from traces; disabled in favour of `resilience.ts`.
- **A queue or database for runs:** unnecessary for one local user; JSON checkpoints suffice (Article VIII.1).
- **Gateway through its OpenAI-compatible API** (CR-20261123-1): a second client, a new dependency and rewritten
  steps, and the loss of structured outputs, effort and cache semantics; rejected in ADR-0009.
- **`ANTHROPIC_BASE_URL` pointed at the gateway:** the client ignores it on purpose (AOPS-T01). It would send
  `ANTHROPIC_API_KEY` to the gateway and leave no trace of the route.
- **Gateway model IDs in `AI_MODEL_<AGENT>`** (e.g. `@aws-bedrock-use2/us.anthropic.claude-sonnet-5-5`): the model-ID
  check, the price table, the agent-spec defaults and the traces would all need a second spelling of the same model.
  A prefix added on the wire keeps one ID everywhere.
- **The gateway host hard-coded:** ties the code to one employer's gateway. A validated setting whose host is traced
  is enough.

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Failure behaviour specified before code, one requirement per failure. ✅ |
| II Workbook is truth | Read-only access through `Store`; checkpoints are not business data. ✅ |
| III Safe by default | No free text in traces or logs; keys only in the environment. Gateway route (CR-20261123-1): each key goes only to its own host, the gateway URL must be `https`, and no Anthropic credential is sent to the gateway (AOPS-ROUTE-005, SEC-SUPPLY-005). ✅ |
| IV Valid by construction | Every hand-off validated (AOPS-ORCH-002). ✅ |
| V Clear feedback | Short run ID in every AI error; progress events. ✅ |
| VI Theme & responsive | Run Inspector uses tokens; checked in both themes (G5). ✅ |
| VII Accessible | Run Inspector table and actions keyboard-operable. ✅ |
| VIII Simple & local-first | Files, no queue; AI optional. The gateway route reuses the same SDK (no new dependency) and is off by default; the direct route needs no gateway. ✅ |
| IX Layered architecture | Server logic in `server/ai`; Inspector uses hooks and fetchers. ✅ |
| X Testable & traceable | Fault-injection test per failure row; traces per span. The gateway route is tested with a fake SDK, `npm test` never reaches it, and one live check proves it (AOPS-ROUTE-007). ✅ |
| XI Performance budget | Wall-clock budget per run; p50/p95 per step measured. ✅ |
| XII AI agents & data | Tool allow-list enforced, contracts validated, runs traced; agent spec IDs on model-step spans only, as code steps are not agents (AOPS-OBS-007). Gateway route (CR-20261123-1, Article XII.4 and XII.8 as worded in v1.1.2): used only when configured; the same model, allow-list and redaction (ai-data-policy §1, v1.1.0); every trace records the route, gateway host and provider (XII.7, AOPS-ROUTE-006); bulk runs need a separate opt-in (AOPS-ROUTE-008). ✅ |

**Exceptions:** none.
