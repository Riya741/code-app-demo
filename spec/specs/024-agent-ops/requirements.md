# Requirements — Agent Orchestration and Operations

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| 024-agent-ops | AOPS | 📝 Planned (CR-20261117-1; model route CR-20261123-1) | II, III, V, VIII, X, XII |

## Introduction
How the brief pipeline runs: a deterministic orchestrator ([ADR-0008](../../adr/0008-orchestration-pattern.md)) that
validates every hand-off, survives provider failures, stays within budgets, can be resumed after a crash or cancelled,
and leaves a trace of every step (Article XII.7). Each failure row here has a fault-injection test.
CR-20261121-1 removes the Critic and its revision loop: the steps are retrieve → analyse → write → guard, and only
analyse and write call a model (AOPS-ORCH-006).
CR-20261123-1 adds an optional, off-by-default **gateway route** (AOPS-R7): the same model, reached through an AI
gateway instead of the Anthropic API directly, used only for the few live runs the owner opts into
([ADR-0009](../../adr/0009-ai-gateway-route.md)).

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### AOPS-R1 — Orchestration
**User story:** As the developer, I want the pipeline's steps fixed in code, so that every run is predictable, testable and observable.

#### AOPS-ORCH-001: Fixed step sequence
- **Status:** Deprecated — retired by CR-20261121-1: the Critic and its loop are removed; replaced by AOPS-ORCH-006
- **Source:** `server/ai/orchestrator.ts` (`runBrief`, `nextStep`)
- **Criterion:** THE orchestrator SHALL run the steps retrieve → analyse → write → critique → guard as an explicit state machine, with the critique → write loop as the only branch.

#### AOPS-ORCH-002: Every hand-off is validated
- **Status:** ✅ Implemented
- **Source:** `server/ai/orchestrator.ts`, `server/ai/contracts.ts` (`validateContract`)
- **Criterion:** WHEN a step produces output THE orchestrator SHALL validate it against the step's output contract before passing it on, and SHALL never pass on or silently repair an invalid hand-off (Article XII.2).

#### AOPS-ORCH-003: Step settings come from agent specs
- **Status:** ✅ Implemented
- **Source:** `server/ai/config.ts` (`STEP_AGENTS`, `loadAiConfig`), `server/ai/orchestrator.ts` (`callModel`), `server/ai/trace.ts`
- **Criterion:** THE model, effort, max tokens and timeout of each LLM step SHALL be configuration values whose defaults are those in the step's agent spec, and every trace SHALL record the values used.

#### AOPS-ORCH-004: Only listed tools
- **Status:** ✅ Implemented
- **Source:** `server/ai/tools.ts` (`callTool`), `server/ai/orchestrator.ts` (`ctx.tools.call`)
- **Criterion:** IF an agent requests a tool that its agent spec does not list THEN THE orchestrator SHALL refuse the call, record a `tool_denied` span and fail the step (Article XII.1).

#### AOPS-ORCH-005: Read-only tools
- **Status:** ✅ Implemented
- **Source:** `server/ai/tools.ts`, `server/workbook.ts` (read queries)
- **Criterion:** THE tools available to runtime agents SHALL be read-only functions in `server/ai/tools.ts` with strict input schemas and capped result sizes.

#### AOPS-ORCH-006: Straight step sequence
- **Status:** ✅ Implemented
- **Source:** `server/ai/orchestrator.ts` (`runBrief`, `nextStep`), `server/ai/config.ts` (`STEP_NAMES`, `STEP_AGENTS`)
- **Criterion:** THE orchestrator SHALL run the steps retrieve → analyse → write → guard as an explicit state machine with no branch; only analyse (AGENT-ANALYST) and write (AGENT-WRITER) SHALL call a model, and retrieve and guard SHALL be deterministic code.

### AOPS-R2 — Failure handling
**User story:** As a CSS, I want a provider hiccup to cost a few seconds, not my draft, so that the feature is dependable.

#### AOPS-FAIL-001: Retry transient errors and timeouts
- **Status:** 📝 Planned
- **Criterion:** IF a model call fails with 429, 529, 5xx, a network error or the step timeout THEN THE orchestrator SHALL retry with exponential backoff and full jitter, honouring `retry-after`, up to 3 attempts per call, and SHALL record each retry in the trace.

#### AOPS-FAIL-002: One repair retry for invalid output
- **Status:** 📝 Planned
- **Criterion:** IF a step's output fails its contract THEN THE orchestrator SHALL retry the step once with the validator's error message, and IF it fails again THEN THE step SHALL fail.

