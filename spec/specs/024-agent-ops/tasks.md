# Tasks — Agent Orchestration and Operations

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 12 tasks — ✅ 4 · 🔄 0 · ⬜ 8 · ⛔ 0

- [x] **AOPS-T01** Config, client factory, orchestrator skeleton with deterministic steps only, traces.
  - Status: ✅ Done · Covers: AOPS-ORCH-001..004, AOPS-FAIL-007, AOPS-OBS-001, AOPS-OBS-002 · Files: `server/ai/config.ts`, `server/ai/client.ts`, `server/ai/orchestrator.ts`, `server/ai/trace.ts`, `package.json` and `package-lock.json` (`@anthropic-ai/sdk`), `tests/unit/ai-config.test.ts`, `tests/unit/ai-client.test.ts`, `tests/unit/ai-trace.test.ts`, `tests/integration/orchestrator.test.ts`
  - Verified 2026-11-21: 56 tests in the four test files (fixed sequence, contract validation with frozen outputs, settings from the agent specs, `tool_denied` span and step failure, key never logged, SDK built with `logLevel: "off"`, explicit `baseURL` and `maxRetries: 0`, no free text in JSONL traces, replay barred outside development/test); G1, G3, G4 (full suite: 24 files, 300 passed + 1 expected fail; the one failure in that run (a hard-coded agent version after the retriever spec bump) fixed and re-run) pass; review failed once (replay vs AOPS-FAIL-007; SDK debug logging), passed on the second round ([hand-off](../../handoffs/AOPS-T01.md)). AOPS-FAIL-007 stays ⚠️ Partial until AIB-T05 adds `/api/ai/status`.
- [x] **AOPS-T02** Shared read-only tools with strict schemas and the tool allow-list check.
  - Status: ✅ Done · Covers: AOPS-ORCH-004, AOPS-ORCH-005 · Files: `server/ai/tools.ts`, `server/workbook.ts` (exports and read-only parameter types only), `tests/integration/tools.test.ts`
  - Verified 2026-11-20: 14 integration tests on the 8-customer fixture (allow-list parsed from the agent specs, refusal before any read, strict schemas, allowed fields only, caps, redaction, workbook byte-identical after every tool); G1, G3, G4 (full suite: 18 files, 198 passed + 1 expected fail) pass; review pass ([hand-off](../../handoffs/AOPS-T02.md)). AOPS-ORCH-004 stays ⚠️ Partial: the `tool_denied` span and step failure move to AOPS-T01 (Covers extended).
- [ ] **AOPS-T03** Resilience layer: retry, timeout, stop reasons, fault injection.
  - Status: ⬜ Not started · Covers: AOPS-FAIL-001, AOPS-FAIL-004, AOPS-FAIL-005, AOPS-TEST-001 · Files: `server/ai/resilience.ts` · Deferred by CR-20261123-2
  - Step: classify `RequestTimeoutError` (408) as `timeout` when setting the retry rules (AOPS-T01 review).
  - Step: decide on `ANTHROPIC_CUSTOM_HEADERS` (always merged by the SDK; cannot change the host or enable logging, same trust boundary as the key): accept as a documented residual risk, or rebuild request headers from an allow-list through the SDK's `fetch` option (AOPS-T01 review). Since CR-20261123-1 the decision covers both routes: on the gateway route these headers would go to the gateway.
  - Step: the retry rules apply unchanged on the gateway route (errors are classified by SDK error class, so gateway 429/5xx map as on the direct route); a response rejected by the model check of AOPS-ROUTE-003 is not retried (CR-20261123-1).
- [ ] **AOPS-T04** Repair retry.
  - Status: ⬜ Not started · Covers: AOPS-FAIL-002 · Depends on: AIB-T03 · Critic loop (AOPS-FAIL-003) removed by CR-20261121-1 · Deferred by CR-20261123-2
- [ ] **AOPS-T05** Checkpoints, resume, cancel, idempotent start, retention clean-up.
  - Status: ⬜ Not started · Covers: AOPS-REC-001..004 · Deferred by CR-20261123-2
- [ ] **AOPS-T06** Budgets and circuit breaker.
  - Status: ⬜ Not started · Covers: AOPS-BUDG-001, AOPS-BUDG-002, AOPS-FAIL-006 · Deferred by CR-20261123-2
- [ ] **AOPS-T07** Metrics script and short run ID in user messages.
  - Status: ⬜ Not started · Covers: AOPS-OBS-008, AOPS-OBS-005 · Files: `scripts/ai_metrics.ts` · Deferred by CR-20261123-2
- [ ] **AOPS-T08** Run Inspector page and runbook.
  - Status: ⬜ Not started · Covers: AOPS-OBS-009, AOPS-OBS-006 · Files: `src/pages/AiRuns.tsx`, `docs/ai-runbook.md` · Deferred by CR-20261123-2
