# Design — Executive Summary

## Overview
`CustomerDetails` renders the summary inside a `Panel`, swaps to a lazy `RichTextEditor` when editing, and exports via
`downloadWordDoc`. Save writes the summary through `useSaveSummary` → `saveSummary` → `POST /customers/:id/summary`
(SUM-T08..T10, 2026-11-18); the interim on-screen-only map is gone.

## Planned — the summary band (SUM-T13 with LAY-T09, CR-20261120-1)
`CustomerDetails` stays the one summary component; only its place and its `Panel` props change. `Customers.tsx`
renders it first, full width, above the Use Cases / Events split (002 design, "Planned layout tree") and passes
`collapsed` / `onToggleCollapsed`; `CustomerDetails` passes them to `Panel`'s `collapse` prop with
`disabled = editing || mutation.isPending` (LAY-BAND-007). Everything else in this design (state machine, save,
`fmtUtc`, export, sanitising) is unchanged; SUM-VIEW-005 is the requirement that says so. Export always exports the
**stored** summary (SUM-WORD-001), never an unsaved AI draft. With AI on, the band adds the AI states of
[022 design](../022-ai-account-brief/design.md) ("Band states"); with AI off it is exactly this design.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/CustomerDetails.tsx` | Panel (the summary band from LAY-T09/SUM-T13), view/edit toggle, `fmtUtc`, export |
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
The existing `tests/component/CustomerDetails.test.tsx` renders the component on its own, so it does not assert the
right-hand position and needs no change for the band; SUM-T13 adds band tests (SUM-VIEW-005, LAY-BAND-007).

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Persisted save specified before code; interim criterion SUM-EDIT-007 retired. ✅ |
| II Workbook is truth | Saves go to the workbook through the atomic, serialised API. ✅ |
| III Safe | Sanitised display and Word export. ✅ |
| V Clear feedback | Pending, success and failure states (SUM-EDIT-005/-006). ✅ |
| VI Theme-aware | Dark-mode colour adaptation; the band keeps the stone tokens in both themes and is checked at both widths (G5 in SUM-T13). ✅ |
| VII Accessible | Click/Enter to edit unchanged (A11Y-KEY-002); collapse control per LAY-BAND-006. ✅ |
| XII AI agents & data | The AI Account Brief (022) shows its draft in the band unsaved; only a user's Save writes it, through SUM-EDIT-001 (XII.3); with AI off the band is this design unchanged (XII.8). ✅ |

**Exceptions:** none. (Article II was an exception until SUM-T07..T10, 2026-11-18.)
