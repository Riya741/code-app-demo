# Tasks — AI Evaluation

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 12 tasks — ✅ 1 · 🔄 0 · ⬜ 10 · ⛔ 1

**Retired tasks:** EVAL-T03 (judge prompt), EVAL-T05 (judge calibration); removed by CR-20261121-1, IDs not reused.

- [ ] **EVAL-T01** Dataset: fixtures, planted records, 30+ cases with expectations, `VERSION`.
  - Status: ⬜ Not started · Covers: EVAL-DATA-001..005 · Files: `evals/dataset/`, `evals/fixtures/`
- [ ] **EVAL-T02** Deterministic graders.
  - Status: ⬜ Not started · Covers: EVAL-CODE-001..006 · Files: `evals/graders/code/`
- [ ] **EVAL-T04** Harness CLI with replay mode, configs and Message Batches support.
  - Status: ⬜ Not started · Covers: EVAL-GATE-004, EVAL-EXP-003, AOPS-ROUTE-008 · Files: `evals/run.ts`, `evals/configs/`, `package.json` · Depends on: AIB-T03; AOPS-T12 for the gateway route · Covers extended by CR-20261123-1
  - Step: on the gateway route, call `gatewayBulkRefusal` (AOPS-T12) before the first model call of any live command, so a live eval needs `AI_GATEWAY_ALLOW_BULK=1`; replay needs nothing. Send single requests on the gateway route: Message Batches are not assumed to pass through the gateway (CR-20261123-1).
- [ ] **EVAL-T06** Pilot, then the four-configuration experiment and report (deterministic graders).
  - Status: ⬜ Not started · Covers: EVAL-EXP-002, EVAL-EXP-003, EVAL-EXP-006, EVAL-EXP-007, EVAL-WHY-001, EVAL-WHY-002 · Depends on: EVAL-T04 · Re-scoped by CR-20261121-1 (no judge, no critic configurations)
- [ ] **EVAL-T07** Write ADR-0007 from the report.
  - Status: ⬜ Not started · Covers: EVAL-EXP-008 · Files: `spec/adr/0007-model-and-prompt-choice.md` · Depends on: EVAL-T06
- [ ] **EVAL-T08** Smoke suite, `evals/thresholds.json` and gate G7 in validation-gates.
  - Status: ⬜ Not started · Covers: EVAL-GATE-005, EVAL-GATE-003 · Files: `evals/thresholds.json`, `spec/gates/validation-gates.md`
- [ ] **EVAL-T09** CI job: code graders on recorded outputs for PRs touching `server/ai/**` or `evals/**`.
  - Status: ⛔ Blocked by QA-T07 · Covers: EVAL-GATE-002

- [ ] **EVAL-T11** Eval judge: prompt `judge.v1` (header cites AGENT-EVAL-JUDGE), judge step in `eval:full`/`eval:compare` only, Writer-model check, blind inputs.
  - Status: ⬜ Not started · Covers: EVAL-JUDGE-006..009 · Files: `evals/graders/judge/`, `evals/run.ts` · Depends on: EVAL-T04, EVAL-T14 · Added by CR-20261121-2
- [x] **EVAL-T14** `judge-verdict.v1` zod schema in `server/ai/contracts.ts`, checked against its JSON Schema by the contracts test (every contract file needs one, AOPS-ORCH-002).
  - Status: ✅ Done · Covers: EVAL-JUDGE-006, AOPS-ORCH-002 · Files: `server/ai/contracts.ts`, `tests/unit/contracts.test.ts` · Added by CR-20261121-2
  - Verified 2026-11-21: `JudgeVerdictV1Schema` in the registry; 22 contract tests pass (structure and accept/reject agreement with the JSON Schema, including the new contract); case IDs limited to the eight dataset categories; G1 0 errors, lint and typecheck clean; hand-off `spec/handoffs/EVAL-T14.md`. EVAL-JUDGE-006 stays 📝 until the judge itself is built (EVAL-T11).
- [ ] **EVAL-T12** Human labels (owner scores 15 to 20 fixture drafts), κ and ρ per criterion, calibration threshold, judge prompt history, judge scores and disagreement review in the report.
  - Status: ⬜ Not started · Covers: EVAL-CAL-005..008, EVAL-EXP-009, EVAL-WHY-004 · Files: `evals/dataset/human-labels.jsonl`, `evals/graders/judge/calibration.ts`, `evals/graders/judge/history.md` · Depends on: EVAL-T11, EVAL-T01 · Added by CR-20261121-2

## Test tasks
- [ ] **EVAL-T10** Unit tests for graders and statistics.
  - Status: ⬜ Not started · Covers: EVAL-CODE-001..006 · Depends on: EVAL-T02
- [ ] **EVAL-T13** Unit tests for the eval judge: verdict schema, Writer-model check, blind inputs, never called from smoke or the pipeline; κ and ρ on textbook examples.
  - Status: ⬜ Not started · Covers: EVAL-JUDGE-006..009, EVAL-CAL-006, EVAL-CAL-007 · Depends on: EVAL-T11 · Added by CR-20261121-2
