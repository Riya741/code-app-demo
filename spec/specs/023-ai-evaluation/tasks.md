# Tasks — AI Evaluation

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 13 tasks — ✅ 6 · 🔄 0 · ⬜ 7 · ⛔ 0

**Retired tasks:** EVAL-T03 (judge prompt), EVAL-T05 (judge calibration); removed by CR-20261121-1, IDs not reused.

- [x] **EVAL-T01** Dataset: fixtures, planted records, 30+ cases with expectations, `VERSION`.
  - Status: ✅ Done · Covers: EVAL-DATA-001..005 · Files: `evals/dataset/`, `evals/fixtures/`
  - Verified 2026-11-23: 32 cases (8 categories × 4) in `evals/dataset/cases.jsonl` built from `evals/dataset/specs.ts` on the seed-42 fixture (`evals/fixtures/fixture.json`), `VERSION` 1; 5 dataset tests in `tests/integration/eval-harness.test.ts` incl. the drift check of every case against a regenerated fixture ([hand-off](../../handoffs/EVAL-T01.md)).
- [x] **EVAL-T02** Deterministic graders.
  - Status: ✅ Done · Covers: EVAL-CODE-001..006 · Files: `evals/graders/code/`
  - Verified 2026-11-23: six graders and the summary in `evals/graders/code/index.ts`; 6 unit tests in `tests/unit/eval-graders.test.ts` on synthetic results ([hand-off](../../handoffs/EVAL-T02.md)).
- [x] **EVAL-T04** Harness CLI with replay mode, configs and Message Batches support.
  - Status: ✅ Done · Covers: EVAL-GATE-004, EVAL-EXP-003, AOPS-ROUTE-008 · Files: `evals/run.ts`, `evals/configs/`, `package.json` · Depends on: AIB-T03; AOPS-T12 for the gateway route · Covers extended by CR-20261123-1
  - Step: on the gateway route, call `gatewayBulkRefusal` (AOPS-T12) before the first model call of any live command, so a live eval needs `AI_GATEWAY_ALLOW_BULK=1`; replay needs nothing. Send single requests on the gateway route: Message Batches are not assumed to pass through the gateway (CR-20261123-1).
  - Verified 2026-11-23: `evals/run.ts` (smoke, full and compare with a 3-case pilot, grade = replay, build-dataset), `evals/configs/default.json`, npm scripts; gateway bulk refusal before any model call; Message Batches not built (single requests; deferred with the direct-route experiment, CR-20261123-2); 4 harness tests with stub LLM steps and no model ([hand-off](../../handoffs/EVAL-T04.md)).
- [ ] **EVAL-T06** Pilot, then the four-configuration experiment and report (deterministic graders).
  - Status: ⬜ Not started · Covers: EVAL-EXP-002, EVAL-EXP-003, EVAL-EXP-006, EVAL-EXP-007, EVAL-WHY-001, EVAL-WHY-002 · Depends on: EVAL-T04 · Re-scoped by CR-20261121-1 (no judge, no critic configurations) · Deferred by CR-20261123-2
- [ ] **EVAL-T07** Write ADR-0007 from the report.
  - Status: ⬜ Not started · Covers: EVAL-EXP-008 · Files: `spec/adr/0007-model-and-prompt-choice.md` · Depends on: EVAL-T06 · Deferred by CR-20261123-2
- [x] **EVAL-T08** Smoke suite, `evals/thresholds.json` and gate G7 in validation-gates.
  - Status: ✅ Done · Covers: EVAL-GATE-005, EVAL-GATE-003 · Files: `evals/thresholds.json`, `spec/gates/validation-gates.md`
  - Verified 2026-11-23: `evals/thresholds.json`, gate in `evals/graders/code/index.ts`, G7 active (manual run) in `spec/gates/validation-gates.md`; 2 gate unit tests and the smoke pass/fail harness test; no live smoke run yet (owner: gateway minimal) ([hand-off](../../handoffs/EVAL-T08.md)).
- [ ] **EVAL-T09** CI job: code graders on recorded outputs for PRs touching `server/ai/**` or `evals/**`.
  - Status: ⬜ Not started · Covers: EVAL-GATE-002 · Deferred by CR-20261123-2
