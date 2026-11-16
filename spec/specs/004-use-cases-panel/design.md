# Design — Use Cases Panel

## Overview
`UseCasesPanel` (in `ParentActivity.tsx`) composes `Panel` + `ListState` + `DataGrid<UseCaseRow>` and owns dialog state.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/ParentActivity.tsx` | `UseCasesPanel`, `useCaseColumns`, `AddUseCaseMenu`, `Tally`, `Pill`, `statusPill`, `FullText`, `ListState`, `commaList`, `isoDay`, `fmtDate` |
| `src/components/customers/DataGrid.tsx` | Grid (data-grid spec) |
| `src/components/customers/ConfirmDelete.tsx` | Confirmation dialog |
| `src/components/customers/UseCaseForm.tsx`, `UseCaseBulkForm.tsx` | Dialogs |
| `src/hooks/useParentActivity.ts` | `useUseCases`, `useDeleteUseCase` |

## State
| State | Type | Purpose |
|---|---|---|
| `adding` | boolean | Single form (add) open |
| `editing` | `UseCaseRow \| null` | Single form (edit) open, keyed by row id |
| `bulk` | `{ sources, paste? } \| null` | Bulk form open |
| `picked` | `Set<string>` | Ticked row ids |
| `target` | `UseCaseRow \| null` | Row pending deletion |
| `exportRef` | `GridExport \| null` | Export function supplied by the grid |

`pickedRows = data.filter(r => picked.has(String(r.id ?? i)))` — keeps grid order and drops rows that disappeared.

## Column definition rules
Every column: `id`, `header`, `accessorFn` returning `undefined` for empty (so `sortUndefined: "last"` works),
`cell` rendering "-" via `Dash`, `meta.filter`, `meta.className` min-width.

## Date display (planned fix for UCP-GRID-004)
Replace `new Date(v).toLocaleDateString()` with parsing `YYYY-MM-DD` into a **local** date
(`new Date(y, m-1, d)`) before formatting. Shared helper in `src/lib/dates.ts`, also used by events.

## Error handling
Query errors → `ListState` error; delete errors → `ConfirmDelete` inline error; `del.reset()` before each new confirmation.

## Constitution check
| Article | Compliance |
|---|---|
| II | Delete is soft (ADR-0003). ✅ |
| III | Expanded text sanitised; CSV guarded. ✅ |
| V | All states; confirm before delete; toasts. ✅ |
| VI | Pills and tallies have dark variants; panel adapts to layout. ✅ |
| IX | Data via hooks. ✅ |

**Exceptions:** none.
