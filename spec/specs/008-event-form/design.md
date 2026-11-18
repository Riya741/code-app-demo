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

## Implemented — EVF-EDIT-002 (EVF-T06, 2026-11-18)
When `row` is set, add `Id: row.id` to the payload; toast "Event updated"; remove `NOT_WIRED`. Every field the
full-replace API writes is shown in the form, so an edit blanks nothing. It does normalise some values (owner
questions): HTML attendee names are saved as plain text (EVF-EDIT-001), a stored time on `event_date` is cut to the
date, and Stage is trimmed.

## Planned design — EVF-ADD-004
Validate `attendees`/`duration` with `/^\d+$/` when non-blank; show the message under the field; include in `missing`-style map.

## Constitution check
| Article | Compliance |
|---|---|
| II | Edits persist through the API (EVF-T06). An edit replaces the event's link rows (API-WRITE-004), which conflicts with II.4. ⚠️ Exception: API-T13 |
| IV | Required fields; number validation missing. ⚠️ |
| V | Pending/success/error. ✅ |
| IX | Hooks + lib. ✅ |
