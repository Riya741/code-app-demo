# Design — Events Panel

## Overview
`EventsPanel` (in `ParentActivity.tsx`) mirrors `UseCasesPanel` without selection/clone. Data is
`EventsResult = { rows, warnings }` from `useEvents(parentId)`.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/ParentActivity.tsx` | `EventsPanel`, `eventColumns`, `AddButton` |
| `src/components/customers/EventForm.tsx` | Add/edit dialog |
| `src/hooks/useParentActivity.ts` | `useEvents`, `useDeleteEvent` |
| `src/lib/parentData.ts` | `fetchEvents`, `deleteEvent` |

## State
`adding`, `editing`, `target`, `exportRef` — same meaning as the use cases panel.

## Column notes
- Onsite accessor maps boolean → "Yes"/"No"/undefined so the select filter shows readable values.
- Event Date column sets `sortDescFirst: true`.
- Stage uses the same `statusPill` tone function as use case status.

## Planned change — EVP-GRID-003
Use the shared `formatDay` helper from `src/lib/dates.ts` (see use-cases-panel design) for the cell and the delete description.

## Planned change — warnings
`fetchEvents` always returns `warnings: []`. Either remove the mechanism (simplicity, Article VIII) or let the server
report events whose subsidiary has no parent. Decision pending → EVP-T08.

## Constitution check
| Article | Compliance |
|---|---|
| II | Soft delete. ✅ |
| III | Sanitised expansion; CSV guarded. ✅ |
| V | States, confirmation, toasts. ✅ |
| VI | Pills/tallies have dark variants. ✅ |
| VIII | Unused warnings path. ⚠️ |
| IX | Hooks + lib. ✅ |
