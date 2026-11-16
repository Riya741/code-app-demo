# Requirements — Bulk Use Cases (Add Multiple, Clone, Paste from Excel)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| use-case-bulk | UCB | ✅ Implemented · 1 known limitation | II, IV, V, XI |

## Introduction
A wide dialog where each table row becomes one new use case. It supports adding many from scratch, cloning one or
more existing use cases, filling values into every row, generating a row per department, and pasting lines from Excel.

| Entry point | Title | Initial rows |
|---|---|---|
| Add ▾ → Add multiple use cases | "Add multiple use cases" | 2 blank |
| Add ▾ → Paste from Excel | "Add multiple use cases" (paste box open) | 2 blank |
| Row Clone | "Clone use case" | 1 from source |
| Clone to... (N ticked) | "Clone N use cases" | 1 per source |

---

### UCB-R1 — Clone existing use cases
**User story:** As a CSS, I want to copy use cases to other subsidiaries or departments without retyping them.

#### UCB-CLONE-001: List clone sources
- **Status:** ✅ Implemented
- **Criterion:** WHEN cloning THE dialog SHALL list up to 3 sources ("Solution / Type" over "Subsidiary / Department") and "+N more", and explain that copies start Planned, the launch date is cleared and the stakeholder is not copied.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-CLONE-002: Copy fields from source
- **Status:** ✅ Implemented
- **Criterion:** EACH cloned row SHALL copy solution, use case type, content types, contributors, value (plain text) and note; subsidiary, department, stakeholder and launch date SHALL start empty.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-CLONE-003: Match department by name
- **Status:** ✅ Implemented
- **Criterion:** WHEN a cloned row gets a subsidiary and its departments load THE system SHALL select the department with the source's department name (case-insensitive), once per subsidiary choice.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-CLONE-004: Default planned status
- **Status:** ✅ Implemented
- **Criterion:** WHEN statuses load THE cloned row's status SHALL be set to the solution's status matching /planned/i, else its first status by `sort_order`.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

### UCB-R2 — Fill all rows

