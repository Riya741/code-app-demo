# Tasks — Agent Orchestration and Operations

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 0 · 🔄 0 · ⬜ 10 · ⛔ 0

- [ ] **AOPS-T01** Config, client factory, orchestrator skeleton with deterministic steps only, traces.
  - Status: ⬜ Not started · Covers: AOPS-ORCH-001..003, AOPS-FAIL-007, AOPS-OBS-001, AOPS-OBS-002 · Files: `server/ai/config.ts`, `server/ai/client.ts`, `server/ai/orchestrator.ts`, `server/ai/trace.ts`
- [ ] **AOPS-T02** Shared read-only tools with strict schemas and the tool allow-list check.
  - Status: ⬜ Not started · Covers: AOPS-ORCH-004, AOPS-ORCH-005 · Files: `server/ai/tools.ts`
- [ ] **AOPS-T03** Resilience layer: retry, timeout, stop reasons, fault injection.
  - Status: ⬜ Not started · Covers: AOPS-FAIL-001, AOPS-FAIL-004, AOPS-FAIL-005, AOPS-TEST-001 · Files: `server/ai/resilience.ts`
- [ ] **AOPS-T04** Repair retry and bounded critic loop.
  - Status: ⬜ Not started · Covers: AOPS-FAIL-002, AOPS-FAIL-003 · Depends on: AIB-T03
- [ ] **AOPS-T05** Checkpoints, resume, cancel, idempotent start, retention clean-up.
  - Status: ⬜ Not started · Covers: AOPS-REC-001..004
- [ ] **AOPS-T06** Budgets and circuit breaker.
  - Status: ⬜ Not started · Covers: AOPS-BUDG-001, AOPS-BUDG-002, AOPS-FAIL-006
- [ ] **AOPS-T07** Metrics script and short run ID in user messages.
  - Status: ⬜ Not started · Covers: AOPS-OBS-003, AOPS-OBS-005 · Files: `scripts/ai_metrics.ts`
- [ ] **AOPS-T08** Run Inspector page and runbook.
  - Status: ⬜ Not started · Covers: AOPS-OBS-004, AOPS-OBS-006 · Files: `src/pages/AiRuns.tsx`, `docs/ai-runbook.md`

## Test tasks
- [ ] **AOPS-T09** Replay model and one fault-injection test per failure criterion.
  - Status: ⬜ Not started · Covers: AOPS-TEST-002, AOPS-FAIL-001..007, AOPS-BUDG-001, AOPS-REC-001..003 · Depends on: AOPS-T03
- [ ] **AOPS-T10** Chaos run (20 briefs, faults on) and report in `l2-competency/evidence/`.
  - Status: ⬜ Not started · Covers: AOPS-TEST-003 · Depends on: AOPS-T09
