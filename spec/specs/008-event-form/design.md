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
full-replace API writes is shown in the form, so an edit blanks nothing. It does normalise some values, accepted by
the owner on 2026-11-20 (D4, CR-20261120-1; [EVF-T06 hand-off](../../handoffs/EVF-T06.md) open questions): HTML attendee
names are saved as plain text (EVF-EDIT-003) and a stored time on `event_date` is cut to the date (EVF-EDIT-004).
Stage is also trimmed (not raised as a decision; whitespace only).

## Link rows on edit (Article II.4, constitution v1.1.1)
An edit posts the full solution and contributor id lists; the server replaces this event's own link rows
(API-WRITE-004). Article II.4 as amended by CR-20261120-1 allows exactly this, so the earlier exception is closed.

## Planned design — EVF-ADD-004
Validate `attendees`/`duration` with `/^\d+$/` when non-blank; show the message under the field; include in `missing`-style map.

## Constitution check
| Article | Compliance |
|---|---|
| II | Edits persist through the API (EVF-T06). An edit updates the event in place and replaces its own link rows (API-WRITE-004), as Article II.4 (v1.1.1) allows. ✅ |
| IV | Required fields; number validation missing. ⚠️ |
| V | Pending/success/error. ✅ |
| IX | Hooks + lib. ✅ |
| X | Edit normalisation written as EVF-EDIT-003, EVF-EDIT-004; tests named after them in EVF-T10. ⚠️ until EVF-T10 |

**Exceptions:** none. (Article II.4 was an exception until the owner's decision of 2026-11-20; closed by CR-20261120-1, API-T13.)
