# Tasks — Agent Orchestration and Operations

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 11 tasks — ✅ 3 · 🔄 0 · ⬜ 8 · ⛔ 0

- [x] **AOPS-T01** Config, client factory, orchestrator skeleton with deterministic steps only, traces.
  - Status: ✅ Done · Covers: AOPS-ORCH-001..004, AOPS-FAIL-007, AOPS-OBS-001, AOPS-OBS-002 · Files: `server/ai/config.ts`, `server/ai/client.ts`, `server/ai/orchestrator.ts`, `server/ai/trace.ts`, `package.json` and `package-lock.json` (`@anthropic-ai/sdk`), `tests/unit/ai-config.test.ts`, `tests/unit/ai-client.test.ts`, `tests/unit/ai-trace.test.ts`, `tests/integration/orchestrator.test.ts`
  - Verified 2026-11-21: 56 tests in the four test files (fixed sequence, contract validation with frozen outputs, settings from the agent specs, `tool_denied` span and step failure, key never logged, SDK built with `logLevel: "off"`, explicit `baseURL` and `maxRetries: 0`, no free text in JSONL traces, replay barred outside development/test); G1, G3, G4 (full suite: 24 files, 300 passed + 1 expected fail; the one failure in that run (a hard-coded agent version after the retriever spec bump) fixed and re-run) pass; review failed once (replay vs AOPS-FAIL-007; SDK debug logging), passed on the second round ([hand-off](../../handoffs/AOPS-T01.md)). AOPS-FAIL-007 stays ⚠️ Partial until AIB-T05 adds `/api/ai/status`.
- [x] **AOPS-T02** Shared read-only tools with strict schemas and the tool allow-list check.
  - Status: ✅ Done · Covers: AOPS-ORCH-004, AOPS-ORCH-005 · Files: `server/ai/tools.ts`, `server/workbook.ts` (exports and read-only parameter types only), `tests/integration/tools.test.ts`
  - Verified 2026-11-20: 14 integration tests on the 8-customer fixture (allow-list parsed from the agent specs, refusal before any read, strict schemas, allowed fields only, caps, redaction, workbook byte-identical after every tool); G1, G3, G4 (full suite: 18 files, 198 passed + 1 expected fail) pass; review pass ([hand-off](../../handoffs/AOPS-T02.md)). AOPS-ORCH-004 stays ⚠️ Partial: the `tool_denied` span and step failure move to AOPS-T01 (Covers extended).
- [ ] **AOPS-T03** Resilience layer: retry, timeout, stop reasons, fault injection.
  - Status: ⬜ Not started · Covers: AOPS-FAIL-001, AOPS-FAIL-004, AOPS-FAIL-005, AOPS-TEST-001 · Files: `server/ai/resilience.ts`
  - Step: classify `RequestTimeoutError` (408) as `timeout` when setting the retry rules (AOPS-T01 review).
  - Step: decide on `ANTHROPIC_CUSTOM_HEADERS` (always merged by the SDK; cannot change the host or enable logging, same trust boundary as the key): accept as a documented residual risk, or rebuild request headers from an allow-list through the SDK's `fetch` option (AOPS-T01 review).
- [ ] **AOPS-T04** Repair retry.
  - Status: ⬜ Not started · Covers: AOPS-FAIL-002 · Depends on: AIB-T03 · Critic loop (AOPS-FAIL-003) removed by CR-20261121-1
- [ ] **AOPS-T05** Checkpoints, resume, cancel, idempotent start, retention clean-up.
  - Status: ⬜ Not started · Covers: AOPS-REC-001..004
- [ ] **AOPS-T06** Budgets and circuit breaker.
  - Status: ⬜ Not started · Covers: AOPS-BUDG-001, AOPS-BUDG-002, AOPS-FAIL-006
- [ ] **AOPS-T07** Metrics script and short run ID in user messages.
  - Status: ⬜ Not started · Covers: AOPS-OBS-008, AOPS-OBS-005 · Files: `scripts/ai_metrics.ts`
- [ ] **AOPS-T08** Run Inspector page and runbook.
  - Status: ⬜ Not started · Covers: AOPS-OBS-009, AOPS-OBS-006 · Files: `src/pages/AiRuns.tsx`, `docs/ai-runbook.md`
- [x] **AOPS-T11** Remove the Critic step (CR-20261121-1): straight retrieve → analyse → write → guard state machine; code steps and the run carry no agent ID; the run ends `unverified` when the guard's draft is; `critic-verdict.v1` deleted and `writer-to-critic.v1` renamed `writer-draft.v1`.
  - Status: ✅ Done · Covers: AOPS-ORCH-006, AOPS-FAIL-008, AOPS-OBS-007 · Files: `server/ai/config.ts`, `server/ai/orchestrator.ts`, `server/ai/contracts.ts`, `server/ai/tools.ts`, `server/ai/trace.ts`, `server/ai/steps/retriever.ts`, `tests/integration/orchestrator.test.ts`, `tests/integration/tools.test.ts`, `tests/unit/ai-config.test.ts`, `tests/unit/ai-trace.test.ts`, `tests/unit/ai-client.test.ts`, `tests/unit/contracts.test.ts`
  - Verified 2026-11-21: orchestrator, config, tools, contracts tests (110 related tests pass); full `npm test` 300 passed + 1 expected fail; G1 0 errors; lint 0 errors; typecheck; hand-off `spec/handoffs/AOPS-T11.md`.

## Test tasks
- [ ] **AOPS-T09** Replay model and one fault-injection test per failure criterion.
  - Status: ⬜ Not started · Covers: AOPS-TEST-002, AOPS-FAIL-001, AOPS-FAIL-002, AOPS-FAIL-004..007, AOPS-BUDG-001, AOPS-REC-001..003 · Depends on: AOPS-T03
  - Step: when the replay client is wired, make `aiStatus` and `createModelClient` agree in replay mode (today replay without a replay source reports available but has no client; AOPS-T01 review).
- [ ] **AOPS-T10** Chaos run (20 briefs, faults on) and report in `l2-competency/evidence/`.
  - Status: ⬜ Not started · Covers: AOPS-TEST-003 · Depends on: AOPS-T09
