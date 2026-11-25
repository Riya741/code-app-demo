---
contract: task-handoff.v1
task: EVAL-T15
agent: session
covers: [EVAL-CODE-004]
files_changed: [evals/graders/code/index.ts, tests/unit/eval-graders.test.ts]
tests: [tests/unit/eval-graders.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: EVAL-T15 Numeric grader reads status phrases as status counts

## What changed
`gradeNumbers` (EVAL-CODE-004) now compares each count the draft states with the matching source count, as set out in
the design's *Numeric check* table (CR-20261125-1):
- **"N use case(s)" + linking phrase + status** ("9 use cases are Live", "5 use cases are only Identified") is checked
  against that status's count. The linking phrase is is/are/remain(s)/stay(s) plus up to two of only, still, now,
  currently, already, in, at. Status names match case-insensitively and are regex-escaped, longest name first.
- **"K of (the) N use case(s)"** checks N against the total. With a status phrase it also checks K against that status.
- **Any other "N use case(s)"** is checked against the total. That includes a phrase naming a status that isn't in the
  case's `by_status`.
- "N <Status>", "N events" and the ISO date check are unchanged, and so is `evals/thresholds.json`.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| EVAL-CODE-004 | `tests/unit/eval-graders.test.ts`: "EVAL-CODE-004 checks 'N use cases are <status>' against that status count" (covers "are", "are only", "are still", "remain", "K of the N use cases are Live", a status with `&`, and wrong status counts reported) |
| EVAL-CODE-004 | `tests/unit/eval-graders.test.ts`: "EVAL-CODE-004 still reports a wrong total, including the N of 'K of N use cases' and a status not in the records" |
| EVAL-CODE-004 | `tests/unit/eval-graders.test.ts`: "EVAL-CODE-004 compares counts, statuses and ISO dates in the draft with the source records" (existing, unchanged, passes) |
| EVAL-CODE-004 | Manual: `npm run eval:grade ../data/ai-runs/evals/2026-11-24T16-54-29-639Z-smoke/` → `[eval] replay of 8 results: gate passed`, exit 0 (before: `gate failed: numeric_mismatch_cases = 1 (max 0)`, case `long-01`) |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 580 requirements, 245 tasks, 4 agents, 6 contracts, 3 prompts, 45 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors, 8 warnings (all pre-existing `react-refresh`); typecheck clean |
| G4 | `npm test` | 476 passed, 1 expected fail, 1 skipped (478) |

## Open questions
- Open questions 2 and 3 in CR-20261125-1 are still for the owner: per-stage event counts (proposed: not now) and the
  Medium severity of the gap row (now closing with this task).

## Review
**Verdict: pass** (session, 2026-11-25).
- EVAL-CODE-004: every stated use-case count is now compared with the count it actually states. A wrong status count,
  a wrong total, and the N of "K of N" are all still reported (second test), so the check got more accurate without
  getting looser. Rule 6: the code was fixed and the criterion was left as it is.
- Article XII.6 / EVAL-GATE-003: `evals/thresholds.json` is unchanged; the gate passes because the false mismatch is
  gone, not because a limit moved.
- Article X: both new tests are titled with EVAL-CODE-004 and written from the design table, not from the code.
- Minor, accepted: the linking phrase may span the newline between two sentences of the draft text. It needs a link
  verb straight after "N use cases", so a false hit across sentences is very unlikely, and it would still be checked
  against a real source count.
