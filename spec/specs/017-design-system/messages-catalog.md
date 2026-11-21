# User-Facing Messages Catalog

Every string a user can see as feedback. Change wording here first, then in code. Keep the tone short, plain and actionable.

## 1. Toasts

| Trigger | Type | Text (title — description) | Source |
|---|---|---|---|
| Use case added | success | Use case added | UseCaseForm |
| Event added | success | Event added | EventForm |
| Use case edit saved | success | Use case updated | UseCaseForm (UCF-EDIT-002) |
| Event edit saved | success | Event updated | EventForm (EVF-EDIT-002) |
| ~~Edit saved (not wired)~~ | ~~info~~ | ~~Editing isn't connected yet — This is a preview of the edit form; your changes were not saved.~~ | Retired 2026-11-18 (UCF-T07, EVF-T06) |
| Use case deleted | success | Use case deleted | UseCasesPanel |
| Event deleted | success | Event deleted | EventsPanel |
| Use cases exported | success | Exported N use case / use cases | UseCasesPanel |
| Events exported | success | Exported N event / events | EventsPanel |
| Summary saved | success | Executive summary updated | CustomerDetails |
| Summary exported | success | Executive summary exported | CustomerDetails |
| Bulk all saved | success | N use case(s) created | UseCaseBulkForm |
| Bulk partial | error | S of N created — The rows that did not save are still in the table. | UseCaseBulkForm |
| Paste unmatched | warning | N name(s) didn't match and were left blank — Choose them in the table. | UseCaseBulkForm |
| No departments | info | That subsidiary has no departments | UseCaseBulkForm |
| Department load failed | error | Could not load departments — <message> | UseCaseBulkForm |

## 2. Inline messages

| Where | Text |
|---|---|
| Required field | Required |
| Form save failure | Could not save: <message> |
| Delete failure | Could not delete: <message> |
| Bulk lookup failure | Could not load some lists: <message> |
| Bulk failed rows | N row(s) could not be saved. Hover "Not saved" on a row to see why, then try again. |
| Panel load error | <message> + [Try again] |
| Search load error | <message> + [Try again] |
| Empty use cases | No use cases recorded for this customer. |
| Empty events | No events recorded for this customer. |
| Empty summary | No executive summary yet. Click to add one. |
| No search matches | No customers match "<query>" / Check the spelling or try a shorter name. |
| Filters hide all | No rows match the current filters. [Clear filters] |
| Bulk table empty | No rows yet. Add a row below. |
| Editor loading | Loading editor... |

## 3. Service / API errors (shown via the messages above)

| Source | Text |
|---|---|
| Client, network | Could not reach the workbook service. Start the app with `npm run dev`. |
| Client, non-JSON | The workbook service is not available here. It only runs with `npm run dev` / `npm run preview`. |
| Client, generic | The workbook request failed (<status>). |
| Client, no id | This use case has no id. / This event has no id. |
| Server 400 | Missing: <fields> · The request body is not valid JSON. · parentId is required. · executive_summary must be a string. *(API-SUMM-002; an absent field or a non-object body uses "Missing: executive_summary")* |
| Server 404 | The workbook has no "<name>" sheet. · Use case <id> was not found. · Event <id> was not found. · Customer <id> was not found. · This use case could not be found. · This event could not be found. · Unknown workbook request: <METHOD> <path> |
| Server 409 | This use case was already deleted. / This event was already deleted. |
| Server 423 | Could not save: <file> is open in Excel. Close it and try again. |
| Server 500 | Workbook not found: <path> · or the raw error message |

## 4. Placeholders and hints (forms)

| Field | Text |
|---|---|
| Hero search / bar search / loading | Search Parent · Search another parent... · Loading parents... |
| Combobox default / search | Select... · Search... |
| Dependent pick-lists | Choose a subsidiary first · Choose a department first · Choose a solution first (bulk: Pick a subsidiary / Pick a department / Pick a solution / None) |
| Value | Short value statement |
| Notes / meeting notes | Click to add notes... · Click to add meeting notes... |
| Stage | e.g. Completed |
| Multi-select hint | (one or more) |
| Dialog description | Fields marked * are required. |
| Bulk fill pickers | Leave as is |

## 5. AI Account Brief (planned, spec 022)

Specified by CR-20261117-1 and changed by CR-20261120-1 (automatic draft and *Regenerate with AI*) and
CR-20261120-2 (shown in the summary dialog and on the reopen button instead of a band); not in the app yet. `<id>` is
the first 6 characters of the run ID (AOPS-OBS-005).

