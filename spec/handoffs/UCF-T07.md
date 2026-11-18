---
contract: task-handoff.v1
task: UCF-T07
agent: AGENT-IMPLEMENTER
covers: [UCF-EDIT-002]
files_changed: [src/components/customers/UseCaseForm.tsx, src/lib/parentData.ts, spec/specs/017-design-system/messages-catalog.md, tests/component/UseCaseForm.test.tsx, tests/integration/use-case-edit.test.ts]
tests: [tests/component/UseCaseForm.test.tsx]
gates: {G1: pass, G3: pass, G4: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: UCF-T07 Save edits through the API

## What changed
When "Save changes" is submitted in the Edit use case dialog, the form now posts the full `UseCaseInput` with
`id: row.id` through the existing `useSaveUseCase` mutation (`POST /api/workbook/use-cases`, which updates by `id`).
On success it toasts "Use case updated", closes the dialog, and the hook invalidates `["useCases", parentId]`, so the
list refreshes. The `NOT_WIRED` "Editing isn't connected yet" path is removed from `UseCaseForm.tsx` (EventForm keeps
its own; not touched). The add path is unchanged: no `id`, toast "Use case added". The prop comment on `row` and the
component comment now describe editing. In `src/lib/parentData.ts` the doc comments of `saveUseCase` and `saveEvent`
now say "Adds (no id) or updates (with id) …" (comments only, no code change). In the messages catalog the
"*(planned, UCF-T07)*" marker is removed from the "Use case edit saved" row only.

Rework after review (finding [major] UCF-EDIT-002): Solution and Status are pre-filled on edit, so "Save changes" can be
clicked before the solutions lookup has answered, or after it failed. `premium_credit` was then `false` and the
full-replace write overwrote a stored `true`. Now `premium_credit` is `sol?.premium_credit ?? row?.premium_credit ??
false`: the chosen solution's flag when it is known (as UCF-ADD-002 and the design require), else on an edit the row's
stored flag. The add path is unchanged (no `row`, so still `false` when the solution is unknown).

The same `submit` change also sends the three target fields from `row` when editing; that part belongs to UCF-T08 and
is described in [UCF-T08.md](UCF-T08.md).

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| UCF-EDIT-002 | `tests/component/UseCaseForm.test.tsx`: "UCF-EDIT-002 Save changes posts the full use case with its id, toasts Use case updated, closes and refreshes the use cases" (exact posted body incl. `id: 7`; toast text rendered by a real `<Toaster />`; `onClose` called once; `invalidateQueries({ queryKey: ["useCases", 1] })`; no "Editing isn't connected yet") |
| UCF-EDIT-002 | `tests/component/UseCaseForm.test.tsx`: "UCF-EDIT-002 posts the edited values, not the original ones" |
| UCF-EDIT-002 | `tests/component/UseCaseForm.test.tsx`: "UCF-EDIT-002 keeps the stored premium_credit when Save changes is clicked before the solutions lookup has loaded" (the solutions request is held pending; the Solution field shows "Loading..." when Save changes is clicked; posted body has `premium_credit: true`) |
| UCF-EDIT-002 | `tests/component/UseCaseForm.test.tsx`: "UCF-EDIT-002 keeps the stored premium_credit when the solutions lookup has failed" (solutions request answers 500) |
| UCF-EDIT-002 | `tests/component/UseCaseForm.test.tsx`: "UCF-EDIT-002 takes premium_credit from the solution once it is known, over the row's stored flag" (row stores `false`, loaded solution has `true`; posted body has `premium_credit: true`) |

Both fallback tests were run against the code without the fallback and failed (2 failed, 5 passed), then pass with it.
After re-review, the solution-wins test was run against the swapped order `row?.premium_credit ?? sol?.premium_credit
?? false` and failed (1 failed, 7 passed), then passes with the real order. The code comment on `premium_credit` now
says the row's stored flag is used whenever the selected solution's flag is unknown (lookup loading or failed,
solution not in the list, or a blank cell); an add then sends `false`.

Regression checks of the add path in the same file (evidence for already-implemented criteria, not in this task's
Covers): "UCF-ADD-002 still posts a new use case without an id or target fields (required fields only)" and "UCF-ADD-004 still toasts Use case
added, closes and refreshes the use cases".

Test approach: only `fetch` is stubbed (`vi.stubGlobal`), answering the lookup reads and the POST; the form's hooks,
fetchers (`lookups.ts`, `parentData.ts`) and `workbookApi.ts` run for real inside a `QueryClientProvider`. The test
file polyfills `ResizeObserver` and `Element.prototype.scrollIntoView` for cmdk in jsdom (local to the file;
`tests/setup.ts` was not changed).

Also after review (minor): the `editBody()` comment in `tests/integration/use-case-edit.test.ts` now states that its
evidence depends on the exact-body assertion in the component test, and its `note`, id-list and `premium_credit`
mapping now follow the form (`note` only when non-blank, ids through `splitIds`/`idList`, the row's stored flag as the
fallback since no solutions lookup is loaded there).

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors (26 specs, 490 requirements, 230 tasks, 12 agents, 6 contracts, 5 prompts, 10 hand-offs) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 `react-refresh` warnings (the 7 known plus `CustomerDetails.tsx:17` from the parallel SUM work; none new from this task's files, the 4 in `UseCaseForm.tsx` are the existing helper exports) · typecheck: exit 0 |
| G4 | `npm test` | 13 files passed; 89 passed + 1 expected fail (EXP-NAME-002, `it.fails`). `UseCaseForm.test.tsx`: 8 of 8; `use-case-edit.test.ts`: 2 of 2 |
| G5 | manual UI check | **pending human check** (not in the `gates` map: the contract allows only pass/fail/n/a). See Open questions |

## Open questions
- G5 is pending a human check (an agent cannot run it). With `npm run dev`, open a customer, Edit a use case, change e.g. the status and the value,
  click "Save changes": the button shows a spinner and both buttons are disabled while saving, the toast reads "Use case
  updated", the dialog closes, and the grid row shows the new values without a reload. Also: an edit that fails (e.g.
  the workbook open and locked in Excel) keeps the dialog open with "Could not save: …". Check in light and dark
  themes, at ≥ 1024px and < 1024px. Add use case still toasts "Use case added". Record the result in the task.
- Messages catalog row "Edit saved (not wired)" still lists `UseCaseForm, EventForm` as its source. After this task only
  EventForm uses it (until EVF-T06). Left as is because the row is shared with EVF-T06; the orchestrator should
  update the source column (or retire the row) when closing UCF-T07 / EVF-T06.
- `design.md` Constitution check still records the Article II exception "Edit not persisted … until UCF-T07/T08 are
  done" and the "Planned design — edit save" heading. Not changed here (spec text, orchestrator's close step).

## Review
Recorded by the orchestrating session from the reviewer subagent's reports (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**Round 1: VERDICT fail.**
- [major] UCF-EDIT-002, data loss: "Save changes" was enabled before the solutions lookup resolved. With the solution unknown, the full-replace write posted `premium_credit: false` over a stored true.
- [minor] Five minors: shared catalog row; parentData comment outside the named files; UCF-T10 overlap; UCF-ADD-002 title over-claim; design and gap clean-up.

**Fix:** `premium_credit` comes from the solution and falls back to the row's stored flag when the solution's flag is unknown. Three new UCF-EDIT-002 tests cover it:
- the lookup is still pending;
- the lookup failed;
- the solution's flag wins once the solution is known.

The implementer and the reviewer each checked that these tests fail when the code is changed back (fallback removed, or order swapped). The UCF-ADD-002 title was narrowed, and `editBody()` was aligned with the form.

**Round 2: VERDICT pass.**
- [minor] The "solution wins" test was missing and the comment was inaccurate; both were fixed afterwards.
- [minor] The design needed to document the fallback; done at close.
- [minor] The hand-off task count had drifted.

No flakiness in 7 runs.

GATES: G1 pass · G3 pass (0 errors, 8 warnings, none from these files) · G4 pass (13 files, 89 passed + 1 expected fail).

**G5 pending:** the owner's manual check (in Open questions) is required before ✅.
