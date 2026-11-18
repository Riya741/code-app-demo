# Requirements — Executive Summary

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| executive-summary | SUM | ⚠️ Edit saved to the workbook; awaiting manual G5 check (SUM-T09, SUM-T10) | I, II, III, V, VI, XII |

## Introduction
The right-hand panel shows the customer's rich-text executive summary, lets the user edit it with formatting and
export it to Word.

---

### SUM-R1 — View the summary
**User story:** As a CSS, I want to read the account narrative next to the customer's activity.

#### SUM-VIEW-001: Summary panel title and colours
- **Status:** ✅ Implemented
- **Criterion:** THE panel SHALL be titled "Executive Summary" in a warm stone colour scheme and SHALL NOT repeat the name/ID shown in the top bar.
- **Source:** `src/components/customers/CustomerDetails.tsx`

#### SUM-VIEW-002: Render HTML or plain text
- **Status:** ✅ Implemented
- **Criterion:** IF the summary is HTML THEN THE system SHALL render it sanitised as rich text; ELSE plain text with line breaks preserved.
- **Source:** `src/components/customers/CustomerDetails.tsx`

#### SUM-VIEW-003: Empty summary prompt
- **Status:** ✅ Implemented
- **Criterion:** IF the summary is empty THEN THE system SHALL show "No executive summary yet. Click to add one.".
- **Source:** `src/components/customers/CustomerDetails.tsx`

#### SUM-VIEW-004: Last modified timestamp
- **Status:** ✅ Implemented
- **Criterion:** WHEN `summary_last_modified` is valid and ≥ year 2000 THE header SHALL show "Last modified: <Mon D, YYYY, h:mm AM/PM> UTC", reading zone-less timestamps as UTC.
- **Source:** `src/components/customers/CustomerDetails.tsx`

### SUM-R2 — Edit the summary
**User story:** As a CSS, I want to update the summary with formatting so the account narrative stays current for everyone.

#### SUM-EDIT-001: Persist summary edits
- **Status:** ⚠️ Partial — server (API-T09) and client (SUM-T08..T10) implemented and reviewed 2026-11-18; the selected-row refresh is awaiting the owner's manual G5 check (SUM-T09)
- **Criterion:** WHEN the user saves an edit THE system SHALL write `executive_summary` and `summary_last_modified = now (UTC)` for that customer to the workbook and refresh the customer data.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

#### SUM-EDIT-002: Open editor by click or key
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user clicks the summary (not a link) or presses Enter/Space on it THE system SHALL open the editor; a "Click to edit" hint SHALL appear on hover/focus.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

#### SUM-EDIT-003: Lazy editor pre-filled
- **Status:** ✅ Implemented
- **Criterion:** THE editor SHALL be the lazy-loaded rich text editor, showing "Loading editor..." while it loads, pre-filled with the current summary.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

#### SUM-EDIT-004: Cancel and Save while editing
- **Status:** ✅ Implemented
- **Criterion:** WHILE editing THE header SHALL show Cancel (discard) and Save.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

#### SUM-EDIT-005: Save success and failure feedback
- **Status:** ⚠️ Partial — implemented and tested (SUM-T09); awaiting the owner's manual G5 check
- **Criterion:** WHEN save succeeds THE system SHALL show the toast "Executive summary updated". IF save fails THEN THE editor SHALL stay open with the draft and show "Could not save: <message>".
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

#### SUM-EDIT-006: Disable buttons while saving
- **Status:** ⚠️ Partial — implemented and tested (SUM-T09); awaiting the owner's manual G5 check
- **Criterion:** WHILE the save is in progress Save and Cancel SHALL be disabled with a spinner.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

#### SUM-EDIT-007: Interim on-screen-only marker
- **Status:** Deprecated — retired by SUM-T10 (2026-11-18): summaries are saved, so the on-screen-only marker is gone
- **Criterion:** *(interim, retire when SUM-EDIT-001 is done)* WHILE an on-screen edit exists THE header SHALL show "Edited (on screen only)".
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextEditor.tsx`

### SUM-R3 — Export to Word
**User story:** As a team lead, I want the summary as a Word document for account reviews.

#### SUM-WORD-001: Export summary to Word
- **Status:** ✅ Implemented
- **Criterion:** WHEN Export is clicked THE system SHALL download the stored summary as `<Customer>_executive-summary_<YYYY-MM-DD>.doc`, titled "<Customer> - Executive Summary", subtitle "Last modified: …" when known.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/lib/wordDoc.ts`

#### SUM-WORD-002: Disable export when empty
- **Status:** ✅ Implemented
- **Criterion:** IF the summary is empty THEN Export SHALL be disabled.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/lib/wordDoc.ts`

#### SUM-WORD-003: Export toast
- **Status:** ✅ Implemented
- **Criterion:** WHEN the export completes THE toast "Executive summary exported" SHALL show.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/lib/wordDoc.ts`

## Scenarios
- HTML summary with red bold text → red bold in light and legible in dark mode.
- Edit → Save → reload → new text shown and present in the workbook (SUM-T08..T10; manual G5 check pending).
- Click a link in the summary → opens in a new tab, editor does not open.
- Customer "Acme Corp." exported on 2026-11-11 → `Acme_Corp_executive-summary_2026-11-11.doc`.
