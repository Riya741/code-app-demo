# Design — Add / Edit Event

## Overview
`EventForm` mirrors `UseCaseForm`: controlled dialog, lookups via hooks, save via `useSaveEvent(parentId)`.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/EventForm.tsx` | Dialog, state, validation, payload |
| `src/hooks/useLookups.ts` | `useSubsidiaries`, `useSolutions`, `useEventTypes`, `usePersonnel` |
| `src/hooks/useParentActivity.ts` | `useSaveEvent` |

## Props
```ts
EventForm({ parentId: number, customerKeys: number[], existing: EventRow[], row?: EventRow, onClose })
```

## Payload mapping
| Form | `EventInput` |
|---|---|
| subsidiary[0] | `SubsidiaryId` (string; server converts) |
| eventType[0] | `EventTypeId` (number) |
| date | `EventDate` (`YYYY-MM-DD`) |
| stage | `Stage` trimmed or undefined |
| attendees / duration | `toNum()` → number or undefined |
| onsite / virtual | booleans |
| attendeeNames | trimmed or undefined |
| notes | non-blank HTML or undefined |
| solutionIds / personnel | comma string or undefined |

## Planned design — EVF-EDIT-002
When `row` is set, add `Id: row.id` to the payload; toast "Event updated"; remove `NOT_WIRED`. All event fields are
editable in the form, so the full-replace API loses nothing.

## Planned design — EVF-ADD-004
Validate `attendees`/`duration` with `/^\d+$/` when non-blank; show the message under the field; include in `missing`-style map.

## Constitution check
| Article | Compliance |
|---|---|
| II | Edit not persisted. ⚠️ Exception until EVF-T06 |
| IV | Required fields; number validation missing. ⚠️ |
| V | Pending/success/error. ✅ |
| IX | Hooks + lib. ✅ |
