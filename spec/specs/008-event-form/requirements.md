# Requirements — Add / Edit Event

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| event-form | EVF | ⚠️ Add and edit saved (2026-11-18) · number validation and Stage list open | II, IV, V, IX |

## Introduction
A dialog to log an event with one of the customer's subsidiaries, or to edit an existing event.

---

### EVF-R1 — Fields

#### EVF-FIELD-001: Form fields
- **Status:** ✅ Implemented
- **Criterion:** THE form SHALL show: Subsidiary*, Event type*, Event date*, Stage (free text with suggestions, "e.g. Completed"), Solution (multi), CSS contributor (multi), # of attendees (number ≥ 0), Duration (min) (number ≥ 0), Onsite and Virtual checkboxes, Attendee names (textarea), Meeting notes (rich text, "Click to add meeting notes...").
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/lookups.ts`

#### EVF-FIELD-002: Stage suggestions
- **Status:** ✅ Implemented
- **Criterion:** THE Stage suggestions SHALL be the distinct stages of the customer's existing events.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/lookups.ts`

#### EVF-FIELD-003: Subsidiary key from events
- **Status:** ✅ Implemented
- **Criterion:** Subsidiary option values SHALL use the key detected from existing events.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/lookups.ts`

### EVF-R2 — Add

#### EVF-ADD-001: Required field validation
- **Status:** ✅ Implemented
- **Criterion:** WHEN submitted with a required field empty THE system SHALL show "Required" and send nothing.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/parentData.ts`

#### EVF-ADD-002: Post EventInput
- **Status:** ✅ Implemented
- **Criterion:** WHEN submitted valid THE system SHALL post `EventInput` (PascalCase): SubsidiaryId, EventTypeId, EventDate, Stage, AttendeeCount, Duration, Onsite, Virtual, AttendeeNames, MeetingNotes, SolutionIds, PersonnelIds, Deleted=false; blanks omitted.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/parentData.ts`

#### EVF-ADD-003: Saving, success and failure
- **Status:** ✅ Implemented
- **Criterion:** Saving, success ("Event added", close, refresh) and failure ("Could not save: <message>") SHALL behave like the use case form.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/parentData.ts`

#### EVF-ADD-004: Validate whole numbers
- **Status:** ❌ Gap
- **Criterion:** IF # of attendees or Duration is negative or not a whole number THEN THE system SHALL show "Enter a whole number, 0 or more" and send nothing.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/parentData.ts`

#### EVF-ADD-005: Stage from an agreed list
- **Status:** 📝 Planned — Open question — free text today
- **Criterion:** THE Stage SHALL be chosen from an agreed list.
- **Source:** `src/components/customers/EventForm.tsx`, `src/lib/parentData.ts`

### EVF-R3 — Edit

#### EVF-EDIT-001: Edit dialog pre-filled
- **Status:** ✅ Implemented
- **Criterion:** WHEN Edit is opened THE dialog SHALL be "Edit event", pre-filled (contributor and solution ids, date, plain attendee names, HTML notes), button "Save changes".
- **Source:** `src/components/customers/EventForm.tsx`

#### EVF-EDIT-002: Save event edits
- **Status:** ✅ Implemented
- **Criterion:** WHEN "Save changes" is submitted THE system SHALL post the full `EventInput` with `Id`, toast "Event updated", close and refresh.
- **Source:** `src/components/customers/EventForm.tsx`

### EVF-R4 — Values an edit normalises (accepted by the owner, D4, CR-20261120-1)

#### EVF-EDIT-003: Attendee names saved as plain text on edit
- **Status:** ⚠️ Partial — implemented (`plain()` on load, trimmed text on save); no test names it yet (EVF-T10)
- **Criterion:** WHEN an event whose `attendee_names` holds HTML is edited THE form SHALL show the names as plain text and "Save changes" SHALL write that plain text, so HTML formatting in the field is not kept after the first edit.
- **Source:** `src/components/customers/EventForm.tsx`

#### EVF-EDIT-004: Event date saved as a calendar date on edit
- **Status:** ✅ Implemented — the form and the server both keep the first 10 characters; evidence: `tests/component/EventForm.test.tsx` "EVF-EDIT-002 Save changes posts the full event with its Id, …" (row `2026-03-05T00:00:00`, posted `2026-03-05`); EVF-T10 adds a test named after this ID
- **Criterion:** WHEN an event whose `event_date` is stored with a time part is edited and saved THE system SHALL write the date as `YYYY-MM-DD`.
- **Source:** `src/components/customers/EventForm.tsx`, `server/workbook.ts`

## Open questions
1. Fixed Stage list (Scheduled / Completed / Cancelled …)?
2. Are Onsite and Virtual mutually exclusive, or can an event be hybrid?
3. Is Duration required for Completed events?

## Scenarios
- Event type and date but no subsidiary → "Required" under Subsidiary.
- Valid input with two solutions → "Event added", row shows both solution names.
- Existing stages Completed, Scheduled → both offered as suggestions.
- Edit an event whose attendee names are `<p>Ann Fox</p>` → the textarea shows `Ann Fox`; Save changes stores `Ann Fox` (EVF-EDIT-003).
- Edit an event dated `2026-03-05T00:00:00` → stored as `2026-03-05` (EVF-EDIT-004).