#### AOPS-FAIL-003: Bounded critic loop
- **Status:** Deprecated — retired by CR-20261121-1: no Critic, so no revision loop; an unverified run now comes from the Guard's checks (AOPS-FAIL-008)
- **Criterion:** IF the critic rejects a draft THEN THE orchestrator SHALL send the issues back to the writer at most twice; IF the third draft is still rejected THEN THE orchestrator SHALL return it with status `unverified` and the critic's issues.

#### AOPS-FAIL-004: Refusals
- **Status:** 📝 Planned
- **Criterion:** IF a model call ends with `stop_reason = refusal` THEN THE orchestrator SHALL retry once on the configured fallback model, and IF that also refuses THEN fail the run with the reason "The model declined this request".

#### AOPS-FAIL-005: Truncated output
- **Status:** 📝 Planned
- **Criterion:** IF a model call ends with `stop_reason = max_tokens` THEN THE orchestrator SHALL NOT parse the partial output and SHALL retry once with double the token limit, within the run budget.

#### AOPS-FAIL-006: Circuit breaker
- **Status:** 📝 Planned
- **Criterion:** WHEN 5 model calls fail within 60 seconds THE breaker SHALL open for 120 seconds, during which new runs are refused with 503 and `/api/ai/status` reports `breaker_open`; after the cool-down one probe run SHALL decide whether it closes.

#### AOPS-FAIL-007: Degrade gracefully
- **Status:** ⚠️ Partial — no client is created and status reports `enabled: false` (`aiStatus`); the `/api/ai/status` route and a meaningful "other APIs unchanged" test come with AIB-T05
- **Source:** `server/ai/config.ts`, `server/ai/client.ts` (`createModelClient`, `aiStatus`)
- **Criterion:** IF `AI_ENABLED` is not `true`, or in live mode no API credentials are configured, THEN THE server SHALL NOT create the model client, `/api/ai/status` SHALL report `enabled: false`, and every other API SHALL behave unchanged (Article XII.8). Replay mode (`AI_MODEL_MODE=replay`, recorded responses, no key) is allowed only when `NODE_ENV` is `development` or `test`.
- **Note:** wording clarified 2026-11-20 by the AOPS-T01 review: replay mode needs no key, so "no credentials" applies to live mode; replay is barred in production like `AI_FAULTS`.
- **Note:** 2026-11-23, CR-20261123-1: "API credentials" means the key of the selected model route: `ANTHROPIC_API_KEY` on the direct route, `PORTKEY_API_KEY` on the gateway route (AOPS-ROUTE-004). Criterion text unchanged.

#### AOPS-FAIL-008: Unverified when the Guard's checks fail
- **Status:** ✅ Implemented
- **Source:** `server/ai/orchestrator.ts` (`runBrief`)
- **Criterion:** WHEN the guard step returns a draft with status `unverified` (failed citation checks, AIB-CITE-003) THE orchestrator SHALL end the run with status `unverified`, keeping the draft and its issues; WHEN it returns `verified` THE run SHALL end `succeeded`.

### AOPS-R3 — Budgets
**User story:** As the owner, I want every run bounded, so that one bad run cannot burn time or money.

#### AOPS-BUDG-001: Per-run limits
- **Status:** 📝 Planned
- **Criterion:** THE orchestrator SHALL stop a run that exceeds its token, cost or wall-clock limit (defaults 60 000 tokens, $0.50, 60 seconds), returning the last verified draft if one exists, else failing with the reason "Budget exceeded".

#### AOPS-BUDG-002: Configurable limits
- **Status:** 📝 Planned
- **Criterion:** THE limits SHALL be set by `AI_RUN_MAX_TOKENS`, `AI_RUN_MAX_COST_USD` and `AI_RUN_MAX_SECONDS`, and every trace SHALL record the limits in force.

### AOPS-R4 — Recovery
**User story:** As a CSS, I want a restart or a double click not to waste work or create duplicates.

#### AOPS-REC-001: Checkpoint and resume
- **Status:** 📝 Planned
- **Criterion:** THE orchestrator SHALL write a checkpoint after each completed step to `../data/ai-runs/<run_id>.json`, and WHEN `POST /api/ai/runs/:id/resume` is called THE run SHALL continue from the last completed step.

#### AOPS-REC-002: Cancel
- **Status:** 📝 Planned
- **Criterion:** WHEN a run is cancelled THE orchestrator SHALL abort in-flight calls, mark the run `cancelled` and start no further steps.

