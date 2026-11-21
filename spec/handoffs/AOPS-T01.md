---
contract: task-handoff.v1
task: AOPS-T01
agent: AGENT-IMPLEMENTER
covers: [AOPS-ORCH-001, AOPS-ORCH-002, AOPS-ORCH-003, AOPS-ORCH-004, AOPS-FAIL-007, AOPS-OBS-001, AOPS-OBS-002]
files_changed: [server/ai/config.ts, server/ai/client.ts, server/ai/orchestrator.ts, server/ai/trace.ts, package.json, package-lock.json, tests/unit/ai-config.test.ts, tests/unit/ai-client.test.ts, tests/unit/ai-trace.test.ts, tests/integration/orchestrator.test.ts]
tests: [tests/unit/ai-config.test.ts, tests/unit/ai-client.test.ts, tests/unit/ai-trace.test.ts, tests/integration/orchestrator.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: AOPS-T01 Config, client factory, orchestrator skeleton with deterministic steps only, traces

## What changed
Four new server modules. None of them is wired into the Vite plugin yet; the routes come with AIB-T05.

**`server/ai/config.ts`** has `loadAiConfig(env = process.env, { projectDir })`. It returns `{ ok: true, config }` or
`{ ok: false, errors }` and never throws.
- `STEP_AGENTS` copies each step's agent ID, version, env-variable suffix and "Model" defaults from the agent specs.
  The LLM steps get the ADR-0007 interim values: `claude-sonnet-5-5`, effort `medium`, `max_tokens` 8000, timeout 45 s.
- Per-step overrides: `AI_MODEL_<AGENT>`, `AI_EFFORT_<AGENT>`, `AI_MAX_TOKENS_<AGENT>` and `AI_TIMEOUT_MS_<AGENT>`,
  where `<AGENT>` is `ANALYST`, `WRITER` or `CRITIC`, as the agent specs name them.
- Also read: `AI_RUN_MAX_*` (defaults 60 000 tokens / $0.50 / 60 s), `AI_MODEL_MODE` (live or replay), and
  `AI_FAULTS` (ignored unless `NODE_ENV` is development or test).
- `AI_RUNS_DIR` defaults to `../data/ai-runs`. It must resolve outside the project folder; traces go to
  `<runsDir>/traces`.
- AI is on only when `AI_ENABLED === "true"`.
- The config records whether `ANTHROPIC_API_KEY` is set (`hasCredentials`), never the key itself.
- Each error names the variable and the rule, never the value.

**`server/ai/client.ts`** has the `ModelClient` seam: `create(Anthropic.MessageCreateParamsNonStreaming, { signal,
timeoutMs }) → Anthropic.Message`.
- `createModelClient(configResult, deps)` returns `null` and constructs nothing when any of these holds: AI is
  disabled, the config is invalid, or live mode has no key.
- Otherwise it builds the SDK client once with `maxRetries: 0`, passing the key explicitly. The client is held in an
  ES `#private` field, so the key never shows up in a log or in `JSON.stringify`.
- Replay plugs in through `deps.replay` (AOPS-T09).
- `aiStatus(configResult, breaker?)` returns `{ enabled, available, reason? }`. The reason is `disabled`,
  `no_credentials` or `breaker_open`; the breaker slot is for AOPS-T06.
- `createFakeModelClient` and `fakeMessage` are for tests.
- `classifyModelError` maps the SDK's typed errors (`RateLimitError`, `OverloadedError`, `APIConnectionTimeoutError`, …)
  to an enum. It never reads the message text.

**`server/ai/orchestrator.ts`** has `runBrief(deps, { customerId, runId?, signal? }) → RunRecord`, which never throws.
- `nextStep` is the state machine: retrieve → analyse → write → critique → guard. The only branch is critique → write,
  for at most `MAX_REVISIONS = 2` revisions.
- Each step's output goes through `validateContract`. The contract is fixed per step (`STEP_OUTPUT_CONTRACT`), and the
  output's `run_id` must match the run.
- An invalid output fails the run with `invalid_output`. The step after it is never called, and nothing is repaired.
- Steps reach a model only through `ctx.callModel`. It sets `model`, `max_tokens` and `output_config.effort` from the
  config, overriding anything the step passed, and passes the step's timeout and the run's signal.
- Steps reach tools only through `ctx.tools.call`, which wraps `callTool` with the agent's `buildToolSet`. A refused
  call ends a `tool_call` span with outcome `tool_denied` and throws `StepFailure("tool_denied")`. The step still fails
  if it catches that error and returns a valid hand-off.
- The workbook is read through `openReadOnlyStore(file)`: a separate, frozen `{ fresh, table }` view over its own
  `Store` instance, reloaded when the file's mtime changes. `save` is missing from the type and from the object. This
  covers the Article II.3 item carried over from the AOPS-T02 review.
- Hooks are left for later tasks: `onCheckpoint` after each completed step (AOPS-T05), `onProgress` (AIB-T05), a
  cancel check between steps (AOPS-T05), and `Budget` (enforced by AOPS-T06).
- The server log gets one line per run: `[ai] <run_id> <status> [<error code>] [<step>]`.

**`server/ai/trace.ts`** has `Tracer` and `fileSink`. Each span is appended as one JSON line to
`<tracesDir>/<run_id>.jsonl` when it ends.
- `toTraceRecord` rebuilds every span field by field from an allow-list of shapes: ID patterns, enums, counts and
  finite amounts. Any other field or value is dropped.
- `maskContractErrors`:
  - always masks the key after `by_status` or `gates` as `[?]`;
  - reports unexpected property names only as a count at their parent path;
  - replaces any line outside the validator's own path and rule grammar with `(masked)`.
- The price table is `PRICES_PER_MTOK`: Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50. Cache reads are
  billed at ×0.1 and cache writes at ×1.25. An unknown model is charged the highest price.
- A trace write failure never throws; it is reported once with the run ID only.

## Changes after review 1 (verdict FAIL, two majors) and the AIB-T02 review
- **Major 1, AOPS-FAIL-007 / replay** (requirement amended by the coordinator: credentials apply in live mode).
  `AI_MODEL_MODE=replay` is accepted only when `NODE_ENV` is `development` or `test`, the same gate as `AI_FAULTS`.
  Anywhere else it is a config error, so there is no client and `enabled: false`. Replay in test still needs no key.
  Live mode without a key is unchanged: no client, `enabled: false, reason: no_credentials`.
- **Major 2, AOPS-OBS-002 / SDK settings.** The SDK client is now built with `{ apiKey, baseURL:
  "https://api.anthropic.com" (DEFAULT_BASE_URL), maxRetries: 0, logLevel: "off", openTelemetry: false }`.
  - `ANTHROPIC_LOG` and `ANTHROPIC_BASE_URL` can no longer print bodies or redirect calls.
  - `openTelemetry: false` was added on the same grounds: SDK spans with
    `ANTHROPIC_OPEN_TELEMETRY_TRACES_CONTENT_MODE=content` could export prompts.
  - A test checks that the stand-in receives exactly these options, and that the real SDK settles on them under a
    hostile process environment.
- **Minor 3.** `StepTools.set` is removed; `ctx.tools.call` and `definitions()` are the only tool surface.
- **Minor 4.** Each validated output is copied (`structuredClone`), deep-frozen, then passed on and stored in
  `record.completed`. A later step's set, push or delete throws `TypeError`. The producing step changing the object it
  kept has no effect.
- **Minor 5.** Caller hooks and the log can no longer break a run:
  - `onProgress`, the log in `finish`, the sink factory and every sink write are guarded;
  - `drive()` runs inside a final try/catch, so `runBrief` never rejects and the run span always ends;
  - a sink factory that throws logs `[ai] <run_id> trace_unavailable`.
- **Minor 6.** `isInside` (now exported) treats only `..` or `..<sep>…` as outside, so a `..runs` folder inside the
  project is caught.
- **Minor 7.** `ORCHESTRATOR_AGENT` is checked against `spec/agents/orchestrator.md`.
- **Minor 8.** Sheets returned by the read-only view's `table()` are deep-frozen. A reload builds new objects, so
  freezing costs one pass per sheet per file change.
- **AIB-T02 review (step error codes).**
  - `RunErrorCode` is now the `RUN_ERROR_CODES` list and includes `not_found`.
  - When a step throws an error whose `code` is a known run error code, that code is kept: the Retriever's
    `CustomerNotFoundError` gives `not_found` and `FactSheetInvalidError` gives `invalid_output`. Anything else stays
    `step_failed`.
  - `tool_denied` is never taken from a step's error; only a refused `ctx.tools.call` sets it.
  - The error message is never read into the record, the trace or the log.
- Left for AOPS-T03, as instructed: classifying `RequestTimeoutError`.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AOPS-ORCH-001 | `tests/integration/orchestrator.test.ts`: "AOPS-ORCH-001 runs retrieve → analyse → write → critique → guard in that order, each step getting the previous hand-off"; "AOPS-ORCH-001 the critique → write loop is the only branch, and it ends after 2 revisions"; "AOPS-ORCH-001 steps read the workbook through the orchestrator's own read-only Store view, which sees saved changes only"; "AOPS-ORCH-001 a step that throws {a not-found error (code not_found), an invalid fact sheet error (code invalid_output), an error with an unknown code, an error claiming tool_denied without a refused call, a plain error} fails the run with {not_found, invalid_output, step_failed, step_failed, step_failed}, without its message" (5 tests); "AOPS-ORCH-001 runBrief never rejects and always ends the run span, even when every caller hook throws" |
| AOPS-ORCH-002 | `tests/integration/orchestrator.test.ts`: "AOPS-ORCH-002 an invalid {retrieve, analyse, write, critique, guard} hand-off fails the run and is never passed on or repaired" (5 tests); "AOPS-ORCH-002 a valid-looking hand-off from another run is rejected (run_id must match)"; "AOPS-ORCH-002 a validated hand-off cannot be changed afterwards, by a later step or by the step that produced it"; "AOPS-ORCH-002 rows read through the read-only Store view are frozen" |
| AOPS-ORCH-003 | `tests/unit/ai-config.test.ts`: "AOPS-ORCH-003 each step's agent, version and model defaults are the ones in its agent spec" (parses `spec/agents/*.md` "## Model"; also checks `ORCHESTRATOR_AGENT` against `orchestrator.md`); "… with nothing set every LLM step gets its agent-spec defaults and AI is off"; "… AI_MODEL_, AI_EFFORT_, AI_MAX_TOKENS_ and AI_TIMEOUT_MS_ per agent override only that step". `tests/integration/orchestrator.test.ts`: "AOPS-ORCH-003 LLM steps call the model with their agent-spec defaults, whatever the step asks, and the spans record them"; "… settings from the environment replace the defaults and are the values used and traced"; "… a deterministic step may not call the model". `tests/unit/ai-client.test.ts`: "AOPS-ORCH-003 the live client passes the step's timeout and the run's abort signal to the SDK call" |
| AOPS-ORCH-004 | `tests/integration/orchestrator.test.ts`: "AOPS-ORCH-004 a registered tool the Analyst's spec does not list is refused, records a tool_denied span and fails the step"; "AOPS-ORCH-004 any tool for the Writer, whose spec lists none is refused, …"; "AOPS-ORCH-004 a refused tool fails the step even if the step catches the refusal and returns a valid hand-off"; "AOPS-ORCH-004 a tool the Analyst's spec lists runs and is traced with its name and result size only" |
| AOPS-FAIL-007 | `tests/unit/ai-client.test.ts`: "AOPS-FAIL-007 with AI_ENABLED not true the model client is never created and status reports enabled: false"; "… with AI enabled but no API key …, no_credentials"; "… with an invalid AI setting …"; "… with AI enabled and a key the client is created once, SDK retries off, and the key is not exposed"; "… status reports breaker_open …"; "… replay mode in development or test needs no key and uses only the replay factory …"; "… replay mode outside development and test is a config error: no client, enabled: false". `tests/unit/ai-config.test.ts`: "AOPS-FAIL-007 AI is enabled only by AI_ENABLED=true; …"; "… an invalid AI setting is a config error naming the variable and the rule, never its value, and never throws"; "… AI_RUNS_DIR outside the project folder is accepted as given"; "… a folder whose name starts with '..' inside the project is still inside it"; "… AI_MODEL_MODE=replay is accepted only when NODE_ENV is development or test". `tests/integration/orchestrator.test.ts`: "AOPS-FAIL-007 with no model client an LLM step never reaches a model and the run fails cleanly"; "AOPS-FAIL-007 the workbook API answers as before with AI off and with a broken AI setting" |
| AOPS-OBS-001 | `tests/integration/orchestrator.test.ts`: "AOPS-OBS-001 every run, step, model call and tool call writes one JSONL span with the required fields"; "AOPS-OBS-001 a failed model call is traced with its error code and fails the step". `tests/unit/ai-trace.test.ts`: "AOPS-OBS-001 cost comes from usage and one price table, …"; "… each ended span is appended once as one JSON line to traces/<run_id>.jsonl, …"; "… a trace that cannot be written never throws …". `tests/unit/ai-client.test.ts`: "AOPS-OBS-001 model errors are classified by SDK error class …" |
| AOPS-OBS-002 | `tests/integration/orchestrator.test.ts`: "AOPS-OBS-002 workbook text, prompts, model output and hand-offs never reach the trace file or the log". A marker is planted in a workbook note, a `by_status` key, the system prompt, the model reply, every hand-off, a tool input, a made-up tool name and an unknown property. The test also asserts that the marker and the workbook customer name did reach the checkpoint content and the prompts. `tests/unit/ai-trace.test.ts`: "AOPS-OBS-002 keys of record maps (by_status, gates) are always shown as [?], …"; "… unknown property names are never shown, only counted at their parent path"; "… any line outside the validator's grammar is masked; …"; "… a span is rebuilt from allowed shapes only: …". `tests/unit/ai-client.test.ts`: "AOPS-OBS-002 the SDK client is built with logging and SDK telemetry off, the fixed API host and no retries, whatever the environment says" |

One extra test, "AOPS-TEST-001 AI_FAULTS is parsed in development and test and ignored otherwise"
(`tests/unit/ai-config.test.ts`), covers the parsing in `config.ts`. AOPS-TEST-001 is not on this task's Covers line
and stays with AOPS-T03, which does the injection itself.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 20 hand-offs, 0 error(s) (last run after writing this file; the count includes AIB-T02's hand-off, added in parallel) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (all existing react-refresh warnings in `src/components`). typecheck: **fails, but not in this task's files**. The only errors are 2 × TS2345 in `tests/integration/retriever.test.ts` (lines 251–252), AIB-T02's file, being changed in parallel. `npx tsc --noEmit -p tsconfig.node.json` (all of `server/`) exits 0, and the app config reports no error in any AOPS-T01 file. Marked `fail` until AIB-T02's file is fixed. |
| G4 | `npx vitest run tests/integration/orchestrator.test.ts tests/unit/ai-config.test.ts tests/unit/ai-client.test.ts tests/unit/ai-trace.test.ts` (**targeted run only**, as instructed; the full `npm test` is left to the orchestrator because parallel full runs time out) | after the review fixes: 4 files passed; 55 passed (55): orchestrator 29, config 9, client 10, trace 7 |

All four files run offline. The model is a fake client or a counting SDK stand-in; one test constructs the real SDK
with a dummy key and makes no request. Traces go to a temp `AI_RUNS_DIR`. Nothing was written into the repo or
`../data`; this was checked after the run.

## Open questions
- **The design's interfaces were widened** (reviewer or spec author: update the 024 `design.md` Interfaces, or ask me
  to narrow the code).
  - `Span` gained `startedAt`, `maxTokens` and `timeoutMs` (AOPS-ORCH-003 asks for every setting used), `limits`
    (AOPS-BUDG-002), `revision`, `status`, `tool`, `toolNameHash`, `resultChars`, `errorCode`, `errors` (masked) and
    `tokens.cacheWrite`.
  - `StepContext` gained `customerId`, `store` (the Retriever's input), `settings` and `callModel`.
  - `tools` is a `StepTools` object (`call`, `definitions`), not the bare `ToolSet`; the `ToolSet` is not exposed.
  - `RunRecord` gained `failedStep`, and its `error` is a code from `RUN_ERROR_CODES`, not free text. Hand-offs in
    `completed` are frozen copies.
  - Coordinator: being handled on the spec side.
- **Messages catalog (Article V):** run errors are codes. The catalog has user-facing reasons only for refusal, budget
  and the final check. `invalid_output`, `tool_denied`, `model_error`, `model_unavailable`, `model_not_allowed`,
  `workbook_unavailable`, `steps_missing`, `step_failed` and now `not_found` need a catalogued reason, or a generic one,
  before AIB-T05 shows a failed run. Coordinator: catalog gap being recorded on the spec side.
- **`ANTHROPIC_CUSTOM_HEADERS` is not closed.** SDK 1.12 always merges headers from this variable into requests, and no
  constructor option turns that off. Headers cannot redirect the host or enable logging, but they can add or override
  request headers. Closing it would mean clearing the variable before the client is built, which is a process-wide
  side effect. Left as a residual risk for the reviewer or owner to accept, or to assign to AOPS-T03.
- **AOPS-FAIL-007 is only partly done here.** `aiStatus` and `createModelClient` meet the criterion, but the
  `/api/ai/status` route belongs to AIB-T05. Today the "workbook API unchanged" test passes trivially because nothing
  is wired yet. AIB-T05 should keep that test meaningful once routes are registered.
  - An invalid config reports `reason: "disabled"`, because the 022 status shape has no `config_error`. The errors are
    meant for the server log.
- **Credentials:** only `ANTHROPIC_API_KEY` counts (ai-data-policy §1). `ANTHROPIC_AUTH_TOKEN` and SDK credential
  profiles are deliberately not used; the key is passed explicitly so the SDK never reads credential files.
- **Replay mode** (development and test only) needs no key and reports `enabled/available: true`. It has a client only
  when `deps.replay` is given, which AOPS-T09 must wire. With `NODE_ENV` unset, replay is also a config error, because
  the gate requires development or test explicitly.
- **Critic loop:** the state machine already has the 2-revision bound, and it passes the previous draft and verdict to
  the Writer, so AOPS-ORCH-001's "only branch" can be shown.
  - AOPS-FAIL-003's own test (third rejection → `unverified` with the issues) stays with AOPS-T04.
  - Run status comes from the critic's last `pass`. AOPS-T04 should also check it against the Guard's `status`.
- **Beyond the plan (confirm or remove):**
  - `AI_RUNS_DIR` inside the project folder is a config error, so checkpoints with workbook text can never land where
    git sees them.
  - `AI_FAULTS` kinds are fixed as `429, 529, 500, timeout, network, badjson, refusal, max_tokens`, with the
    `NODE_ENV` gate applied in config; AOPS-T03 may change the list.
  - Unknown models are priced at the highest rate.
- **Not built (hooks only):**
  - Checkpoint files, resume and idempotent start (AOPS-T05). `dataHash` is the fact sheet's hash after `retrieve`;
    idempotent start needs a hash before the run, which AOPS-T05 decides.
  - Cancelling in-flight calls: only a check between steps exists, plus the signal passed to the SDK. It is untested.
  - Retry, refusal and truncation handling (AOPS-T03); repair retry (AOPS-T04); budget enforcement and breaker
    (AOPS-T06); trace retention (AOPS-REC-004).
- **Spec inconsistency:** `spec/agents/orchestrator.md` "Implementation" lists `server/ai/routes.ts` as AOPS-T01, but
  022 puts the routes in AIB-T05 and this task's Files line does not name them. Fix one of the two.
- **Files:** `package.json` and `package-lock.json` (`@anthropic-ai/sdk` ^1.12.0) were changed earlier on this branch
  and are listed here as instructed. No other file outside the task's Files line was edited. I did not touch
  `server/ai/tools.ts` or `server/ai/steps/*`, which are AIB-T02's, being worked on in parallel.
- G5: n/a (server only; no UI).
- Not closed here (orchestrator): task status, requirement statuses, gap register, README dashboard, traceability.

## Review
**Verdict: pass** on the second round (AGENT-REVIEWER, 2026-11-21). Gates at the second review: G1 pass (0 errors),
G3 pass (`npm run lint` 0 errors, 8 old warnings; `npm run typecheck` clean for both configs), G4 pass for the four
test files (55 passed). The orchestrator then added one test and ran the full suite (24 files, 300 passed + 1 expected
fail; the one failure was a hard-coded agent version after the retriever spec bump, fixed and re-run).

**Round 1: fail** (two majors, both fixed):
1. AOPS-FAIL-007: replay mode reported `enabled: true` without credentials. Decision: the criterion is clarified
   ("in live mode, no API credentials"), and replay is allowed only when `NODE_ENV` is development or test.
2. AOPS-OBS-002: the SDK was built without `logLevel`, so `ANTHROPIC_LOG=debug` could print request bodies. Now built
   with explicit `apiKey`, `baseURL`, `maxRetries: 0`, `logLevel: "off"` and `openTelemetry: false`; tested.
Round-1 minors fixed: `StepTools.set` removed; validated outputs cloned and deep-frozen; hooks, log and sinks guarded
so `runBrief` never rejects; `isInside` edge case; orchestrator version test; read-only rows frozen; known step error
codes kept (`not_found` added) without copying messages (from the AIB-T02 review). Spec side, done by the
orchestrator: 024 design Interfaces, config row, SDK settings and price source updated; orchestrator.md routes line
moved to AIB-T05; SEC-SUPPLY-002 reworded; AIB-T05 gained steps for catalog reasons and the "other APIs" test.

**Round 2 minors:**
1. `ANTHROPIC_CUSTOM_HEADERS` residual risk: acceptable (cannot change the host or enable logging; same trust
   boundary as the key), but it can be closed with the SDK's `fetch` option. **Recorded as a step on AOPS-T03.**
2. A step could throw `new StepFailure("tool_denied")`. **Fixed by the orchestrator:** only a refused call sets
   `tool_denied`; a test covers the StepFailure case.
3. Replay without a replay source: status says available, client is null. **Recorded as a step on AOPS-T09.**
4. The step span starts before `buildToolSet`; robustness note only (`buildToolSet` cannot throw).
5. Hand-off G3 was stale; now pass.
6. Design drift, catalog reasons, routes line: done (see above).
`RequestTimeoutError` (408) classification is recorded as a step on AOPS-T03.
