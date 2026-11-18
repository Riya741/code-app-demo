---
contract: task-handoff.v1
task: SUM-T09
agent: AGENT-IMPLEMENTER
covers: [SUM-EDIT-005, SUM-EDIT-006]
files_changed: [src/components/customers/CustomerDetails.tsx, src/pages/Customers.tsx]
tests: [tests/component/CustomerDetails.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: SUM-T09 Wire Save: pending state, error message, keep draft on failure; re-pick selected row

## What changed
Save in the Executive Summary panel now writes to the workbook through `useSaveSummary` (SUM-T08). It sends
`{ id: Number(row.id), html: draft }`, using the `customer` sheet `id` that the endpoint looks up, not `parent_id`.
This follows steps 3 and 4 of the target design.

- **While the save is in progress (SUM-EDIT-006):** Save and Cancel are `disabled={mutation.isPending}`. The Save icon
  becomes a spinning `Loader2`, the same spinner `ConfirmDelete` and `EventForm` use.
- **When the save succeeds (SUM-EDIT-005):** the toast "Executive summary updated" appears with no description, and the
  editor closes.
- **When the save fails (SUM-EDIT-005):** the editor stays open with the draft. "Could not save: <message>" appears above
  the editor as a `role="alert"` line, styled like `EventForm` with `destructive` tokens. This is the catalog's
  "Form save failure" message. Retrying sends the kept draft. Cancel and opening the editor again call
  `mutation.reset()`, so an old error is not shown again.
- **Selected row refresh (SUM-EDIT-001, "refresh the customer data"):** `pages/Customers.tsx` now keeps the picked row
  snapshot as `picked`. It derives `selected` by finding the row with the same `id` in the current customers query data.
  If that row is missing, for example while the list is reloading, it falls back to the snapshot. So once the query
  refetches, `CustomerDetails`, `TopBar` and the activity panels receive the fresh row, with the stored summary and the
  new "Last modified" time. The panel `key` is still `selected.id`, so the panel is not remounted.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| SUM-EDIT-005 | `tests/component/CustomerDetails.test.tsx`: "SUM-EDIT-005 shows the toast Executive summary updated and closes the editor when the save succeeds" |
| SUM-EDIT-005 | "SUM-EDIT-005 keeps the editor open with the draft and shows Could not save: <message> when the save fails" (server 423 error text) |
| SUM-EDIT-005 | "SUM-EDIT-005 shows Could not save: <message> when the workbook service cannot be reached" (`fetch` rejects) |
| SUM-EDIT-005 | "SUM-EDIT-005 saves the kept draft on retry and clears the error message" |
| SUM-EDIT-005 | "SUM-EDIT-005 does not show an old error when the editor is opened again after Cancel" |
| SUM-EDIT-006 | "SUM-EDIT-006 disables Save and Cancel and shows a spinner while the save is in progress" (also checks that clicks while pending send no second request and do not close the editor) |
| SUM-EDIT-006 | "SUM-EDIT-006 leaves Save and Cancel enabled with no spinner when nothing is saving" |
| SUM-EDIT-005/006 | G5 manual check (see Open questions). **Not done.** |

## Gates
Run once for SUM-T08..T11 together, on the final tree.

| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 490 requirements, 226 tasks, 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (the 7 known warnings plus 1 from exporting `fmtUtc`, see SUM-T11) · typecheck: exit 0 |
| G4 | `npm test` | 13 files passed. 86 tests passed and 1 failed as expected (EXP-NAME-002 is pinned with `it.fails`). |
| G5 | manual | **Not run** (the agent cannot use a browser). It is left out of `gates` on purpose, not marked n/a. |

## Open questions
- **G5, for a human to do with `npm run dev`.** Check each item in light and dark themes, at a width of 1024px or more
  (split view) and below 1024px (stacked):
  1. Edit the summary and click Save. While the request runs, Save shows a spinning icon and Save and Cancel are
     greyed out and do not respond. The spinner is visible on the primary button in both themes.
  2. When the save succeeds, the toast "Executive summary updated" appears with no second line. The editor closes and
     shows the new text. The header "Last modified: … UTC" changes to the current UTC time, without reselecting the
     customer or reloading the page.
  3. Reload the page and select the same customer: the saved summary and timestamp are still there, so the summary
     is persisted.
  4. Force a failure, for example by opening `code-app-data.xlsx` in Excel (423) or stopping the dev server. "Could not
     save: <message>" appears above the editor in red tokens and is readable in dark mode. The draft is still in the
     editor. Save again after fixing the cause: it succeeds and the message disappears.
  5. After a failure, click Cancel and open the editor again: the old error is not shown.
  6. The "Use Cases" and "Events" panels and the top bar name/ID do not flicker or reset after the save. The panel
     `key` is unchanged, so the resizable sizes stay as they were.
- Customers without a numeric `id`: Save would send `NaN` and fail with "Could not save: …". Every row of the generated
  `customer` sheet has an `id`, so this does not happen today. Should Save be hidden or disabled when `id` is missing?
  Who answers: the spec owner (003).
- The re-pick is not covered by an automated test. A test would have to render the whole `Customers` page
  (`matchMedia`, resizable panels, search). The component test does cover the panel's side: given a refreshed row, it
  shows the new summary and time ("SUM-EDIT-001 shows the stored summary …", SUM-T11). G5 item 2 covers the rest.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**VERDICT: pass.**
- **SUM-EDIT-005:** the toast text is exact; on failure, "Could not save: <message>" appears in a `role="alert"` line and the draft is kept. Retry and Cancel→reopen are tested.
- **SUM-EDIT-006:** both buttons are disabled with a spinner while saving, and only one request is sent.

Minor findings:
- [minor] SUM-EDIT-001: the page re-pick in `Customers.tsx` has no automated test. Traced correct by the reviewer, and manual check 2 below substitutes for it until a helper exists. Tracked as **SUM-T12** (pure helper + unit test).
- [minor] G5 was not run: this is a UI change, so **the human checks listed in Open questions must be recorded before ✅.**
- [minor] `Customers.tsx` had CRLF in the working copy; `.gitattributes` normalises it to LF on commit.

GATES (reviewer's own run): G1 pass (0 errors) · G3 pass (lint 0 errors, 8 warnings; typecheck 0) · G4 pass (13 files, 86 passed + 1 expected fail).

**G5:** G5 manual check reported passed by the owner on 2026-11-18 (light and dark themes, ≥ 1024px and < 1024px, every item in the hand-off list).
