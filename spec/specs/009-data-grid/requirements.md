# Requirements — Data Grid (shared)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| data-grid | GRID | ⚠️ Implemented · keyboard expansion missing | V, VI, VII |

## Introduction
A generic sortable, filterable, expandable table used by the Use Cases and Events panels.

---

### GRID-R1 — Sorting

#### GRID-SORT-001: Sort cycle
- **Status:** ✅ Implemented
- **Criterion:** WHEN a sortable header is clicked THE column SHALL cycle ascending → descending → none (descending first where configured); one column at a time.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-SORT-002: Sort arrow and aria-sort
- **Status:** ✅ Implemented
- **Criterion:** THE sorted header SHALL show an arrow and `aria-sort`.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-SORT-003: Empty values sort last
- **Status:** ✅ Implemented
- **Criterion:** Empty values SHALL always sort last.
- **Source:** `src/components/customers/DataGrid.tsx`

### GRID-R2 — Filtering
**User story:** As a CSS, I want Excel-like column filters so I can narrow a long list.

#### GRID-FILT-001: Filter funnel and popover
- **Status:** ✅ Implemented
- **Criterion:** Filterable headers SHALL show a funnel ("Filter <Header>"), highlighted when active, opening "Filter: <Header>" with "Clear" when active.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-002: Select filter
- **Status:** ✅ Implemented
- **Criterion:** **Select** filter: tick-list of distinct values from rows passing the other filters, with counts; ticked values stay listed; "(blank)" last; "Search values..." when > 8 values; any-of matching.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-003: Text filter
- **Status:** ✅ Implemented
- **Criterion:** **Text** filter: "Contains...", case-insensitive substring.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-004: Number filter
- **Status:** ✅ Implemented
- **Criterion:** **Number** filter: Min/Max inclusive; rows without a value excluded once a bound is set.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-005: Date filter
- **Status:** ✅ Implemented
- **Criterion:** **Date** filter: From/To inclusive on `YYYY-MM-DD`; rows without a date excluded once a bound is set.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-006: Combine filters with AND
- **Status:** ✅ Implemented
- **Criterion:** Filters on different columns SHALL combine with AND; an emptied filter SHALL be removed.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-007: Clear filters strip
- **Status:** ✅ Implemented
- **Criterion:** WHILE any filter is active a sticky "Clear filters" strip SHALL appear above the header.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-008: No rows match message
- **Status:** ✅ Implemented
- **Criterion:** IF filters hide every row THEN "No rows match the current filters. Clear filters" SHALL show.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-FILT-009: Reset state on customer change
- **Status:** ✅ Implemented
- **Criterion:** Filter and sort state SHALL reset when the customer changes or the page reloads.
- **Source:** `src/components/customers/DataGrid.tsx`

### GRID-R3 — Rows

#### GRID-ROW-001: One expanded row at a time
- **Status:** ✅ Implemented
- **Criterion:** WHEN an expandable row is clicked THE detail SHALL toggle below it; only one row SHALL be open at a time.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-ROW-002: Actions do not toggle expansion
- **Status:** ✅ Implemented
- **Criterion:** Clicks on actions or checkboxes SHALL NOT toggle expansion.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-ROW-003: Row action buttons
- **Status:** ✅ Implemented
- **Criterion:** Action buttons SHALL be Clone ("Clone row"), Edit ("Edit row"), Delete ("Delete row", red), each with a tooltip.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-ROW-004: Row tint, hover and sticky header
- **Status:** ✅ Implemented
- **Criterion:** Selected/expanded rows SHALL be tinted; rows highlight on hover; header is sticky.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-ROW-005: No select-all
- **Status:** ✅ Implemented
- **Criterion:** There SHALL be no select-all checkbox.
- **Source:** `src/components/customers/DataGrid.tsx`

#### GRID-ROW-006: Keyboard row expansion
- **Status:** ❌ Gap
- **Criterion:** Expandable rows SHALL be operable by keyboard (focusable toggle with `aria-expanded`).
- **Source:** `src/components/customers/DataGrid.tsx`

### GRID-R4 — Export

#### GRID-CSV-001: Export visible columns and rows
- **Status:** ✅ Implemented
- **Criterion:** THE export function SHALL write visible columns (accessor values) plus export-only extras for the rows shown, in current order, and return the row count.
- **Source:** `src/components/customers/DataGrid.tsx`, `src/lib/csv.ts`

## Scenarios
- Status filter = Live → Subsidiary filter lists only subsidiaries with Live rows, with Live counts.
- Launch Date From 2026-01-01 → rows without a launch date hidden.
- Two filters, click "Clear filters" → all rows; funnels inactive.
