# Design — Executive Summary

## Overview
`CustomerDetails` renders the summary inside a `Panel`, swaps to a lazy `RichTextEditor` when editing, and exports via
`downloadWordDoc`. Save writes the summary through `useSaveSummary` → `saveSummary` → `POST /customers/:id/summary`
(SUM-T08..T10, 2026-11-18); the interim on-screen-only map is gone.

## The summary dialog (SUM-T13 with LAY-T09, LAY-T11, LAY-T12; CR-20261120-2; delivered 2026-11-20)
`CustomerDetails` stays the one summary component; only its place changes. `SummaryDialog` (002 design, "Summary
dialog design") renders it inside a modal `Dialog` that opens when a customer is selected; the component keeps its
`Panel` shell (title, Last modified / Export or Cancel / Save in the header, scrolling body), so SUM-VIEW-001..004,
the state machine below, save, `fmtUtc`, export and sanitising are unchanged; SUM-VIEW-006 is the requirement that says
so. SUM-T13 changes only its props:
- **Removed** (added by the unreleased band work in the working tree, never released): `collapsed`,
  `onToggleCollapsed` and the `collapse` pass-through to `Panel`.
- **Added:** `onSaved?()`, called once after a successful save (after the toast), which the dialog uses to close
  (LAY-DLG-009); and `onStateChange?({ editing, dirty, saving })`, called once on mount and whenever one of the three changes, which the
  dialog uses for the discard confirm and the no-close-while-saving rule (LAY-DLG-007, LAY-DLG-008). `dirty` is "the
  editor's HTML differs from the text it was opened with"; `RichTextEditor` reports only real edits, so opening and
  leaving the editor is not dirty. Without the callbacks the component behaves as it does today (it renders on its own
  in the unit tests).
- **Added:** `titleId?`, passed to `Panel.titleId` so the dialog can name itself with `aria-labelledby` (LAY-DLG-003).
- **Cancel** inside the dialog still returns to the view inside the dialog (SUM-EDIT-004); it does not close the dialog.
Export always exports the **stored** summary (SUM-WORD-001), never an unsaved AI draft. With AI on, the dialog adds the
AI states of [022 design](../022-ai-account-brief/design.md) ("Dialog states"); with AI off it is exactly this design.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/CustomerDetails.tsx` | Panel (shown inside the summary dialog from LAY-T11/SUM-T13), view/edit toggle, `fmtUtc`, export, `onSaved` / `onStateChange` |
| `src/components/customers/RichTextEditor.tsx` | Quill editor (see rich-text spec) |
| `src/lib/html.ts` | `looksLikeHtml`, `sanitizeHtml`, `RICH_TEXT_CLASS` |
| `src/lib/wordDoc.ts`, `src/lib/csv.ts` | `downloadWordDoc`, `exportFileName` |

## State machine
```
view ──click/Enter──► editing(draft) ──Save──► saving (Save/Cancel disabled, spinner)
                        │                      ├─ok────► view (toast; customers refetched; row re-picked by id)
                        │                      └─error─► editing (draft kept, "Could not save: <message>")
                        └──Cancel──► view
```

## Design for SUM-EDIT-001 (persisted save) — implemented 2026-11-18 (API-T09/SUM-T07, SUM-T08..T10)
1. **API** (workbook-api spec, API-SUMM-001): `POST /api/workbook/customers/:id/summary` body `{ executive_summary: string }`
   → sets `executive_summary` (cleaned, `""` → null) and `summary_last_modified = now()`; saves; returns
   `{ id, summary_last_modified }`. 404 if the customer does not exist.
2. **Client:** `saveSummary(id, html)` in `src/lib/customerSource.ts`; hook `useSaveSummary()` in `src/hooks/useCustomers.ts`
   that invalidates `["customers"]`.
3. **Selected row refresh:** `Customers.tsx` holds a row snapshot; after the customers query refetches, re-pick the
   selected row by `id` so the panel shows the stored summary and new timestamp.
4. **UI:** Save button uses `mutation.isPending` (spinner, disabled); on error show "Could not save: <message>" above
   the editor and keep the draft.
5. **Cleanup:** remove `editedSummaries`, the "Edited (on screen only)" label (retire SUM-EDIT-007) and the interim toast description.

## Date formatting — `fmtUtc(v)`
Zone-less timestamps get `Z` appended (space → `T`); date-only strings parsed as-is; invalid or year < 2000 → null;
output `toLocaleString("en-US", { timeZone: "UTC", … }) + " UTC"`.

## Error handling
Export has no failure mode beyond the browser download. Save errors per target design step 4.

## Testing approach
Unit: `fmtUtc`. API integration: summary endpoint (status codes, timestamp). Component: edit/cancel/save, link click does not open editor.
The first twelve tests of `tests/component/CustomerDetails.test.tsx` render the component on its own, so they do not
assert its position and stay unchanged. **Tests that must change (written in the uncommitted band work; rewritten by
SUM-T13, not weakened):** the section "The summary as the workspace's collapsible band" of that file is replaced:
- `SUM-VIEW-005 shows the view, Last modified and Export in the collapsible band, and keeps the view mounted when collapsed`
  → `SUM-VIEW-006 shows the view, Last modified and Export` (the "mounted when collapsed" half goes with the collapse);
- `SUM-VIEW-005 opens the editor inside the band, and Save and Cancel work as before with the collapse props passed`
  → `SUM-VIEW-006 opens the editor …, and Save and Cancel work as before` (without the props);
- `SUM-VIEW-005 exports the summary from the band header` → `SUM-VIEW-006 exports the summary from the header`;
- `SUM-VIEW-005 behaves as before when no collapse props are passed: no collapse control` → deleted (no such props);
- the four `LAY-BAND-007 …` tests (control enabled in view; disabled while the editor is open, enabled after Cancel;
  disabled while a save is pending; disabled after a failed save) → `LAY-DLG-008 …` / `LAY-DLG-007 …` tests that assert
  the same four situations through `onStateChange` (`saving`, `editing`, `dirty` reported correctly: false in view,
  `editing` true and `dirty` false on open, `dirty` true after an edit, `saving` true while pending and still `editing` after
  a failed save) plus `LAY-DLG-009 calls onSaved once after a successful save and not after a failed one`;
- `SUM-VIEW-001 is still titled Executive Summary and does not repeat the customer name or ID` stays as it is.
The `@/lib/wordDoc` mock the band work added stays (the export test needs it).

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Persisted save specified before code; interim criterion SUM-EDIT-007 retired. ✅ |
| II Workbook is truth | Saves go to the workbook through the atomic, serialised API. ✅ |
| III Safe | Sanitised display and Word export. ✅ |
| V Clear feedback | Pending, success and failure states (SUM-EDIT-005/-006). ✅ |
| V Clear feedback | Also the discard confirm before typed text is lost (LAY-DLG-007, V.3). ✅ |
| VI Theme-aware | Dark-mode colour adaptation; the dialog keeps the stone tokens in both themes and is checked at both widths (G5 in LAY-T11 and SUM-T13). ✅ |
| VII Accessible | Click/Enter to edit unchanged (A11Y-KEY-002); the dialog is modal, named, focus-trapped and returns focus (LAY-DLG-003..006). ✅ |
| XII AI agents & data | The AI Account Brief (022) shows its draft in the dialog unsaved; only a user's Save writes it, through SUM-EDIT-001 (XII.3); with AI off the dialog is this design unchanged (XII.8). ✅ |

**Exceptions:** none. (Article II was an exception until SUM-T07..T10, 2026-11-18.)