#### AOPS-REC-003: Idempotent start
- **Status:** 📝 Planned
- **Criterion:** IF a run for the same customer and the same data hash is already in progress WHEN a new run is requested THEN THE server SHALL return the existing run ID instead of starting another.

#### AOPS-REC-004: Expired artefacts removed
- **Status:** 📝 Planned
- **Criterion:** WHEN the server starts THE system SHALL delete checkpoints and traces older than the retention periods in the AI data policy.

### AOPS-R5 — Observability
**User story:** As the developer, I want to see what every run did, step by step, so that I can explain and fix it.

#### AOPS-OBS-001: Trace spans
- **Status:** Deprecated — retired by CR-20261121-1: code steps no longer have agent specs; replaced by AOPS-OBS-007
- **Source:** `server/ai/trace.ts` (`Tracer`, `fileSink`, `costUsd`), `server/ai/orchestrator.ts`
- **Criterion:** EVERY run, step, model call and tool call SHALL emit a trace span with run_id, parent span, step, agent spec ID and version, prompt version, model, effort, input/output/cache tokens, cost, latency, retries, stop_reason and outcome, written as JSONL under `../data/ai-runs/traces/`.

#### AOPS-OBS-002: No free text in traces or logs
- **Status:** ✅ Implemented
- **Source:** `server/ai/trace.ts` (`toTraceRecord`, `maskContractErrors`), `server/ai/client.ts` (SDK `logLevel: "off"`)
- **Criterion:** Traces and logs SHALL NOT contain workbook free text, prompts or model output; they reference the checkpoint by run ID instead (ai-data-policy §6).

#### AOPS-OBS-003: Metrics
- **Status:** Deprecated — retired by CR-20261121-1: no Critic, so no critic first-pass rate; replaced by AOPS-OBS-008
- **Criterion:** `npm run ai:metrics` SHALL aggregate traces into runs, success %, unverified %, critic first-pass rate, p50/p95 latency per step, cost per brief, cache-hit ratio, retries and breaker openings.

#### AOPS-OBS-004: Run Inspector
- **Status:** Deprecated — retired by CR-20261121-1: no Critic issues; replaced by AOPS-OBS-009
- **Criterion:** WHERE AI is enabled in development THE `/ai-runs` page SHALL list runs and show, for a selected run, the step timeline, each step's redacted inputs and outputs, tokens, cost, critic issues and retries, with *Resume* and *Re-run* actions.

#### AOPS-OBS-005: Run ID in user messages
- **Status:** 📝 Planned
- **Criterion:** EVERY AI error shown to a user SHALL include the first 6 characters of the run ID.

#### AOPS-OBS-006: Runbook
- **Status:** 📝 Planned
- **Criterion:** THE project SHALL keep `docs/ai-runbook.md` describing each run status, breaker state and cost alert, and what to do about it.

#### AOPS-OBS-007: Trace spans (agent IDs on model steps only)
- **Status:** ✅ Implemented
- **Source:** `server/ai/trace.ts` (`Tracer`, `fileSink`, `costUsd`), `server/ai/orchestrator.ts`, `server/ai/config.ts` (`STEP_AGENTS`)
- **Criterion:** EVERY run, step, model call and tool call SHALL emit a trace span with run_id, parent span, step, prompt version, model, effort, input/output/cache tokens, cost, latency, retries, stop_reason and outcome, written as JSONL under `../data/ai-runs/traces/`; spans of the analyse and write steps SHALL also carry the agent spec ID and version, and the run span and the spans of code steps SHALL carry none.

#### AOPS-OBS-008: Metrics
- **Status:** 📝 Planned
- **Criterion:** `npm run ai:metrics` SHALL aggregate traces into runs, success %, unverified %, p50/p95 latency per step, cost per brief, cache-hit ratio, retries and breaker openings.

#### AOPS-OBS-009: Run Inspector
- **Status:** 📝 Planned
- **Criterion:** WHERE AI is enabled in development THE `/ai-runs` page SHALL list runs and show, for a selected run, the step timeline, each step's redacted inputs and outputs, tokens, cost, verification issues and retries, with *Resume* and *Re-run* actions.

### AOPS-R6 — Proving resilience
**User story:** As the assessor, I want failure handling proven by injected faults, not just described.

#### AOPS-TEST-001: Fault injection
- **Status:** 📝 Planned
- **Criterion:** WHERE `AI_FAULTS` is set (e.g. `429:0.3,timeout:0.1,badjson:0.1`) THE resilience layer SHALL inject those faults at those rates, and SHALL ignore the setting unless `NODE_ENV` is `development` or `test`.