| Trigger | Where | Text | Requirement |
|---|---|---|---|
| ~~AI available~~ | ~~Summary header button~~ | ~~Draft with AI~~ | Retired 2026-11-20 (CR-20261120-1; AIB-GEN-002 Deprecated), replaced by "Regenerate with AI" |
| AI enabled | Summary dialog header button | Regenerate with AI | AIB-GEN-017 |
| Automatic draft running | Summary dialog body, above the progress | No executive summary yet. Drafting one with AI… | AIB-GEN-021 |
| Run progress | Summary dialog, `aria-live`, with [Cancel] | Reading records… · Analysing… · Writing… · Checking (revision n)… | AIB-GEN-018 |
| Unsaved edits | Confirm dialog | Replace your unsaved changes with an AI draft? [Replace] [Keep editing] | AIB-GEN-011 |
| Run failed | Summary dialog, inline, with [Try again] | Could not draft the summary: <reason> (run <id>) | AIB-GEN-004 |
| Breaker open | *Regenerate with AI* tooltip | AI is temporarily unavailable. Try again in a few minutes. | AIB-GEN-012 |
| ~~Draft ready~~ | ~~Editor banner~~ | ~~AI draft, not saved. Check it, then Save or Cancel.~~ | Retired 2026-11-20 (CR-20261120-1; AIB-HUMAN-001 Deprecated) |
| Draft ready | Summary dialog label, with [Save] [Edit] [Discard] | AI draft — not saved. Check it, then Save, Edit or Discard. | AIB-HUMAN-009 |
| Draft being edited | Editor label | AI draft — not saved. Check it, then Save or Cancel. | AIB-HUMAN-006 |
| ~~Draft waiting, band collapsed~~ | ~~Band header badge~~ | ~~AI draft — not saved~~ | Retired 2026-11-20 (CR-20261120-2; AIB-HUMAN-008 Deprecated), replaced by the two reopen-button rows below |
| Run in progress, dialog closed | Reopen button indicator: title and accessible description | AI is drafting the summary… | AIB-HUMAN-011 |
| Draft waiting, dialog closed | Reopen button badge: title, accessible description and polite live announcement | AI draft ready — not saved | AIB-HUMAN-011 |
| Unverified draft | Dialog and editor banner + list | Unverified draft: check the points below before saving | AIB-HUMAN-012 |
| Server: AI off | API 503 | AI is not enabled | AIB-API-001 |
| Server: refusal | Run error reason | The model declined this request | AOPS-FAIL-004 |
| Server: budget | Run error reason | Budget exceeded | AOPS-BUDG-001 |
| Server: final check | Run error reason | Draft did not pass the final check | AIB-SAFE-002 |

Saving an AI draft uses the summary messages above: toast "Executive summary updated", inline "Could not save: <message>".

## 6. Summary dialog (planned, CR-20261120-2)

Replaces the "summary band" controls of CR-20261120-1, which never shipped. Saving uses the existing toast "Executive
summary updated" and the inline "Could not save: <message>" (§1, §2); an AI draft's messages are in §5.

| Control | Where | Text | Requirement |
|---|---|---|---|
| ~~Collapse control, band expanded~~ | ~~Band header button, accessible name~~ | ~~Collapse executive summary~~ | Retired 2026-11-20 (CR-20261120-2; LAY-BAND-006 Deprecated) |
| ~~Collapse control, band collapsed~~ | ~~Band header button, accessible name~~ | ~~Expand executive summary~~ | Retired 2026-11-20 (CR-20261120-2; LAY-BAND-006 Deprecated) |
| Dialog title and accessible name | Summary dialog, visible title, `aria-labelledby` | Executive Summary | LAY-DLG-003, SUM-VIEW-001 |
| Close button | Summary dialog ×, accessible name (the shared `Dialog`'s own) | Close | LAY-DLG-005 |
| Reopen button | Top bar, visible label from 640px and accessible name always | Executive summary | LAY-DLG-010 |
| Discard confirm, title | Confirm dialog over the summary dialog | Discard your unsaved summary changes? | LAY-DLG-007 |
| Discard confirm, description | Confirm dialog | Your changes to the executive summary have not been saved. | LAY-DLG-007 |
| Discard confirm, actions | Confirm dialog buttons | Discard · Keep editing | LAY-DLG-007 |
