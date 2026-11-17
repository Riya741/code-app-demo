# Tasks — AI Evaluation

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 0 · 🔄 0 · ⬜ 9 · ⛔ 1

- [ ] **EVAL-T01** Dataset: fixtures, planted records, 30+ cases with expectations, `VERSION`.
  - Status: ⬜ Not started · Covers: EVAL-DATA-001..005 · Files: `evals/dataset/`, `evals/fixtures/`
- [ ] **EVAL-T02** Deterministic graders.
  - Status: ⬜ Not started · Covers: EVAL-CODE-001..006 · Files: `evals/graders/code/`
- [ ] **EVAL-T03** Judge prompt v1, output schema and pairwise mode.
  - Status: ⬜ Not started · Covers: EVAL-JUDGE-001..004 · Files: `evals/graders/judge/`
- [ ] **EVAL-T04** Harness CLI with replay mode, configs and Message Batches support.
  - Status: ⬜ Not started · Covers: EVAL-GATE-004, EVAL-EXP-003 · Files: `evals/run.ts`, `evals/configs/`, `package.json` · Depends on: AIB-T03
- [ ] **EVAL-T05** Human labels and judge calibration (κ, ρ, prompt history, second judge).
  - Status: ⬜ Not started · Covers: EVAL-CAL-001..004, EVAL-JUDGE-005 · Depends on: EVAL-T03, EVAL-T04
- [ ] **EVAL-T06** Pilot, then the six-configuration experiment and report.
  - Status: ⬜ Not started · Covers: EVAL-EXP-001..004, EVAL-WHY-001..003 · Depends on: EVAL-T05
- [ ] **EVAL-T07** Write ADR-0007 from the report.
  - Status: ⬜ Not started · Covers: EVAL-EXP-005 · Files: `spec/adr/0007-model-and-prompt-choice.md` · Depends on: EVAL-T06
- [ ] **EVAL-T08** Smoke suite, `evals/thresholds.json` and gate G7 in validation-gates.
  - Status: ⬜ Not started · Covers: EVAL-GATE-001, EVAL-GATE-003 · Files: `evals/thresholds.json`, `spec/gates/validation-gates.md`
- [ ] **EVAL-T09** CI job: code graders on recorded outputs for PRs touching `server/ai/**` or `evals/**`.
  - Status: ⛔ Blocked by QA-T07 · Covers: EVAL-GATE-002

## Test tasks
- [ ] **EVAL-T10** Unit tests for graders and statistics.
  - Status: ⬜ Not started · Covers: EVAL-CODE-001..006, EVAL-CAL-002 · Depends on: EVAL-T02
