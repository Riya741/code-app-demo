# Requirements — Workbook Storage Engine

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| workbook-storage | STO | ✅ Implemented · backup missing | II, VIII, XI |

## Introduction
The server keeps all sheets in memory, reloads when the file changes on disk and rewrites the whole file atomically
after every change.

---

### STO-R1 — Load

#### STO-LOAD-001: Workbook path
- **Status:** ✅ Implemented
- **Criterion:** THE store SHALL read `WORKBOOK_PATH` if set, else `../data/code-app-data.xlsx`.
- **Source:** `server/workbook.ts`

#### STO-LOAD-002: Reload on mtime change
- **Status:** ✅ Implemented
- **Criterion:** BEFORE each request THE store SHALL reload the file IF never loaded OR its modification time changed.
- **Source:** `server/workbook.ts`

#### STO-LOAD-003: Missing workbook error
- **Status:** ✅ Implemented
- **Criterion:** IF the file does not exist THEN requests SHALL fail 500 "Workbook not found: <path>".
- **Source:** `server/workbook.ts`

#### STO-LOAD-004: Fix openpyxl table paths
- **Status:** ✅ Implemented
- **Criterion:** THE loader SHALL rewrite openpyxl absolute table paths so ExcelJS can open the file.
- **Source:** `server/workbook.ts`

#### STO-LOAD-005: Sheets to rows
- **Status:** ✅ Implemented
- **Criterion:** THE loader SHALL turn each non-README sheet into rows keyed by header names, skipping fully empty rows.
- **Source:** `server/workbook.ts`

#### STO-LOAD-006: Normalise cell values
- **Status:** ✅ Implemented
- **Criterion:** Cell values SHALL be normalised: Date → ISO string; formula → result; rich text/hyperlink → text; `""` → null.
- **Source:** `server/workbook.ts`

### STO-R2 — Save

#### STO-SAVE-001: Write sheets as Excel tables
- **Status:** ✅ Implemented
- **Criterion:** WHEN data changes THE store SHALL write every sheet as an Excel table (`TableStyleMedium2`, filter buttons, frozen header, auto width 8–48); an empty sheet gets one blank row.
- **Source:** `server/workbook.ts`

#### STO-SAVE-002: README sheet first
- **Status:** ✅ Implemented
- **Criterion:** THE README sheet SHALL be written first and unchanged (line 1 bold 14pt).
- **Source:** `server/workbook.ts`

#### STO-SAVE-003: Clean strings
- **Status:** ✅ Implemented
- **Criterion:** Strings SHALL be cleaned of XML-illegal characters and truncated to 32,000 chars.
- **Source:** `server/workbook.ts`

#### STO-SAVE-004: Atomic save
- **Status:** ✅ Implemented
- **Criterion:** THE save SHALL write `~tmp-<file>` then rename it over the original; on failure the temp file is removed and the original untouched.
- **Source:** `server/workbook.ts`

#### STO-SAVE-005: Locked file error
- **Status:** ✅ Implemented
- **Criterion:** IF the save fails with EBUSY/EPERM/EACCES THEN THE API SHALL return 423 "Could not save: <file> is open in Excel. Close it and try again.".
- **Source:** `server/workbook.ts`

#### STO-SAVE-006: Discard memory after failure
- **Status:** ✅ Implemented
- **Criterion:** IF a save or any non-GET request fails THEN in-memory data SHALL be discarded and re-read on the next request.
- **Source:** `server/workbook.ts`

#### STO-SAVE-007: No self-triggered reload
- **Status:** ✅ Implemented
- **Criterion:** AFTER a successful save the stored mtime SHALL be updated (no self-triggered reload).
- **Source:** `server/workbook.ts`

#### STO-SAVE-008: Preserve column order
- **Status:** ✅ Implemented
- **Criterion:** Column order SHALL be preserved; new rows start with all columns null.
- **Source:** `server/workbook.ts`

#### STO-SAVE-009: Data-only workbook
- **Status:** ⚠️ Partial — Documented limitation
- **Criterion:** Saving does not preserve custom formatting, formulas, charts, comments or validation; the workbook is data only.
- **Source:** `server/workbook.ts`

#### STO-SAVE-010: Rolling backups
- **Status:** 📝 Planned
- **Criterion:** BEFORE overwriting, THE store SHOULD keep a rolling backup (e.g. last 10 copies in `../data/backups/`).
- **Source:** `server/workbook.ts`

### STO-R3 — Concurrency

#### STO-CONC-001: Serial request queue
- **Status:** ✅ Implemented
- **Criterion:** THE store SHALL process requests strictly one at a time (serial queue).
- **Source:** `server/workbook.ts`

#### STO-CONC-002: Missing sheet error
- **Status:** ✅ Implemented
- **Criterion:** A missing sheet SHALL fail 404 `The workbook has no "<name>" sheet.`.
- **Source:** `server/workbook.ts`

## Scenarios
- Edit a cell in Excel, save and close; refresh in app → new value without restarting.
- Workbook open in Excel; add a use case → 423 message; file unchanged; after closing Excel, retry succeeds.
- Two saves at once → applied one after the other; both present.
