# Requirements — Data Model (Workbook Schema)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| data-model | DATA | ✅ Implemented · data-quality gaps | II, IV |

## Introduction
The workbook `code-app-data.xlsx` is the database. Each sheet is a table; the full schema is in [design.md](design.md).

---

### DATA-R1 — Tables and keys

#### DATA-TBL-001: One sheet per table
- **Status:** ✅ Implemented
- **Criterion:** EACH table SHALL be a sheet whose row 1 holds the column names; sheet and column names are a contract.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-TBL-002: Integer ids
- **Status:** ✅ Implemented
- **Criterion:** Ids SHALL be positive integers unique per table; new rows get `max(id) + 1`.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-TBL-003: Mirror ids
- **Status:** ✅ Implemented
- **Criterion:** `use_case` and `event` SHALL mirror `id` into `use_case_id` / `event_id` on insert.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-TBL-004: Link sheet keys
- **Status:** ✅ Implemented
- **Criterion:** Link sheets `event_personnel` / `event_solution` SHALL use `event_personnel_id` / `event_solution_id` as key; other link sheets use `id`.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-TBL-005: README sheet
- **Status:** ✅ Implemented
- **Criterion:** A sheet named `README` SHALL hold free text (column A) and is not a table.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

### DATA-R2 — Value formats

#### DATA-FMT-001: Date and timestamp format
- **Status:** ✅ Implemented
- **Criterion:** Dates SHALL be stored `YYYY-MM-DD`; timestamps `YYYY-MM-DDTHH:mm:ss` in UTC without suffix.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-FMT-002: Booleans
- **Status:** ✅ Implemented
- **Criterion:** Booleans SHALL be Excel booleans; readers also accept `1` and `"true"`.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-FMT-003: Empty values
- **Status:** ✅ Implemented
- **Criterion:** Empty strings SHALL be read as null; fully empty rows skipped.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

#### DATA-FMT-004: Text limits
- **Status:** ✅ Implemented
- **Criterion:** Text SHALL be ≤ 32,000 characters with no XML-illegal control characters.
- **Source:** `scripts/build_workbook.py`, `server/workbook.ts`

### DATA-R3 — Relationships and lifecycle

#### DATA-LINK-001: Multi-valued relations in link sheets
- **Status:** ✅ Implemented
- **Criterion:** Multi-valued relations (use case ↔ personnel/content type, event ↔ personnel/solution) SHALL be stored only in link sheets.
- **Source:** `server/workbook.ts`, `src/lib/lookups.ts`

#### DATA-LINK-002: Event belongs via subsidiary
- **Status:** ✅ Implemented
- **Criterion:** An event SHALL belong to a customer through `event.subsidiary_id → subsidiary.parent_id`.
- **Source:** `server/workbook.ts`, `src/lib/lookups.ts`

#### DATA-LINK-003: Soft delete
- **Status:** ✅ Implemented
- **Criterion:** Use cases and events SHALL be soft-deleted (`deleted = true`).
- **Source:** `server/workbook.ts`, `src/lib/lookups.ts`

#### DATA-LINK-004: Allowed types and statuses per solution
- **Status:** ✅ Implemented
- **Criterion:** Allowed use case types and statuses per solution SHALL be defined by `solution_use_case_type` and `solution_status` (with `sort_order`).
- **Source:** `server/workbook.ts`, `src/lib/lookups.ts`

#### DATA-LINK-005: Status history
- **Status:** ✅ Implemented
- **Criterion:** WHEN a use case's status changes (or it is created) a `use_case_status_history` row SHALL be appended, if that sheet exists.
- **Source:** `server/workbook.ts`, `src/lib/lookups.ts`

#### DATA-LINK-006: One agreed key column
- **Status:** ⚠️ Partial — Client may write the alternate `<name>_id` key (detectKey); server joins on `id`
- **Criterion:** Activity rows SHALL reference subsidiaries/departments by one agreed key column (`id`).
- **Source:** `server/workbook.ts`, `src/lib/lookups.ts`

### DATA-R4 — Data quality (after a build)

#### DATA-QUAL-001: Real event type names
- **Status:** ❌ Gap — Placeholders "Event type N"
- **Criterion:** `event_type` SHALL hold real names.
- **Source:** `scripts/build_workbook.py`

#### DATA-QUAL-002: Real personnel ids and emails
- **Status:** ❌ Gap — Generated ids, blank emails
- **Criterion:** `personnel` SHALL hold real ids and emails.
- **Source:** `scripts/build_workbook.py`

#### DATA-QUAL-003: Valid statuses per solution
- **Status:** ❌ Gap — Every status allowed for every solution
- **Criterion:** `solution_status` SHALL list only statuses valid per solution.
- **Source:** `scripts/build_workbook.py`

#### DATA-QUAL-004: Populate customer and event fields
- **Status:** ❌ Gap — Blank from export
- **Criterion:** `customer.industry`, `customer.vertical`, `event.virtual` SHALL be populated where known.
- **Source:** `scripts/build_workbook.py`
