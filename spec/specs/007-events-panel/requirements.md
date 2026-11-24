# Requirements — Events Panel

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| events-panel | EVP | ⚠️ Implemented · 1 partial criterion | II, III, V, VI, IX |

## Introduction
Lists all events held with the selected customer's subsidiaries, with tallies, row expansion, edit/delete and CSV export.

---

### EVP-R1 — Header

#### EVP-HEAD-001: Event count in header
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show "Events" and the event count.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### EVP-HEAD-002: Completed and attendee tallies
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show a green "N Completed" tally (stage matches /complete/i) and a blue "N Attendees" tally (sum of attendee counts, blanks as 0), numbers formatted for the locale.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### EVP-HEAD-003: Add event and Export buttons
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show "Add event" (disabled without a parent id) and Export (disabled when empty).
- **Source:** `src/components/customers/ParentActivity.tsx`

### EVP-R2 — Grid

#### EVP-GRID-001: Grid columns and filters
- **Status:** ✅ Implemented
- **Criterion:** THE grid SHALL show, in order: Subsidiary (select), Solution (text), Event Type (select), # of Attendees (number range), Onsite (select Yes/No), CSS Contributor (text), Event Date (date), Stage (select, coloured pill).
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### EVP-GRID-002: Newest first order
- **Status:** ✅ Implemented
- **Criterion:** THE initial order SHALL be event date, newest first; WHEN the Event Date header is first clicked it SHALL sort descending.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### EVP-GRID-003: Show stored calendar day
- **Status:** ✅ Implemented
- **Criterion:** Event Date SHALL display the stored calendar day in every time zone; dates before 2000 SHALL be empty.
- **Source:** `src/lib/dates.ts`, `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### EVP-GRID-004: Expandable attendees and notes
- **Status:** ✅ Implemented
- **Criterion:** WHEN a row has attendee names or meeting notes THE row SHALL expand to show "Attendees" and "Meeting notes" in full (sanitised).
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### EVP-GRID-005: Edit and Delete only
- **Status:** ✅ Implemented
- **Criterion:** EACH row SHALL have Edit and Delete; there SHALL be no selection or clone.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### EVP-GRID-006: Warning banners
- **Status:** ✅ Implemented — (API returns none today)
- **Criterion:** IF the events result has warnings THEN each SHALL show as an amber banner above the grid.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

### EVP-R3 — Delete

#### EVP-DEL-001: Confirm before delete
- **Status:** ✅ Implemented
- **Criterion:** WHEN Delete is clicked THE system SHALL ask "Delete this event?" — "<type or Event> on <date> (<subsidiary>) will be removed from this customer. This cannot be undone from the app." (date and subsidiary omitted when blank).
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/ConfirmDelete.tsx`

#### EVP-DEL-002: Delete behaviour matches use cases
- **Status:** ✅ Implemented
- **Criterion:** Pending, error and success behaviour SHALL match the use cases panel; success toast "Event deleted".
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/ConfirmDelete.tsx`

### EVP-R4 — Export

#### EVP-CSV-001: Export shown rows to CSV
- **Status:** ✅ Implemented
- **Criterion:** WHEN Export is clicked THE system SHALL download the rows shown as `<Customer>_events_<YYYY-MM-DD>.csv` with the 8 columns plus Duration (min), Virtual, Attendee Names, Meeting Notes (plain text), and toast "Exported N event(s)".
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/lib/csv.ts`

### EVP-R5 — States

#### EVP-STATE-001: Loading, error and empty states
- **Status:** ✅ Implemented
- **Criterion:** Loading / error / empty states SHALL match the use cases panel; empty text "No events recorded for this customer.".
- **Source:** `src/components/customers/ParentActivity.tsx`

## Scenarios
- Stages Completed, Completed, Scheduled; attendees 5, blank, 10 → "3", "2 Completed", "15 Attendees".
- Click Event Date once → newest at top.
- # of Attendees Min 10 → only events with ≥ 10; events without a count hidden.
