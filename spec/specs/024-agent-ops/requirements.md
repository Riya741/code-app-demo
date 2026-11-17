# Requirements — Agent Orchestration and Operations

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| 024-agent-ops | AOPS | 📝 Planned (CR-20261117-1) | II, III, V, VIII, X, XII |

## Introduction
How the brief pipeline runs: a deterministic orchestrator ([ADR-0008](../../adr/0008-orchestration-pattern.md)) that
validates every hand-off, survives provider failures, stays within budgets, can be resumed after a crash or cancelled,
and leaves a trace of every step (Article XII.7). Each failure row here has a fault-injection test.

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### AOPS-R1 — Orchestration
**User story:** As the developer, I want the pipeline's steps fixed in code, so that every run is predictable, testable and observable.

#### AOPS-ORCH-001: Fixed step sequence
- **Status:** 📝 Planned
- **Criterion:** THE orchestrator SHALL run the steps retrieve → analyse → write → critique → guard as an explicit state machine, with the critique → write loop as the only branch.

#### AOPS-ORCH-002: Every hand-off is validated
- **Status:** 📝 Planned
- **Criterion:** WHEN a step produces output THE orchestrator SHALL validate it against the step's output contract before passing it on, and SHALL never pass on or silently repair an invalid hand-off (Article XII.2).

#### AOPS-ORCH-003: Step settings come from agent specs
- **Status:** 📝 Planned
- **Criterion:** THE model, effort, max tokens and timeout of each LLM step SHALL be configuration values whose defaults are those in the step's agent spec, and every trace SHALL record the values used.

#### AOPS-ORCH-004: Only listed tools
- **Status:** 📝 Planned
- **Criterion:** IF an agent requests a tool that its agent spec does not list THEN THE orchestrator SHALL refuse the call, record a `tool_denied` span and fail the step (Article XII.1).

#### AOPS-ORCH-005: Read-only tools
- **Status:** 📝 Planned
- **Criterion:** THE tools available to runtime agents SHALL be read-only functions in `server/ai/tools.ts` with strict input schemas and capped result sizes.

### AOPS-R2 — Failure handling
**User story:** As a CSS, I want a provider hiccup to cost a few seconds, not my draft, so that the feature is dependable.

#### AOPS-FAIL-001: Retry transient errors and timeouts
- **Status:** 📝 Planned
- **Criterion:** IF a model call fails with 429, 529, 5xx, a network error or the step timeout THEN THE orchestrator SHALL retry with exponential backoff and full jitter, honouring `retry-after`, up to 3 attempts per call, and SHALL record each retry in the trace.

#### AOPS-FAIL-002: One repair retry for invalid output
- **Status:** 📝 Planned
- **Criterion:** IF a step's output fails its contract THEN THE orchestrator SHALL retry the step once with the validator's error message, and IF it fails again THEN THE step SHALL fail.

#### AOPS-FAIL-003: Bounded critic loop
- **Status:** 📝 Planned
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
- **Status:** 📝 Planned
- **Criterion:** IF `AI_ENABLED` is not `true` or no API credentials are configured THEN THE server SHALL NOT create the model client, `/api/ai/status` SHALL report `enabled: false`, and every other API SHALL behave unchanged (Article XII.8).

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
- **Status:** 📝 Planned
- **Criterion:** EVERY run, step, model call and tool call SHALL emit a trace span with run_id, parent span, step, agent spec ID and version, prompt version, model, effort, input/output/cache tokens, cost, latency, retries, stop_reason and outcome, written as JSONL under `../data/ai-runs/traces/`.

#### AOPS-OBS-002: No free text in traces or logs
- **Status:** 📝 Planned
- **Criterion:** Traces and logs SHALL NOT contain workbook free text, prompts or model output; they reference the checkpoint by run ID instead (ai-data-policy §6).

#### AOPS-OBS-003: Metrics
- **Status:** 📝 Planned
- **Criterion:** `npm run ai:metrics` SHALL aggregate traces into runs, success %, unverified %, critic first-pass rate, p50/p95 latency per step, cost per brief, cache-hit ratio, retries and breaker openings.

#### AOPS-OBS-004: Run Inspector
- **Status:** 📝 Planned
- **Criterion:** WHERE AI is enabled in development THE `/ai-runs` page SHALL list runs and show, for a selected run, the step timeline, each step's redacted inputs and outputs, tokens, cost, critic issues and retries, with *Resume* and *Re-run* actions.

#### AOPS-OBS-005: Run ID in user messages
- **Status:** 📝 Planned
- **Criterion:** EVERY AI error shown to a user SHALL include the first 6 characters of the run ID.

#### AOPS-OBS-006: Runbook
- **Status:** 📝 Planned
- **Criterion:** THE project SHALL keep `docs/ai-runbook.md` describing each run status, breaker state and cost alert, and what to do about it.

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

## Out of scope
- Distributed execution, queues or multiple server processes (single local user, ADR-0002).
- Exporting traces to an external observability backend (possible later through OpenTelemetry).

## Open questions
- Whether the Run Inspector should also ship in `npm run preview` builds (today: development only).

## Scenarios
- 30% injected 429s → runs succeed with ~1.4 retries each; traces show each retry and its delay.
- Dev server killed during "Writing" → restart → *Resume* in the Run Inspector → the run continues from the Analyst's checkpoint.
- Two quick clicks → one run.
- Five failures in a minute → button disabled with the unavailable tooltip → after two minutes a probe succeeds → button back.
