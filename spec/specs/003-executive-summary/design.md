# Design — Executive Summary

## Overview
`CustomerDetails` renders the summary inside a `Panel`, swaps to a lazy `RichTextEditor` when editing, and exports via
`downloadWordDoc`. Save writes the summary through `useSaveSummary` → `saveSummary` → `POST /customers/:id/summary`
(SUM-T08..T10, 2026-11-18); the interim on-screen-only map is gone.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/CustomerDetails.tsx` | Panel, view/edit toggle, `fmtUtc`, export |
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

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Persisted save specified before code; interim criterion SUM-EDIT-007 retired. ✅ |
| II Workbook is truth | Saves go to the workbook through the atomic, serialised API. ✅ |
| III Safe | Sanitised display and Word export. ✅ |
| V Clear feedback | Pending, success and failure states (SUM-EDIT-005/-006). ✅ |
| VI Theme-aware | Dark-mode colour adaptation. ✅ |
| XII AI agents & data | The AI Account Brief (022) opens its draft in this editor unsaved; only Save writes it, through SUM-EDIT-001 (XII.3). ✅ |

**Exceptions:** none. (Article II was an exception until SUM-T07..T10, 2026-11-18.)
