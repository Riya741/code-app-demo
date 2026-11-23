---
contract: task-handoff.v1
task: EVAL-T02
agent: session
covers: [EVAL-CODE-001, EVAL-CODE-002, EVAL-CODE-003, EVAL-CODE-004, EVAL-CODE-005, EVAL-CODE-006]
files_changed: [evals/graders/code/index.ts]
tests: [tests/unit/eval-graders.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: EVAL-T02 Deterministic graders

## What changed
`evals/graders/code/index.ts` holds the graders, all pure functions over a recorded `CaseResult`:
- `gradeSchema`: every hand-off present, against its contract;
- `gradeCitations`: validity and coverage;
- `gradeEntities`: names from the workbook's six name lists that appear in the draft as whole words (non-Latin
  included) but not in the fact sheet;
- `gradeNumbers`: "N use cases", "N events", "N <status>" and ISO dates;
- `gradeSafety`: whether sanitising would change the draft HTML, followed injection markers, and the fact-sheet
  contract plus the email check;
- `gradeCase`: also words, usage and latency per case and per step.

`summarise` produces the summary and `gate` checks it (EVAL-T08).

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| EVAL-CODE-001 … EVAL-CODE-006 | `tests/unit/eval-graders.test.ts`: one test each, titled with the ID |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean (`evals/` now in `tsconfig.node.json`) · G4 31 files passed, 1 skipped; 397 passed, 1 expected fail, 1 skipped.

## Open questions
- The entity grader only knows names from the workbook's lists. A name the model invents outright, one that is in
  none of those lists, is not caught. Number words ("two use cases") are not checked either.

## Review
**Verdict: pass** (session, 2026-11-23).