#### AOPS-TEST-002: One test per failure row
- **Status:** 📝 Planned
- **Criterion:** EVERY AOPS-FAIL, AOPS-BUDG and AOPS-REC criterion SHALL have a test that injects its fault and checks the response, using a replayed model.

#### AOPS-TEST-003: Chaos run report
- **Status:** 📝 Planned
- **Criterion:** THE project SHALL keep a chaos-run report of 20 briefs with faults on, showing success rate, retries per run and added latency.

### AOPS-R7 — Model route (gateway mode, CR-20261123-1)
**User story:** As the owner, who has no personal Anthropic API key but an AI gateway key from my employer, I want
the pipeline to reach the same model through that gateway when I explicitly turn it on, so that I can run the few
live checks I need without the gateway becoming the normal path.

#### AOPS-ROUTE-001: Direct route by default
- **Status:** ✅ Implemented
- **Source:** `server/ai/config.ts`
- **Criterion:** THE server SHALL call the model at `https://api.anthropic.com` (the direct route) unless `AI_GATEWAY` is exactly `portkey`; WHEN `AI_GATEWAY` is unset, blank or `none` THE direct route SHALL be used, and IF it has any other value THEN `loadAiConfig` SHALL return an error naming the variable and the rule, and AI SHALL stay disabled.

#### AOPS-ROUTE-002: Gateway settings validated
- **Status:** ✅ Implemented
- **Source:** `server/ai/config.ts` (`parseGateway`)
- **Criterion:** WHERE `AI_GATEWAY=portkey` THE config SHALL require `AI_GATEWAY_URL`, an `https` URL with no user info, query or fragment, a path that does not end in `/v1`, and a host that is not `anthropic.com` or one of its subdomains, and `AI_GATEWAY_MODEL_PREFIX` matching `^@[a-z0-9][a-z0-9-]{0,62}/([a-z0-9-]{1,32}\.){0,4}$`; IF either is missing or invalid THEN `loadAiConfig` SHALL return an error naming the variable and the rule, never the value, and AI SHALL stay disabled; on the direct route these variables SHALL NOT be read.

#### AOPS-ROUTE-003: Same model through the gateway
- **Status:** ✅ Implemented
- **Source:** `server/ai/client.ts` (`GatewayModelClient`)
- **Criterion:** WHILE the gateway route is selected THE client SHALL send every model call with the model `AI_GATEWAY_MODEL_PREFIX` followed by the step's configured model ID, while the config, budgets, cost and traces keep the plain model ID from the agent spec or `AI_MODEL_<AGENT>`; IF a response's `model` does not end with the plain model ID THEN THE call SHALL fail as a model error and its content SHALL NOT be used.

#### AOPS-ROUTE-004: Credentials of the selected route
- **Status:** ✅ Implemented
- **Source:** `server/ai/config.ts`, `server/ai/client.ts`
- **Criterion:** THE gateway key SHALL be read only from the environment variable `PORTKEY_API_KEY` and the direct key only from `ANTHROPIC_API_KEY`; `hasCredentials` SHALL reflect only the selected route's key, and WHILE the model mode is live and that key is missing, `aiStatus` SHALL report `no_credentials` and no model client SHALL be created (AOPS-FAIL-007).

#### AOPS-ROUTE-005: Each key only to its own host
- **Status:** ✅ Implemented
- **Source:** `server/ai/client.ts`
- **Criterion:** WHILE the gateway route is selected THE SDK SHALL be constructed with `baseURL` set to `AI_GATEWAY_URL`, the Portkey key only in an explicit gateway request header, and `apiKey` and `authToken` set to `null`, so that no Anthropic credential is read or sent; WHILE the direct route is selected `PORTKEY_API_KEY` SHALL NOT be read or sent; on both routes `ANTHROPIC_BASE_URL` SHALL be ignored and `maxRetries: 0`, `logLevel: "off"` and `openTelemetry: false` SHALL stay set.
- **Note:** 2026-11-23, AOPS-T12 build: the SDK falls back to its default credential chain (Anthropic profiles on disk) when `apiKey` and `authToken` are both `null`, which would break this criterion. The gateway route therefore passes the Portkey key as the SDK's one explicit credential, `authToken`, sent as `Authorization: Bearer` to the gateway host only (the header the gateway's own OpenAI-style example uses); `apiKey` stays `null`. Intent unchanged: no Anthropic credential is read or sent.

