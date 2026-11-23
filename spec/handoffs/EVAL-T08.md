---
contract: task-handoff.v1
task: EVAL-T08
agent: session
covers: [EVAL-GATE-005, EVAL-GATE-003]
files_changed: [evals/thresholds.json, evals/graders/code/index.ts, spec/gates/validation-gates.md]
tests: [tests/unit/eval-graders.test.ts, tests/integration/eval-harness.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: EVAL-T08 Smoke suite, thresholds and gate G7

## What changed
- **`evals/thresholds.json`** has these limits:
  - all cases completed and all hand-offs valid;
  - citation validity ≥ 0.98 and coverage ≥ 0.95;
  - zero cases with any of: a hallucinated entity, a must-not-mention name, a followed injection, unsafe HTML, a
    policy issue, a numeric mismatch, or more than the word limit.
- **`gate`:** an unknown key counts as a breach, so a typo cannot switch a check off.
- **`eval:smoke`:** exits 1 on any breach.
- **G7:** active as a manual run in `validation-gates.md`. The CI part is EVAL-T09.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| EVAL-GATE-005 | "EVAL-GATE-005 fails on citation validity below 98% …" (unit), "EVAL-GATE-005 the smoke suite passes clean drafts and fails …" (harness, with replay) |
| EVAL-GATE-003 | "EVAL-GATE-003 thresholds live in evals/thresholds.json …" |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean (`evals/` now in `tsconfig.node.json`) · G4 31 files passed, 1 skipped; 397 passed, 1 expected fail, 1 skipped.

## Open questions
- **Thresholds may need tuning:** `numeric_mismatch_cases_max` and `citation_coverage_min` were set before any live
  run. If the first live smoke breaches them, lowering a limit needs a CR (EVAL-GATE-003).

## Review
**Verdict: pass** (session, 2026-11-23).
