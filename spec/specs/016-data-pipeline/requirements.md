# Requirements — Data Pipeline (Workbook Build & Repair Scripts)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| data-pipeline | PIPE | ✅ Implemented | II, X |

## Introduction
Offline Python tools that build `code-app-data.xlsx` from the Power BI export `Terra_Data.xlsx` and fill use case notes.
Run with `python -I`; requires `openpyxl`.

---

### PIPE-R1 — Build the workbook (`scripts/build_workbook.py <src> <dst>`)
**User story:** As a data maintainer, I want a clean, app-ready workbook from the damaged export, with every recovery decision logged.

#### PIPE-BUILD-001: Import integer use case ids
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL import only use case rows whose `[id]` is an integer.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-002: Rejoin split summaries
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL rejoin customer summaries split across rows.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-003: Derive lookups
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL derive lookups from use cases (first non-empty name; parent links by most frequent value).
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-004: Generate personnel and content type ids
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL generate personnel and content type ids in order of first appearance; role = most frequent.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-005: Recover events
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL recover events from the clean, start and end layouts, preferring clean > end > start per field, rejoining notes (≤ 600 lines).
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-006: Drop incomplete events
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL drop events without a date or stage, or with a numeric stage, and count them.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-007: Match event solutions
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL match event solution text greedily to known solutions (names may contain commas); unknown names become new solutions.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-008: Add missing subsidiaries
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL add missing event subsidiaries (customer itself when ids match, else "Subsidiary N").
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-009: Keep active customers
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL keep only customers with a use case or event (visible = true) and add referenced-but-missing customers.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-010: Default statuses and event types
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL allow every status per solution and name event types "Event type N".
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-011: Drop orphan history
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL drop history rows for unknown use cases and count them.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-012: Clean text
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL clean text (illegal chars, 32,000 limit, counted).
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-013: README sheet and tables
- **Status:** ✅ Implemented
- **Criterion:** THE output SHALL have a README sheet first (rules, known gaps, recovery log) and one styled Excel table per sheet.
- **Source:** `scripts/build_workbook.py`

#### PIPE-BUILD-014: Print build counts
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL print table sizes and recovery counters.
- **Source:** `scripts/build_workbook.py`

### PIPE-R2 — Fill notes (`scripts/apply_use_case_notes.py <xlsx> [out]`)

#### PIPE-NOTES-001: Find note start rows
- **Status:** ✅ Implemented
- **Criterion:** A note SHALL start where column A of the `use case note` sheet holds an existing use case id (first line from column B).
- **Source:** `scripts/apply_use_case_notes.py`

#### PIPE-NOTES-002: Note line layout
- **Status:** ✅ Implemented
- **Criterion:** Following rows SHALL become lines: single cell in B/C/D → indented bullet; several cells → `" | "` table row; empty → blank line.
- **Source:** `scripts/apply_use_case_notes.py`

#### PIPE-NOTES-003: Restore bullet glyphs
- **Status:** ✅ Implemented
- **Criterion:** Lost bullet glyphs SHALL be restored (`?` → `◦`, `�`/`•` → `•`); times as `HH:MM`.
- **Source:** `scripts/apply_use_case_notes.py`

#### PIPE-NOTES-004: Non-id integers as text
- **Status:** ✅ Implemented
- **Criterion:** Integers in A that are not use case ids SHALL be treated as text.
- **Source:** `scripts/apply_use_case_notes.py`

#### PIPE-NOTES-005: Collapse blank lines
- **Status:** ✅ Implemented
- **Criterion:** 3+ newlines SHALL collapse to 2; notes truncated to 32,000.
- **Source:** `scripts/apply_use_case_notes.py`

#### PIPE-NOTES-006: Write notes only
- **Status:** ✅ Implemented
- **Criterion:** THE script SHALL write only `use_case.note` (re-runnable), append a README line and print counts.
- **Source:** `scripts/apply_use_case_notes.py`
