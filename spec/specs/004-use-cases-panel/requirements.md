# Requirements — Use Cases Panel

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| use-cases-panel | UCP | ⚠️ Implemented · 1 partial criterion | II, III, V, VI, IX |

## Introduction
Lists the selected customer's use cases in a sortable, filterable grid (see data-grid spec) with tallies, row
expansion, multi-select for cloning, per-row clone/edit/delete, and CSV export.

---

### UCP-R1 — Header and actions
**User story:** As a CSS, I want the count, live tally and actions at a glance.

#### UCP-HEAD-001: Use case count in header
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show "Use Cases" and the number of loaded use cases.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### UCP-HEAD-002: Live tally
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show a green "N Live" tally counting statuses that contain the word "live" (`/\blive\b/i`).
- **Source:** `src/components/customers/ParentActivity.tsx`

#### UCP-HEAD-003: Add use case split button
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show an "Add use case" split button; its menu ("More ways to add use cases") SHALL offer "Add multiple use cases" and "Paste from Excel", each with a one-line description. All are disabled without a parent id.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### UCP-HEAD-004: Selection toolbar
- **Status:** ✅ Implemented
- **Criterion:** WHILE one or more rows are ticked THE header SHALL show "N selected", a "Clone to..." button and a "Clear" link.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### UCP-HEAD-005: Export button
- **Status:** ✅ Implemented
- **Criterion:** THE header SHALL show Export, disabled when there are no use cases.
- **Source:** `src/components/customers/ParentActivity.tsx`

### UCP-R2 — Grid

#### UCP-GRID-001: Grid columns and filters
- **Status:** ✅ Implemented
- **Criterion:** THE grid SHALL show, in order: Subsidiary (select filter), Department Type (select), Department Name (select), Stakeholder (text), Solution (text; "Untitled" if blank), Use Case Type (select), Content Type (text), CSS Contributor (text), Launch Date (date), Status (select, coloured pill).
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-GRID-002: Initial order and empty cells
- **Status:** ✅ Implemented
- **Criterion:** THE initial order SHALL be the server order (last modified first). Empty cells SHALL show "-" and sort last.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-GRID-003: Comma lists for multi-values
- **Status:** ✅ Implemented
- **Criterion:** Content Type and CSS Contributor SHALL be shown as comma lists (split on `;`, `|`, newlines; trimmed; blanks dropped).
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-GRID-004: Launch date sort and display
- **Status:** ✅ Implemented
- **Criterion:** Launch Date SHALL be sorted/filtered as `YYYY-MM-DD` and displayed as a short date ("Nov 11, 2026") in the user's locale **on the stored calendar day**; dates before 2000 SHALL be empty.
- **Source:** `src/lib/dates.ts`, `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

### UCP-R3 — Row behaviour

#### UCP-ROW-001: Expandable value and notes
- **Status:** ✅ Implemented
- **Criterion:** WHEN a row has a value snippet or note THE row SHALL be expandable and show "Value" and "Notes" in full (sanitised).
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-ROW-002: Row checkbox and actions
- **Status:** ✅ Implemented
- **Criterion:** EACH row SHALL have a selection checkbox (no select-all) and Clone, Edit, Delete buttons.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-ROW-003: Clone opens bulk form
- **Status:** ✅ Implemented
- **Criterion:** WHEN Clone is clicked THE bulk form SHALL open with that row as source; WHEN "Clone to..." is clicked it SHALL open with all ticked rows that still exist, in grid order.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-ROW-004: Clear selection after bulk form
- **Status:** ✅ Implemented
- **Criterion:** WHEN the bulk form closes THE selection SHALL be cleared.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

#### UCP-ROW-005: Edit opens single form
- **Status:** ✅ Implemented
- **Criterion:** WHEN Edit is clicked THE single form SHALL open in edit mode for that row.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/DataGrid.tsx`

### UCP-R4 — Delete

#### UCP-DEL-001: Confirm before delete
- **Status:** ✅ Implemented
- **Criterion:** WHEN Delete is clicked THE system SHALL ask "Delete this use case?" — "<solution or Untitled> (<subsidiary>) will be removed from this customer. This cannot be undone from the app." with Cancel / "Yes, delete".
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/ConfirmDelete.tsx`

#### UCP-DEL-002: Pending and failed delete
- **Status:** ✅ Implemented
- **Criterion:** WHILE deleting THE buttons SHALL be disabled with a spinner and the dialog SHALL stay open; IF it fails THEN "Could not delete: <message>" SHALL show in the dialog.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/ConfirmDelete.tsx`

#### UCP-DEL-003: Soft delete with toast
- **Status:** ✅ Implemented
- **Criterion:** WHEN delete succeeds THE system SHALL soft-delete the row, toast "Use case deleted", close the dialog and refresh the list.
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/components/customers/ConfirmDelete.tsx`

### UCP-R5 — Export

#### UCP-CSV-001: Export shown rows to CSV
- **Status:** ✅ Implemented
- **Criterion:** WHEN Export is clicked THE system SHALL download the rows currently shown (filters + sort) as `<Customer>_use-cases_<YYYY-MM-DD>.csv` with the 10 grid columns plus Stakeholder Title, Value and Notes (plain text), and toast "Exported N use case(s)".
- **Source:** `src/components/customers/ParentActivity.tsx`, `src/lib/csv.ts`

### UCP-R6 — States

#### UCP-STATE-001: Loading skeleton
- **Status:** ✅ Implemented
- **Criterion:** WHILE loading THE panel SHALL show four skeleton bars.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### UCP-STATE-002: Error with Try again
- **Status:** ✅ Implemented
- **Criterion:** IF loading fails THEN THE panel SHALL show the error and a "Try again" button.
- **Source:** `src/components/customers/ParentActivity.tsx`

#### UCP-STATE-003: Empty state
- **Status:** ✅ Implemented
- **Criterion:** IF there are no use cases THEN THE panel SHALL show "No use cases recorded for this customer.".
- **Source:** `src/components/customers/ParentActivity.tsx`

## Scenarios
- 12 use cases, 3 Live → "12", "3 Live".
- Filter Status = Planned, sort Launch Date, Export → CSV has only Planned rows in that order; toast with count.
- Tick 2 rows, "Clone to..." → bulk form titled "Clone 2 use cases".
- Workbook open in Excel, confirm delete → dialog stays open with "Could not delete: Could not save: … is open in Excel…".