#### AOPS-ROUTE-006: Route recorded in the trace
- **Status:** ✅ Implemented
- **Source:** `server/ai/orchestrator.ts`, `server/ai/trace.ts`
- **Criterion:** THE run span and every `llm_call` span SHALL record the route (`direct` or `gateway`) and, on the gateway route, the gateway host from `AI_GATEWAY_URL` and the provider slug from `AI_GATEWAY_MODEL_PREFIX` (e.g. `@aws-bedrock-use2`); no span, log or error SHALL contain a key or a request header value (Article XII.7, AOPS-OBS-002).

#### AOPS-ROUTE-007: Tests never call the gateway
- **Status:** ✅ Implemented
- **Source:** `tests/unit/ai-gateway.test.ts`, `tests/integration/analyst-writer.live.test.ts`
- **Criterion:** `npm test` SHALL make no call to the gateway or to the Anthropic API: tests SHALL exercise the gateway route only through an injected fake SDK, and a live check that may reach the gateway SHALL be skipped unless `AI_LIVE_CHECK=1` and the selected route's key are set, and SHALL make at most the model calls of one run.

#### AOPS-ROUTE-008: Separate opt-in for bulk runs through the gateway
- **Status:** ⚠️ Partial — `gatewayBulkRefusal` is wired into the eval harness (EVAL-T04, checked before any model call); the chaos run (AOPS-T10) is pending
- **Source:** `server/ai/config.ts`, `evals/run.ts`
- **Criterion:** WHILE the gateway route is selected THE eval harness (every command that calls a model live) and the chaos run (AOPS-TEST-003) SHALL refuse to start, before any model call, unless `AI_GATEWAY_ALLOW_BULK` is exactly `1`, and the refusal SHALL name that variable; replay runs and `npm run ai:metrics`, which make no model call, SHALL need no opt-in.

## Out of scope
- Distributed execution, queues or multiple server processes (single local user, ADR-0002).
- Exporting traces to an external observability backend (possible later through OpenTelemetry).
- A gateway's OpenAI-compatible API, other gateway products, and choosing a route per step: one route serves the whole
  server ([ADR-0009](../../adr/0009-ai-gateway-route.md)).

## Open questions
- Whether the Run Inspector should also ship in `npm run preview` builds (today: development only).
- Gateway route: how long the gateway keeps request and response bodies (it stores them; the period was not stated)
  and whether the key's gateway configuration has retries, fallbacks or a response cache (owner not sure). Settled by
  the owner on 2026-11-23: the bulk opt-in is `AI_GATEWAY_ALLOW_BULK=1`, and automatic drafts are off on the gateway
  route (AIB-GEN-022) ([CR-20261123-1](../../changes/CR-20261123-1-ai-gateway-mode.md) §6).

## Scenarios
- 30% injected 429s → runs succeed with ~1.4 retries each; traces show each retry and its delay.
- Dev server killed during "Writing" → restart → *Resume* in the Run Inspector → the run continues from the Analyst's checkpoint.
- Two quick clicks on *Regenerate with AI* → one run.
- Five failures in a minute → *Regenerate with AI* disabled with the unavailable tooltip and no automatic runs → after two minutes a probe succeeds → enabled again (AIB-GEN-012).
- Automatic run for customer A, user switches to customer B after one step → A's run is `cancelled`, no further steps start, B gets its own run if it has no summary (AIB-GEN-008, AOPS-REC-002).
- `AI_ENABLED=true`, `AI_GATEWAY` unset, only `PORTKEY_API_KEY` set → direct route, `/api/ai/status` reports `no_credentials`; the Portkey key is not read (AOPS-ROUTE-001, AOPS-ROUTE-005).
- `AI_GATEWAY=portkey` without `AI_GATEWAY_MODEL_PREFIX` → the server log says "AI_GATEWAY_MODEL_PREFIX is required when AI_GATEWAY is portkey", AI is disabled, every other API works (AOPS-ROUTE-002).
- Gateway route, `PORTKEY_API_KEY` set, `ANTHROPIC_API_KEY` also set → requests go to the gateway host with the Portkey header only and model `@aws-bedrock-use2/us.anthropic.claude-sonnet-5-5`; the trace shows `model: claude-sonnet-5-5`, `route: gateway`, the gateway host and `@aws-bedrock-use2` (AOPS-ROUTE-003, AOPS-ROUTE-006).
- Gateway route, `npm run eval:full` without `AI_GATEWAY_ALLOW_BULK=1` → refused before any model call, naming the variable (AOPS-ROUTE-008).
