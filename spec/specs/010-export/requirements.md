# Requirements — Exports (CSV and Word)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| export | EXP | ⚠️ Implemented · 2 open criteria | III, V |

## Introduction
Grids export to CSV for Excel; the executive summary exports to a Word document. Exports run entirely in the browser.

---

### EXP-R1 — File naming

#### EXP-NAME-001: Export file name pattern
- **Status:** ✅ Implemented
- **Criterion:** THE file name SHALL be `<customer>_<what>_<YYYY-MM-DD>.<ext>` with `what` ∈ {`use-cases`, `events`, `executive-summary`} and today's UTC date.
- **Source:** `src/lib/csv.ts`

#### EXP-NAME-002: Keep any-script letters in names
- **Status:** ⚠️ Partial — Only ASCII letters/digits kept; non-Latin names become `customer`
- **Criterion:** THE customer part SHALL replace each run of characters that are not letters or digits (any script) with `_`, trim `_`, and fall back to `customer`.
- **Source:** `src/lib/csv.ts`

### EXP-R2 — CSV
**User story:** As a team lead, I want exports that open cleanly in Excel.

#### EXP-CSV-001: CSV encoding and format
- **Status:** ✅ Implemented
- **Criterion:** THE CSV SHALL be UTF-8 with BOM, comma-separated, CRLF line ends, header row first.
- **Source:** `src/lib/csv.ts`, `src/components/customers/ExportButton.tsx`

#### EXP-CSV-002: CSV quoting
- **Status:** ✅ Implemented
- **Criterion:** Values containing `"`, `,`, CR or LF SHALL be quoted with `"` doubled; null → empty.
- **Source:** `src/lib/csv.ts`, `src/components/customers/ExportButton.tsx`

#### EXP-CSV-003: Formula-injection guard
- **Status:** ✅ Implemented
- **Criterion:** IF a string value starts with `=`, `+`, `-`, `@`, tab or CR THEN it SHALL be prefixed with `'`. Numbers SHALL NOT be prefixed.
- **Source:** `src/lib/csv.ts`, `src/components/customers/ExportButton.tsx`

#### EXP-CSV-004: Rich text as plain text
- **Status:** ✅ Implemented
- **Criterion:** Rich-text values SHALL be exported as single-line plain text.
- **Source:** `src/lib/csv.ts`, `src/components/customers/ExportButton.tsx`

#### EXP-CSV-005: Revoke Blob URL
- **Status:** ✅ Implemented
- **Criterion:** THE download SHALL use a Blob URL that is revoked afterwards.
- **Source:** `src/lib/csv.ts`, `src/components/customers/ExportButton.tsx`

### EXP-R3 — Word

#### EXP-WORD-001: Word-compatible HTML document
- **Status:** ✅ Implemented
- **Criterion:** THE document SHALL be Word-compatible HTML (`application/msword`, `.doc`, UTF-8 BOM) with an h1 title and optional subtitle.
- **Source:** `src/lib/wordDoc.ts`

#### EXP-WORD-002: Sanitise or escape bodies
- **Status:** ✅ Implemented
- **Criterion:** HTML bodies SHALL be sanitised; plain-text bodies SHALL be escaped, split into paragraphs on blank lines, single newlines as `<br>`.
- **Source:** `src/lib/wordDoc.ts`

#### EXP-WORD-003: Word styling
- **Status:** ✅ Implemented
- **Criterion:** Styling SHALL be Calibri/Arial 11pt `#1f2937`; headings `#1e3a5f`, h1 18pt; subtitle teal 9pt.
- **Source:** `src/lib/wordDoc.ts`

#### EXP-WORD-004: True .docx export
- **Status:** 📝 Planned — Backlog
- **Criterion:** THE summary SHOULD export as a true `.docx` to avoid Word's format warning.
- **Source:** `src/lib/wordDoc.ts`

## Scenarios
- Note `=HYPERLINK("http://x")` → CSV cell `"'=HYPERLINK(""http://x"")"`.
- Subsidiary "Zürich, AG" → quoted; umlaut correct in Excel.
- Plain summary with two paragraphs → two paragraphs in Word.
- **Target:** customer "東京ガス" → file name keeps the name.
