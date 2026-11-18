---
contract: task-handoff.v1
task: SUM-T10
agent: AGENT-IMPLEMENTER
covers: [SUM-EDIT-007]
files_changed: [src/components/customers/CustomerDetails.tsx, spec/specs/017-design-system/messages-catalog.md]
tests: [tests/component/CustomerDetails.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: SUM-T10 Remove `editedSummaries`, interim label and toast description; retire SUM-EDIT-007

## What changed
This is the clean-up from step 5 of the target design. SUM-EDIT-007 is retired by this task; its status is left for
the orchestrator to set to Deprecated.

- The module-level `editedSummaries` map, the `edited` state and the `customerKey` that indexed it have been removed
  from `CustomerDetails.tsx`. The panel now shows only `row.executive_summary`, the stored value, which reaches it
  through the refreshed row (SUM-T09).
- The "Edited (on screen only)" header label has been removed.
- The interim toast description "Shown on screen only; it is not written to the database." has been removed. The
  success toast is now just "Executive summary updated".
- In `spec/specs/017-design-system/messages-catalog.md`, only the "Summary saved" row was changed, to
  `Executive summary updated | CustomerDetails`, and its interim note was removed. This is the one spec edit the
  orchestrator allowed. The other catalog rows that `git diff` shows (use case and event "planned" markers) come from
  the parallel UCF-T07 and EVF-T06 work, not from this task.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| SUM-EDIT-007 (retired: the marker and the on-screen copy are gone) | `tests/component/CustomerDetails.test.tsx`: "SUM-EDIT-001 shows the stored summary and new Last modified from the refreshed row, with no on-screen-only copy". After a successful save it asserts no text matches `/on screen only/i` and that the panel shows the given row's summary, not the draft. |
| SUM-EDIT-007 (toast description gone) | "SUM-EDIT-005 shows the toast Executive summary updated and closes the editor when the save succeeds": `toast.success` is called with exactly `("Executive summary updated")`, with no options object. |
| Code search | `grep -rn "editedSummaries\|on screen only" src` returns nothing |

The tests are titled with the IDs that stay live (SUM-EDIT-001 and SUM-EDIT-005), not SUM-EDIT-007, because SUM-EDIT-007
is about to become Deprecated.

## Gates
Run once for SUM-T08..T11 together, on the final tree.

| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 490 requirements, 226 tasks, 0 errors (after the catalog edit) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (7 known plus 1 from SUM-T11) · typecheck: exit 0 |
| G4 | `npm test` | 13 files passed. 86 tests passed and 1 failed as expected (EXP-NAME-002 is pinned with `it.fails`). |
| G5 | manual | **Not run.** It is shared with SUM-T09 (see that hand-off). Also check that no amber "Edited (on screen only)" label ever appears in either theme. |

## Open questions
- Clean-up for the orchestrator when it closes the task. These are spec files I must not edit:
  - `003-executive-summary/design.md` still describes `editedSummaries` in the Overview and the "Current state machine".
  - Its Constitution check still has the Article II exception and the Article V "on screen only" row.
  - SUM-EDIT-005 in `requirements.md` still has the "Partial" status text that quotes the old description.
  - Gap-register line 33 quotes the old description too.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**VERDICT: pass.** Everything interim is gone: `editedSummaries`, the label, the toast description. Nothing else was removed.

Minor findings:
- [minor] Spec clean-up beyond the hand-off's list: SUM-WORD-001 still says export includes "unsaved on-screen edits"; the spec header says "⚠️ Edit is not persisted"; a scenario still says "(today: original text returns)". All are handled at close.

GATES (reviewer's own run): G1 pass (0 errors) · G3 pass (lint 0 errors, 8 warnings; typecheck 0) · G4 pass (13 files, 86 passed + 1 expected fail).

**G5:** G5 manual check reported passed by the owner on 2026-11-18 (light and dark themes, ≥ 1024px and < 1024px, every item in the hand-off list).