#### UCB-FILL-001: Set on all rows bar
- **Status:** ✅ Implemented
- **Criterion:** THE dialog SHALL offer a "Set on all rows" bar: Subsidiary, Solution, Status (by name), Launch date, "Only fill empty cells" (default on) and "Apply to N rows".
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-FILL-002: Apply order of fill
- **Status:** ✅ Implemented
- **Criterion:** WHEN Apply is clicked THE system SHALL set per row, in order, solution → subsidiary → status (only if the row's solution has a status of that name) → launch date, respecting "only empty".
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

### UCB-R3 — Edit rows

#### UCB-ROWS-001: Row fields and actions
- **Status:** ✅ Implemented
- **Criterion:** EACH row SHALL have Subsidiary*, Department, Stakeholder, Solution*, Use case type, Status*, Launch date, a check pill, Duplicate and Remove; with the same cascades as the single form.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-ROWS-002: Keep type and status on solution change
- **Status:** ✅ Implemented
- **Criterion:** WHEN a row's solution changes THE row SHALL keep its type and status if the new solution has ones with the same names, else clear them.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-ROWS-003: Add row copies template
- **Status:** ✅ Implemented
- **Criterion:** WHEN "Add row" is clicked THE system SHALL append a row copying solution, type, status, launch, department hint and details from the first pending row (no subsidiary and no department) or else the last row, and scroll it into view.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-ROWS-004: Rows for every department
- **Status:** ✅ Implemented
- **Criterion:** WHEN a subsidiary is picked in "Add rows for every department in…" THE system SHALL replace all pending rows with one copy of each pending row (or the template) per department. IF it has none THEN info toast "That subsidiary has no departments"; IF loading fails THEN error toast "Could not load departments".
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-ROWS-005: Empty table message
- **Status:** ✅ Implemented
- **Criterion:** IF the table is empty THEN it SHALL show "No rows yet. Add a row below.".
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

### UCB-R4 — Paste from Excel
**User story:** As a CSS, I want to paste a list of target subsidiaries/departments from a spreadsheet.

#### UCB-PASTE-001: Paste rows from Excel
- **Status:** ✅ Implemented
- **Criterion:** WHEN "Add rows" is clicked in the paste box THE system SHALL create one row per non-blank line, columns subsidiary, department, stakeholder separated by tab or comma.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-PASTE-002: Match pasted names
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL match names case-insensitively to subsidiaries, then that subsidiary's departments, then that department's stakeholders; unmatched names SHALL be left blank and a warning toast "N name(s) didn't match and were left blank" SHALL show.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-PASTE-003: Pasted rows replace pending rows
- **Status:** ✅ Implemented
- **Criterion:** Pasted rows SHALL replace pending rows and take other values from the template; the box SHALL clear and close.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-PASTE-004: Split on tabs only when present
- **Status:** ⚠️ Partial — Splits on tabs and commas together
- **Criterion:** IF a line contains a tab THEN THE system SHALL split on tabs only, so names containing commas survive.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

### UCB-R5 — Shared details

#### UCB-SHARE-001: Shared details section
- **Status:** ✅ Implemented
- **Criterion:** THE dialog SHALL have "Details for every use case" (Content type, CSS contributor, Value, Notes) applied to every row when on.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

#### UCB-SHARE-002: Shared details default
- **Status:** ✅ Implemented
- **Criterion:** WITH zero or one source the section SHALL be on, pre-filled from the source; WITH several sources it SHALL be off by default with a "Replace on every copy" checkbox.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`

### UCB-R6 — Check and save

#### UCB-SAVE-001: Row status pill
- **Status:** ✅ Implemented
- **Criterion:** EACH row SHALL show one pill: Not saved (server error as tooltip) · Incomplete (missing subsidiary/solution/status) · Duplicate (same subsidiary+department+solution+type as an existing use case or an earlier row) · Ready.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-002: Duplicates warn only
- **Status:** ✅ Implemented
- **Criterion:** Duplicates SHALL warn but not block saving.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-003: Footer counts
- **Status:** ✅ Implemented
- **Criterion:** THE footer SHALL show "N use case(s)", "N ready", "N possible duplicate(s)", "N incomplete".
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-004: Block create on incomplete rows
- **Status:** ✅ Implemented
- **Criterion:** IF any row is incomplete on Create THEN nothing SHALL be saved, the first incomplete row SHALL scroll into view and missing cells SHALL be outlined red.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-005: Sequential save with progress
- **Status:** ✅ Implemented
- **Criterion:** WHILE saving THE rows SHALL be saved one by one with "Creating X of N..." and the dialog SHALL NOT close.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-006: All saved toast
- **Status:** ✅ Implemented
- **Criterion:** WHEN all rows save THE system SHALL toast "N use case(s) created" and close.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-007: Partial failure keeps failed rows
- **Status:** ✅ Implemented
- **Criterion:** IF some rows fail THEN only failed rows SHALL remain, marked Not saved, with toast "S of N created" and a banner explaining how to see why.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

#### UCB-SAVE-008: List load error
- **Status:** ✅ Implemented
- **Criterion:** IF any core list fails to load THEN "Could not load some lists: <message>" SHALL show.
- **Source:** `src/components/customers/UseCaseBulkForm.tsx`, `src/lib/parentData.ts`

## Scenarios
- Clone a use case, pick "North America" (4 departments) in "every department" → 4 rows, each a different department, status Planned, no launch date.
- Paste `North America\tFinance` + `Atlantis\tOps` (Atlantis unknown) → 2 rows, second blank; toast "1 name didn't match…".
- 3 ready rows, row 2 fails → only row 2 remains as Not saved; toast "2 of 3 created".
- Row identical to an existing use case → "Duplicate", footer "1 possible duplicate"; Create still saves.
