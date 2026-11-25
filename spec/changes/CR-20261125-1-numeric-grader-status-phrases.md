# Change Request: Numeric grader reads "N use cases are <status>" as a status count

- **ID:** CR-20261125-1
- **Author / date:** Drafted with Claude Code (spec author) for the project owner · 2026-11-25
- **Type:** Defect fix (eval grader)
- **Specs affected:** specs/023-ai-evaluation (requirements, design, tasks); gates/gap-register.md; README dashboard; traceability.md
- **Constitution articles affected:** none amended; I (code and spec disagree, fix the code), X (regression test named by ID) and XII.6 (gate G7) apply
- **Status:** Approved (owner, 2026-11-25) · branch `eval-t15-numeric-grader`

## 1. Problem
Gate G7 fails on a correct draft. Re-grading the recorded gateway smoke run without a model:

```
npm run eval:grade ../data/ai-runs/evals/2026-11-24T16-54-29-639Z-smoke/
→ gate failed: numeric_mismatch_cases = 1 (max 0)
```

Only case `long-01` (Tidewell Networks: 24 use cases, 9 Live, 5 Identified, 15 events) fails, with
`use cases: draft 9, source 24` and `use cases: draft 5, source 24`. Every number in that draft is correct; the draft
says "9 use cases are Live" and "5 use cases are only Identified". The other 7 cases are clean.

Cause: `gradeNumbers` in `evals/graders/code/index.ts` (EVAL-CODE-004) reads every `N use case(s)` as a claim about the
**total** use case count (`/\b(\d+)\s+use cases?\b/gi`), and recognises a status count only in the form `N <Status>`
("9 Live"). A noun-first status breakdown is therefore checked against the total and reported as a mismatch.

The criterion of EVAL-CODE-004 ("compare counts, statuses and dates stated in the draft with the case's source records
and report mismatches") is right; the code misreads which count a phrase states. Under Rule 6 the code is the defect,
so the criterion and `evals/thresholds.json` stay unchanged.

## 2. Proposed behaviour
In `gradeNumbers` (EVAL-CODE-004):
- **Status phrase.** WHEN `N use case(s)` is followed by a short linking phrase and then a status name from the case's
  `expect.counts.by_status`, N is checked against **that status's count**, not the total. A linking phrase is one verb
  (`is`, `are`, `remain`, `remains`, `stay`, `stays`) with up to two optional words from `only`, `still`, `now`,
  `currently`, `already`, `in`, `at`. Examples: "9 use cases are Live", "5 use cases are only Identified",
  "1 use case remains Blocked", "2 use cases are still in Implementing". Status names match case-insensitively and are
  regex-escaped ("Documented & Validated").
- **Part of the total.** WHEN the draft says `K of (the) N use case(s)` followed by a linking phrase and a status name,
  N is checked against the **total** and K against **that status's count** ("9 of the 24 use cases are Live"). Without
  a status phrase, `K of (the) N use case(s)` checks only N against the total (owner answer to open question 1).
- **Total.** Every other `N use case(s)` is still checked against the total, so "12 use cases" for a 24-use-case
  customer is still reported.
- **Unchanged.** The `N <Status>` form ("9 Live"), the events total (`N events`) and the ISO date check stay as they are.
  The mismatch messages keep their present form (`status <name>: draft N, source M` for a status phrase).
- **Events by stage: not in this change.** The case expectations hold no per-stage event counts
  (EVAL-DATA-004 stores counts by use case status only), so "N events are <stage>" has nothing to be checked against.
  Adding stage counts would change the dataset (EVAL-DATA-004/005) and is left to the owner (open question 2).

Acceptance: a regression test titled starting `EVAL-CODE-004 checks 'N use cases are <status>' against that status
count`, a test proving a wrong total (`N use cases` with no status) is still reported, and
`npm run eval:grade ../data/ai-runs/evals/2026-11-24T16-54-29-639Z-smoke/` passes the gate.

## 3. Spec impact
| File | IDs | Change |
|---|---|---|
| specs/023-ai-evaluation/requirements.md | EVAL-CODE-004 | status ✅ → ⚠️ Partial while the defect is open (criterion unchanged); back to ✅ with EVAL-T15 |
| specs/023-ai-evaluation/design.md | — | new section *Numeric check (EVAL-CODE-004)*: how totals and status counts are recognised; Testing approach and Constitution check rows I, X |
| specs/023-ai-evaluation/tasks.md | EVAL-T15 | new task, ⬜; Summary line 12 → 13 tasks |
| gates/gap-register.md | EVAL-CODE-004 | new Open row (Medium), fix task EVAL-T15 |
| README.md | 023 row, Total | dashboard counts (✅ −1, ⚠️ +1, tasks +1 ⬜) |
| traceability.md | EVAL-T15 | dependency chain line |
| steering/constitution-mapping.md | — | no change (no article or matrix row changes) |

No user-facing message is added or changed (grader output only), so the messages catalog is unchanged. Not changed:
`evals/thresholds.json` (EVAL-GATE-003), the EVAL-CODE-004 criterion, the dataset and its `VERSION`.

## 4. Risks and rollout
- No contract, API, UI, workbook or dataset change. Code files: `evals/graders/code/index.ts`,
  `tests/unit/eval-graders.test.ts`.
- **Risk: a wrong status count hidden.** A status phrase is no longer checked against the total, but it is checked
  against the status count, so a wrong "7 use cases are Live" is still reported. A status name not in the case's
  `by_status` leaves the phrase as a total claim (strict, never silent).
- **"K of N" phrases:** handled (owner, 2026-11-25): "9 of the 24 use cases are Live" checks 24 against the total and
  9 against Live, so the fix adds no new false mismatch and checks one more number than the present code.
- G7 thresholds stay as they are; the gate becomes accurate rather than looser.
- **Undo:** revert the EVAL-T15 commit; EVAL-CODE-004 goes back to ⚠️ Partial.

## 5. Open questions for the owner
1. Should the fix also treat `K of (the) N use cases are <status>` as total N plus status count K? **Answered
   2026-11-25 (owner): yes, included** (section 2, *Part of the total*).
2. Should per-stage event counts be added to the case expectations (dataset `VERSION` bump) so "N events are <stage>"
   can be checked too? Proposed: no, not in this change.
3. Severity in the gap register is Medium (a false G7 failure, workaround: read the mismatch detail by hand). Agree?

## 6. Review
- [x] requirements.md approved by: Riya Bhattacharjee (owner), 2026-11-25
- [x] design.md approved by: Riya Bhattacharjee (owner), 2026-11-25
- [x] tasks.md approved by: Riya Bhattacharjee (owner), 2026-11-25
- [x] Implementation verified on: 2026-11-25 (EVAL-T15; `eval:grade` on the recorded smoke run passes the gate)