- [x] **EVAL-T15** Numeric grader: read "N use case(s) <linking phrase> <status>" as a status count, not the total (defect, CR-20261125-1).
  - Status: ✅ Done · Covers: EVAL-CODE-004 · Files: `evals/graders/code/index.ts`, `tests/unit/eval-graders.test.ts` · Added by CR-20261125-1
  - Step: in `gradeNumbers`, when `N use case(s)` is followed by a linking phrase (design, *Numeric check*) and a status name from the case's `by_status`, check N against that status's count; for `K of (the) N use case(s)` check N against the total and, with a status phrase, K against that status's count; otherwise keep the total check. `N <Status>`, `N events` and the date check stay as they are; `evals/thresholds.json` is not changed.
  - Acceptance: a unit test titled starting `EVAL-CODE-004 checks 'N use cases are <status>' against that status count` (covering "are", "are only", "K of the N use cases are <status>" and a status with `&`); a unit test proving a wrong total (`N use cases` with no status) is still reported; `npm run eval:grade ../data/ai-runs/evals/2026-11-24T16-54-29-639Z-smoke/` passes the gate (case `long-01` clean). Close: EVAL-CODE-004 back to ✅ and its gap-register row closed.
  - Verified 2026-11-25: `gradeNumbers` reads status phrases and "K of N" per the design table; 2 new EVAL-CODE-004 unit tests in `tests/unit/eval-graders.test.ts` (34 related tests pass); `npm run eval:grade ../data/ai-runs/evals/2026-11-24T16-54-29-639Z-smoke/` → gate passed (was `numeric_mismatch_cases = 1`); thresholds unchanged; G1 0 errors, G3 0 errors (8 old warnings), typecheck clean, G4 476 passed, 1 expected fail, 1 skipped ([hand-off](../../handoffs/EVAL-T15.md)).

- [ ] **EVAL-T11** Eval judge: prompt `judge.v1` (header cites AGENT-EVAL-JUDGE), judge step in `eval:full`/`eval:compare` only, Writer-model check, blind inputs.
  - Status: ⬜ Not started · Covers: EVAL-JUDGE-006..009 · Files: `evals/graders/judge/`, `evals/run.ts` · Depends on: EVAL-T04, EVAL-T14 · Added by CR-20261121-2 · Deferred by CR-20261123-2
- [x] **EVAL-T14** `judge-verdict.v1` zod schema in `server/ai/contracts.ts`, checked against its JSON Schema by the contracts test (every contract file needs one, AOPS-ORCH-002).
  - Status: ✅ Done · Covers: EVAL-JUDGE-006, AOPS-ORCH-002 · Files: `server/ai/contracts.ts`, `tests/unit/contracts.test.ts` · Added by CR-20261121-2
  - Verified 2026-11-21: `JudgeVerdictV1Schema` in the registry; 22 contract tests pass (structure and accept/reject agreement with the JSON Schema, including the new contract); case IDs limited to the eight dataset categories; G1 0 errors, lint and typecheck clean; hand-off `spec/handoffs/EVAL-T14.md`. EVAL-JUDGE-006 stays 📝 until the judge itself is built (EVAL-T11).
- [ ] **EVAL-T12** Human labels (owner scores 15 to 20 fixture drafts), κ and ρ per criterion, calibration threshold, judge prompt history, judge scores and disagreement review in the report.
  - Status: ⬜ Not started · Covers: EVAL-CAL-005..008, EVAL-EXP-009, EVAL-WHY-004 · Files: `evals/dataset/human-labels.jsonl`, `evals/graders/judge/calibration.ts`, `evals/graders/judge/history.md` · Depends on: EVAL-T11, EVAL-T01 · Added by CR-20261121-2 · Deferred by CR-20261123-2

## Test tasks
- [ ] **EVAL-T10** Unit tests for graders and statistics.
  - Status: ⬜ Not started · Covers: EVAL-CODE-001..006 · Depends on: EVAL-T02 · Deferred by CR-20261123-2 (folded into EVAL-T02: graders are written with their tests)
- [ ] **EVAL-T13** Unit tests for the eval judge: verdict schema, Writer-model check, blind inputs, never called from smoke or the pipeline; κ and ρ on textbook examples.
  - Status: ⬜ Not started · Covers: EVAL-JUDGE-006..009, EVAL-CAL-006, EVAL-CAL-007 · Depends on: EVAL-T11 · Added by CR-20261121-2 · Deferred by CR-20261123-2
