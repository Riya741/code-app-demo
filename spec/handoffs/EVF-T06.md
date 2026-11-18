---
contract: task-handoff.v1
task: EVF-T06
agent: AGENT-IMPLEMENTER
covers: [EVF-EDIT-002]
files_changed: [src/components/customers/EventForm.tsx, spec/specs/017-design-system/messages-catalog.md, tests/component/EventForm.test.tsx, tests/integration/event-edit.test.ts]
tests: [tests/component/EventForm.test.tsx, tests/integration/event-edit.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: EVF-T06 Save event edits

## What changed
When "Save changes" is submitted in the Edit event dialog, the form now posts the full `EventInput` with `Id: row.id`
through `useSaveEvent` (unchanged: it invalidates `["events", parentId]`, so the events list refreshes). On success it
toasts "Event updated" and closes. The `NOT_WIRED` edit path ("Editing isn't connected yet") is removed from
`EventForm.tsx`, and the `row` prop comment no longer says saving edits is not connected. The add path is unchanged:
no `Id` is sent (`Id: undefined` is dropped by `JSON.stringify`) and it still toasts "Event added".
In the messages catalog the "*(planned, EVF-T06)*" marker is removed from the "Event edit saved" row only.

Subsidiary id: the form's `subsidiary` state starts as `String(row.subsidiary_id)`, the value the row is stored with,
and the subsidiary options are keyed by the column `detectKey` learns from the existing rows (`id` or the alternate
`subsidiary_id`). An unchanged edit therefore posts the stored id under either key; both cases are tested.

Full-replace check (`saveEvent` in `server/workbook.ts`): the server overwrites `subsidiary_id, event_type_id,
event_date, stage, attendee_count, attendee_names, meeting_notes, duration, onsite, virtual, deleted, last_modified`
and replaces the `event_personnel` / `event_solution` links. The fixture's `event` sheet columns are `id, event_id,
attendee_count, attendee_names, meeting_notes, event_date, event_type_id, stage, onsite, virtual, duration,
subsidiary_id, deleted, created, last_modified`. Every overwritten field is shown and posted by the form; `id`,
`event_id` and `created` are kept by the server, and `Object.assign` leaves any column outside that list untouched.
So no stored field is erased by an edit, which matches design.md. The second integration test proves it: an unchanged
Save changes leaves every stored column of the event the same except `last_modified`. See the open questions for two
value normalisations that can still change a stored value.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| EVF-EDIT-002 | `tests/component/EventForm.test.tsx`: "EVF-EDIT-002 Save changes posts the full event with its Id, toasts Event updated, closes and refreshes the events" (exact posted body, toast text, `onClose` once, `invalidateQueries({ queryKey: ["events", 1] })`, no "Event added" / "Editing isn't connected yet") |
| EVF-EDIT-002 | `tests/component/EventForm.test.tsx`: "EVF-EDIT-002 posts the edited values, not the original ones" (event type, contributor, stage, date, Virtual changed) |
| EVF-EDIT-002 | `tests/component/EventForm.test.tsx`: "EVF-EDIT-002 posts the subsidiary id the row is stored with when rows use the alternate subsidiary_id key" |
| EVF-EDIT-002 | `tests/integration/event-edit.test.ts`: "EVF-EDIT-002 round trip: an edit posted as the form builds it updates the event in the file, keeps its Id and replaces its links" (read back through a new plugin from the saved file; `id`, `event_id`, `created` unchanged; no new event row; solution and contributor link rows equal what was posted) |
| EVF-EDIT-002 | `tests/integration/event-edit.test.ts`: "EVF-EDIT-002 an unchanged Save changes keeps every stored value of the event (the full replace loses nothing)" |
| EVF-ADD-003 (regression, not covered by this task) | `tests/component/EventForm.test.tsx`: "EVF-ADD-003 still posts a new event without an Id, toasts Event added, closes and refreshes the events" |

The component tests stub `fetch` only (network boundary), as in `tests/component/UseCaseForm.test.tsx`. The form's
hooks, fetchers and the workbook client run for real, and the toasts are read from a rendered sonner `<Toaster />`.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors (26 specs, 490 requirements, 226 tasks, 12 agents, 6 contracts, 5 prompts, 10 hand-offs) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (all `react-refresh/only-export-components`); the 8th is `src/components/customers/CustomerDetails.tsx:17` (`export function fmtUtc`), from the parallel SUM work, not this task. `npx eslint` on the three EVF-T06 code/test files: 0 problems. Typecheck exit 0. |
| G4 | `npm test` | 13 files passed; 86 passed + 1 expected fail (87). EVF-T06 adds 4 component tests and 2 integration tests. |
| G5 | manual | n/a for the agent: not done, see open questions |

## Open questions
- **G5 manual check (a human must do it)**, light and dark themes, at ≥ 1024px and < 1024px: open a customer with
  events, choose Edit on an event; change Stage, the event type, a solution and a contributor; press Save changes.
  Expect the spinner on the button while saving, then the "Event updated" toast, the dialog closing, and the events
  list showing the new values (same row, not a new one; solution and contributor names updated). Re-open Edit and
  check the values persisted. Also: Save changes with nothing changed shows "Event updated" and nothing in the row
  changes; Add event still shows "Event added"; with the workbook open in Excel, Save changes shows "Could not save:
  …" in the dialog and the dialog stays open.
- Value normalisation on edit (not fixed, outside the task): (1) `attendee_names` that hold HTML are shown as plain
  text (EVF-EDIT-001) and are saved back as that plain text, so HTML formatting in that field is lost on the first edit;
  (2) an `event_date` stored with a time part is saved as `YYYY-MM-DD` (the form and the server both cut it to the
  date). The fixture holds neither case. Product owner: acceptable, or a requirement?
- `spec/specs/017-design-system/messages-catalog.md` row "Edit saved (not wired) *(to be retired by UCF-T07 and
  EVF-T06)*" still lists `EventForm` as a source. EventForm no longer uses it. Left as is because UCF-T07 shares the
  row; the orchestrator should retire or narrow it when closing.
- `src/lib/parentData.ts` doc comment on `saveEvent` still says "Adds an event (no `Id`)". Not edited (owned by the
  UCF implementer); it should say it adds, or updates when `Id` is set.
- `spec/specs/008-event-form/design.md` Constitution check, Article II "Edit not persisted. ⚠️ Exception until
  EVF-T06", and the EVF-EDIT-002 status are for the orchestrator to update at close.
- EVF-T09 ("Component tests: required, add, edit save") overlaps: the EVF-EDIT-002 and EVF-ADD-003 component tests here
  can count toward it.
- Saves are last-write-wins (no check of `last_modified`); out of scope for EVF-EDIT-002.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**VERDICT: pass.** Checked and correct:
- The subsidiary id posted on edit is the stored one under both id keys, and both cases are tested.
- Every column `saveEvent` overwrites is shown and posted, so nothing is blanked.
- The component tests assert the criterion: exact body with `Id`, the rendered "Event updated" toast, close, and the `["events", 1]` invalidation.
- Layering and scope are clean.

Minor findings:
- [minor] The add-path test titled EVF-ADD-003 covers only the success path, not the pending state or the failure path. EVF-T09 must not count it as full evidence.
- [minor] design.md's "the full-replace API loses nothing" needs qualifying:
  - HTML attendee names become plain text (EVF-EDIT-001);
  - a stored time on `event_date` is cut to the date;
  - Stage is trimmed.

  Spec questions for the owner; updated at close.
- [minor] `editBody()` in the integration test is an approximate copy of the form's mapping. It is sound together with the component test's exact-body assertion.
- [minor] **Article II.4 vs API-WRITE-004.** Editing now physically replaces `event_personnel` / `event_solution` link rows (UCF-T07 does the same for use cases). The constitution says link rows are never destroyed by the app. Recorded as a Constitution exception with exit task **API-T13** (owner decision).
- [minor] Article II.4: an edit to a row soft-deleted elsewhere brings it back (`Deleted: false`). Tracked as **API-T12**.
- [minor] The catalog row "Edit saved (not wired)" is retired at close. Hand-off open question 4 is out of date: the parentData comment is correct now.

GATES (reviewer's own run): G1 pass · G3 pass (0 errors, 8 warnings, none in EventForm) · G4 pass (13 files, 88 passed + 1 expected fail, run 3 times; EVF files 6/6 each time). G5 pending a human check.
