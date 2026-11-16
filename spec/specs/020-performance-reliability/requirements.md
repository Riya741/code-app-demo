# Requirements — Performance, Reliability, Compatibility, Dates

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| performance-reliability | PERF / REL / COMP / DT | ⚠️ Mostly implemented | II, V, XI |

## Introduction
Cross-cutting quality attributes.

---

### PERF-R1 — Performance

#### PERF-SPEED-001: Instant search
- **Status:** ✅ Implemented
- **Criterion:** Search SHALL respond within one frame for up to ~10,000 customers.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

#### PERF-SPEED-002: Cached lookups
- **Status:** ✅ Implemented
- **Criterion:** Lookups SHALL be cached 10 minutes and shared between forms.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

#### PERF-SPEED-003: Lazy editor
- **Status:** ✅ Implemented
- **Criterion:** The rich text editor SHALL load only when editing starts.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

#### PERF-SPEED-004: Reload only on change
- **Status:** ✅ Implemented
- **Criterion:** The server SHALL reload the workbook only when its mtime changes.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

#### PERF-SPEED-005: Save time budget
- **Status:** ⚠️ Partial — Documented limit
- **Criterion:** A single save SHOULD finish in < 1s at current data size; above ~50k rows the store SHALL be redesigned.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

#### PERF-SPEED-006: Bulk save limit
- **Status:** ⚠️ Partial — Documented limit
- **Criterion:** Bulk saves are sequential (N writes); a batch endpoint SHALL be added if bulk sizes > ~50 become common.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

#### PERF-SPEED-007: Grid size limit
- **Status:** ⚠️ Partial — Documented limit
- **Criterion:** Grids render all rows; virtualisation SHALL be added if a customer exceeds ~2,000 rows.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/hooks/useLookups.ts`, `src/components/customers/CustomerDetails.tsx`, `server/workbook.ts`

### REL-R1 — Reliability

#### REL-SAFE-001: Atomic writes
- **Status:** ✅ Implemented
- **Criterion:** Writes SHALL be atomic.
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-002: Locked workbook error
- **Status:** ✅ Implemented
- **Criterion:** A locked workbook SHALL produce a clear, retryable error without losing the user's input.
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-003: Re-read after failure
- **Status:** ✅ Implemented
- **Criterion:** After a failed write the server SHALL re-read the file.
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-004: Serialised requests
- **Status:** ✅ Implemented
- **Criterion:** Requests SHALL be serialised.
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-005: Pick up external saves
- **Status:** ✅ Implemented
- **Criterion:** External saves in Excel SHALL be picked up on the next request.
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-006: Close Excel while using the app
- **Status:** ⚠️ Partial — Operational rule, not shown in the app
- **Criterion:** Users SHALL be told to close the workbook in Excel while using the app (Excel's unsaved copy would overwrite app changes).
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-007: Retry once
- **Status:** ✅ Implemented
- **Criterion:** Failed queries SHALL retry once, then show an error with retry.
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

#### REL-SAFE-008: Backup before save
- **Status:** 📝 Planned
- **Criterion:** The workbook SHALL be backed up before each save (see workbook-storage STO-SAVE-010).
- **Source:** `server/workbook.ts`, `src/hooks/useParentActivity.ts`

### COMP-R1 — Compatibility

#### COMP-ENV-001: Supported browsers
- **Status:** ✅ Implemented
- **Criterion:** Current Chrome, Edge, Firefox and Safari SHALL be supported.
- **Source:** `package.json`, `server/workbook.ts`

#### COMP-ENV-002: 360px to 1920px
- **Status:** ✅ Implemented
- **Criterion:** Layout SHALL work from 360px to 1920px+.
- **Source:** `package.json`, `server/workbook.ts`

#### COMP-ENV-003: Node version in engines
- **Status:** 📝 Planned
- **Criterion:** `package.json` SHALL declare the supported Node version in `engines`.
- **Source:** `package.json`, `server/workbook.ts`

#### COMP-ENV-004: openpyxl and Excel workbooks
- **Status:** ✅ Implemented
- **Criterion:** Workbooks from openpyxl and from Excel SHALL both load.
- **Source:** `package.json`, `server/workbook.ts`

### DT-R1 — Dates and times

#### DT-TIME-001: UTC timestamps
- **Status:** ✅ Implemented
- **Criterion:** Stored timestamps SHALL be UTC ISO without suffix.
- **Source:** `server/workbook.ts`, `src/lib/csv.ts`, `src/components/customers/ParentActivity.tsx`

#### DT-TIME-002: Summary time in UTC
- **Status:** ✅ Implemented
- **Criterion:** The summary timestamp SHALL display in UTC with "UTC".
- **Source:** `server/workbook.ts`, `src/lib/csv.ts`, `src/components/customers/ParentActivity.tsx`

#### DT-TIME-003: Date-only values show stored day
- **Status:** ❌ Gap — One day early west of UTC
- **Criterion:** Date-only values SHALL display the stored calendar day in every time zone.
- **Source:** `server/workbook.ts`, `src/lib/csv.ts`, `src/components/customers/ParentActivity.tsx`

#### DT-TIME-004: UTC date in file names
- **Status:** ✅ Implemented
- **Criterion:** Export file names SHALL use the UTC date.
- **Source:** `server/workbook.ts`, `src/lib/csv.ts`, `src/components/customers/ParentActivity.tsx`
