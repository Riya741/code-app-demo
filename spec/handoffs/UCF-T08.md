---
contract: task-handoff.v1
task: UCF-T08
agent: AGENT-IMPLEMENTER
covers: [UCF-EDIT-004]
files_changed: [src/components/customers/UseCaseForm.tsx, tests/component/UseCaseForm.test.tsx, tests/integration/use-case-edit.test.ts]
tests: [tests/component/UseCaseForm.test.tsx, tests/integration/use-case-edit.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: UCF-T08 Preserve hidden fields on edit

## What changed
When saving an edit, `UseCaseForm` now sends the row's current `target_users`, `target_credits_consumed` and
`target_api_calls` (taken from `row`, which the form already receives) together with `id`, so the full-replace
`saveUseCase` in `server/workbook.ts` writes them back unchanged instead of clearing them. The add path sends no
targets (UCF-ADD-007 unchanged: the form still does not show them). One spread in `submit` adds `id` and the three
targets only when `row` is set.

Check of other hidden fields: `saveUseCase` assigns only these columns from the body: `parent_id`, `subsidiary_id`,
`department_id`, `stakeholder_id`, `solution_id`, `status_id`, `use_case_type_id`, the three targets,
`expected_launch_date`, `note`, `value_snippet`, `premium_credit`, `deleted`, `last_modified`; and it replaces the
personnel and content type links. Every other `use_case` column (`created`, `jsp`, `jsp_link`, `uc_in_jsp`, `dr_id`,
`jira_id`, `photography_type_id`, the `fde_*` columns, `adoption_criteria`, `engaged_success_criteria`,
`blocker_names`, `current_solution_names`) is kept, because the row is updated with `Object.assign`. Of the assigned
fields, the form now sends all from its state or from `row`, except the cases listed under Open questions.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| UCF-EDIT-004 | `tests/component/UseCaseForm.test.tsx`: "UCF-EDIT-004 sends the row's current target_users, target_credits_consumed and target_api_calls when saving an edit" (and the exact body asserted in "UCF-EDIT-002 Save changes posts the full use case …") |
| UCF-EDIT-004 | `tests/integration/use-case-edit.test.ts`: "UCF-EDIT-004 an edit saved the way the form sends it leaves target_users, target_credits_consumed and target_api_calls unchanged in the file" (save with targets, read the row via `GET /use-cases`, post the edit body, re-read the file with `reopen()`: targets unchanged, the edited value saved) |
| UCF-EDIT-004 | `tests/integration/use-case-edit.test.ts`: "UCF-EDIT-004 an edit body without the targets would erase them (the full-replace behaviour the form guards against)" |

The integration test builds the edit body with a local `editBody()` that mirrors `submit` in `UseCaseForm.tsx` (the
form's mapping is not a separate function). The component test pins the shape the form really posts. Task step
"verify the round trip in Excel" is covered by the harness re-reading the saved `.xlsx` with a fresh plugin; no real
Excel was opened.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors (26 specs, 490 requirements, 226 tasks, 12 agents, 6 contracts, 5 prompts, hand-offs) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 `react-refresh` warnings (the 7 known plus `CustomerDetails.tsx:17` from the parallel SUM work; none new from this task's files, the 4 in `UseCaseForm.tsx` are the existing helper exports) · typecheck: exit 0 |
| G4 | `npm test` | 13 files passed; 86 passed + 1 expected fail (EXP-NAME-002). `use-case-edit.test.ts`: 2 of 2 |

## Open questions
- `premium_credit` is not taken from the row: the form recomputes it from the selected solution
  (`sol?.premium_credit ?? false`). If the solutions lookup has not loaded or failed when "Save changes" is clicked, an
  edit writes `false` over a stored `true`; a row whose flag differs from its solution's is also overwritten. Not fixed
  (outside UCF-EDIT-004). Product owner / spec author: should edit keep `row.premium_credit` unless the solution changes?
- `value_snippet` is shown as plain text (UCF-EDIT-001 by design), so saving an edit stores the plain text and drops any
  HTML formatting a value had. Per spec today, but it is a silent change on any edit. Confirm this is intended.
- `expected_launch_date` is cut to `YYYY-MM-DD` on open; a stored time part would be dropped on save. The fixture stores
  dates only, so no loss there.
- G5 manual check (human): edit a use case that has target values (visible in an exported CSV or the workbook), save,
  and check the targets are unchanged; light and dark, ≥ 1024px and < 1024px (no visual change in this task).

## Review
Recorded by the orchestrating session from the reviewer subagent's reports (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**VERDICT: pass.** UCF-EDIT-004 is proven by two tests together:
- the component test's exact posted body includes `id` and the three targets;
- the integration test re-reads the saved file and shows the targets unchanged.

Minor findings:
- [minor] `editBody()` in the integration test is a hand copy of the form's mapping; its comment now states that it depends on the component test's exact-body assertion.
- [minor] The "an edit body without the targets would erase them" test documents the API's full-replace behaviour (spec 014) rather than proving UCF-EDIT-004. It is kept as the reason for the guard.
- [minor] The task step "verify in Excel" was replaced by re-reading the file through the harness.
- [minor] Spec questions for the owner (shared with UCF-T07): an edit saves `value_snippet` HTML as plain text and `expected_launch_date` as a date only. The premium_credit question is resolved by UCF-T07's fallback except when a row's flag differs from its known solution's.

GATES: G1 pass · G3 pass (0 errors, 8 warnings) · G4 pass (13 files, 86 passed + 1 expected fail at review time). G5 n/a: no visual change.