- [x] **AOPS-T11** Remove the Critic step (CR-20261121-1): straight retrieve → analyse → write → guard state machine; code steps and the run carry no agent ID; the run ends `unverified` when the guard's draft is; `critic-verdict.v1` deleted and `writer-to-critic.v1` renamed `writer-draft.v1`.
  - Status: ✅ Done · Covers: AOPS-ORCH-006, AOPS-FAIL-008, AOPS-OBS-007 · Files: `server/ai/config.ts`, `server/ai/orchestrator.ts`, `server/ai/contracts.ts`, `server/ai/tools.ts`, `server/ai/trace.ts`, `server/ai/steps/retriever.ts`, `tests/integration/orchestrator.test.ts`, `tests/integration/tools.test.ts`, `tests/unit/ai-config.test.ts`, `tests/unit/ai-trace.test.ts`, `tests/unit/ai-client.test.ts`, `tests/unit/contracts.test.ts`
  - Verified 2026-11-21: orchestrator, config, tools, contracts tests (110 related tests pass); full `npm test` 300 passed + 1 expected fail; G1 0 errors; lint 0 errors; typecheck; hand-off `spec/handoffs/AOPS-T11.md`.
- [x] **AOPS-T12** Gateway mode (CR-20261123-1, ADR-0009): gateway settings in the config, credentials and `no_credentials` per route, gateway SDK construction, model prefix and response-model check, route fields in traces, bulk-run guard; tests with a fake SDK and one live check.
  - Status: ✅ Done · Covers: AOPS-ROUTE-001..008, SEC-SUPPLY-005 · Files: `server/ai/config.ts`, `server/ai/client.ts`, `server/ai/trace.ts`, `server/ai/orchestrator.ts` (route on the run span), `tests/unit/ai-config.test.ts`, `tests/unit/ai-client.test.ts`, `tests/unit/ai-trace.test.ts`, `tests/integration/gateway.live.test.ts` · Depends on: AOPS-T01 · Unblocks: the AIB-T03 live check; the gateway route of EVAL-T04 and AOPS-T10
  - Verified 2026-11-23: 10 unit tests in `tests/unit/ai-gateway.test.ts` (fake SDK: route default, settings validation without echo, no gateway reads on the direct route, per-route credentials, SDK options, prefix and model check, trace route fields, bulk refusal, keys never in config, client or errors) and the AIB-T03 live run through `https://portkeygateway.perficient.com` (owner: gateway use minimal, no separate gateway test); G1, G3, G4 pass; review pass ([hand-off](../../handoffs/AOPS-T12.md)).
  - Step: config: `AI_GATEWAY` (`none` default, `portkey`), `AI_GATEWAY_URL`, `AI_GATEWAY_MODEL_PREFIX`, `AI_GATEWAY_ALLOW_BULK`, with the rules of design "Model route"; each error names the variable and the rule only; on the direct route the gateway variables are not read; `hasCredentials` per route (AOPS-FAIL-007 keeps its meaning, see its note).
  - Step: client: on the gateway route construct the SDK with `apiKey: null`, `authToken: null`, `baseURL` from `AI_GATEWAY_URL`, the Portkey key in `defaultHeaders`, and the same hardening; add the prefix to `model` on the wire, check the response's `model`, return the plain ID; on the direct route never read `PORTKEY_API_KEY` (test with an environment object that records which names are read).
  - Step: trace: `route`, `gatewayHost`, `gatewayProvider` on the run span and on `llm_call` spans, through the trace allow-list; cost and `model` stay the plain ID.
  - Step: bulk guard `gatewayBulkRefusal(config)` for the eval harness (EVAL-T04) and the chaos run (AOPS-T10); unit-tested here, wired there.
  - Step (2026-11-23, owner: gateway use minimal): the AIB-T03 live check (one run, two calls, through the gateway) is this task's live check; no separate gateway test file.
  - Step: one live check (`tests/integration/gateway.live.test.ts`, skipped unless `AI_LIVE_CHECK=1`, the gateway route and `PORTKEY_API_KEY`): one request with a fixed prompt and no project data, structured output and effort; prints only counts. Record in the design and the hand-off which header set the gateway needs (try `x-portkey-api-key` alone first), the response `model`, and that the base URL without `/v1` is the right one.
  - Step: no UI change and no new user-facing message (G5 n/a); G7 is not built yet (EVAL-T08) and the model and prompts do not change.

## Test tasks
- [ ] **AOPS-T09** Replay model and one fault-injection test per failure criterion.
  - Status: ⬜ Not started · Covers: AOPS-TEST-002, AOPS-FAIL-001, AOPS-FAIL-002, AOPS-FAIL-004..007, AOPS-BUDG-001, AOPS-REC-001..003 · Depends on: AOPS-T03 · Deferred by CR-20261123-2
  - Step: when the replay client is wired, make `aiStatus` and `createModelClient` agree in replay mode (today replay without a replay source reports available but has no client; AOPS-T01 review).
- [ ] **AOPS-T10** Chaos run (20 briefs, faults on) and report in `l2-competency/evidence/`.
  - Status: ⬜ Not started · Covers: AOPS-TEST-003, AOPS-ROUTE-008 · Depends on: AOPS-T09; AOPS-T12 when run through the gateway · Covers extended by CR-20261123-1 · Deferred by CR-20261123-2
  - Step: on the gateway route call `gatewayBulkRefusal` before the first brief: 20 live briefs are a bulk run that needs `AI_GATEWAY_ALLOW_BULK=1` and the owner's go-ahead (AOPS-ROUTE-008).
