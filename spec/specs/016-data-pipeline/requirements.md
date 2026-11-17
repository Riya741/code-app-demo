# Requirements — Data Pipeline (Workbook Build & Repair Scripts)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| data-pipeline | PIPE | ✅ Implemented | II, X |

## Introduction
Offline Python tools: the demo generator that writes `code-app-data.xlsx` with fictional data (ADR-0006), and the
original tools that build it from a Power BI export and fill use case notes (no export is kept in the project).
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

### PIPE-R3 — Generate the demo workbook (`scripts/generate_demo_workbook.py <output.xlsx> [--customers N] [--seed S] [--as-of D] [--reference X]`)
**User story:** As a developer, I want a realistic workbook with no real customer data, so the app, tests, evals and demos can be shared (ADR-0006).

#### PIPE-GEN-001: Same schema as the data model
- **Status:** ✅ Implemented
- **Criterion:** THE generator SHALL write every sheet and column of the data model, each sheet as an Excel table named after the sheet, with a README sheet first.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-002: Fictional data with the original catalogue rules
- **Status:** ✅ Implemented
- **Criterion:** THE generator SHALL produce only fictional customers, people, products and text, and SHALL take the product catalogue from `scripts/demo_catalogue.json`, keeping the original ids, metric types, premium flags and allowed status / use case type per solution.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-003: Referential integrity before writing
- **Status:** ✅ Implemented
- **Criterion:** BEFORE writing, THE generator SHALL check every foreign key and cascade (subsidiary to customer, department to subsidiary, stakeholder to department, use case type and status allowed for the solution, link rows) and SHALL exit without writing on any violation.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-004: Deterministic output
- **Status:** ✅ Implemented
- **Criterion:** WHEN run with the same `--seed`, `--as-of` and `--customers` THE generator SHALL produce identical sheet data.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-005: Consistent dates and history
- **Status:** ✅ Implemented
- **Criterion:** THE generated data SHALL have completed events in the past, launch dates that follow the use case status, `created` no later than `last_modified`, and status history that ends at the current status.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-006: Planted edge cases
- **Status:** ✅ Implemented
- **Criterion:** THE generator SHALL include, and list with their ids in the README sheet, these edge cases: non-Latin customer names, no executive summary, events only, use cases only, a hidden customer, unsafe text (HTML/script, formula-like cells, prompt injection), a very long note, and subsidiaries with no parent.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-007: Real-name guard
- **Status:** ✅ Implemented
- **Criterion:** WHEN `--reference <workbook with real data>` is given THE generator SHALL fail if any text cell contains a product or vendor name read from that workbook.
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`

#### PIPE-GEN-008: Locked output file
- **Status:** ✅ Implemented
- **Criterion:** IF the output file is locked THEN THE generator SHALL exit with "Cannot write <path>: the file is locked. Close it in Excel and run the script again."
- **Source:** `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`
