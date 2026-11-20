# Requirements — Executive Summary

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| executive-summary | SUM | ✅ Edits saved to the workbook (2026-11-18) | I, II, III, V, VI, XII |

## Introduction
The Executive Summary shows the customer's rich-text executive summary, lets the user edit it with formatting and
export it to Word. Today it is the right-hand panel of the workspace; CR-20261120-2 (the owner's decision of
2026-11-20, "Dialog over the grids", which supersedes the band of CR-20261120-1) moves it, with every criterion below
unchanged, into a modal dialog that opens when a customer is selected
([002-workspace-layout](../002-workspace-layout/requirements.md) LAY-R7, SUM-VIEW-006). With AI on, the dialog also
hosts the AI Account Brief draft ([022-ai-account-brief](../022-ai-account-brief/requirements.md)).

---

### SUM-R1 — View the summary
**User story:** As a CSS, I want to read the account narrative next to the customer's activity.

#### SUM-VIEW-001: Summary title and colours
- **Status:** ✅ Implemented
- **Criterion:** THE Executive Summary, wherever it is shown (panel, band or dialog), SHALL be titled "Executive Summary" in a warm stone colour scheme and SHALL NOT repeat the name/ID shown in the top bar.
- **Note:** Wording only (CR-20261120-1 added "band", CR-20261120-2 replaces it with "dialog"): the criterion holds before and after LAY-T09 and LAY-T11; behaviour unchanged.
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

#### SUM-VIEW-005: Summary lives in the workspace band
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): the summary is shown in a dialog, not a band; replaced by SUM-VIEW-006.
- **Criterion:** WHEN a customer is selected THE summary view, editor and Word export SHALL be shown in the full-width summary band (LAY-BAND-001) and nowhere else, with every SUM-VIEW, SUM-EDIT and SUM-WORD criterion behaving as before.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/pages/Customers.tsx`

#### SUM-VIEW-006: Summary lives in the summary dialog
- **Status:** ✅ Implemented
- **Criterion:** WHEN the Executive Summary is shown THE summary view, editor and Word export SHALL be inside the summary dialog (LAY-DLG-001) and nowhere else in the workspace (no right-hand panel, no band), with every SUM-VIEW, SUM-EDIT and SUM-WORD criterion behaving as before.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/pages/Customers.tsx`, `src/components/customers/SummaryDialog.tsx`

### SUM-R2 — Edit the summary
**User story:** As a CSS, I want to update the summary with formatting so the account narrative stays current for everyone.

#### SUM-EDIT-001: Persist summary edits
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user saves an edit THE system SHALL write `executive_summary` and `summary_last_modified = now (UTC)` for that customer to the workbook and refresh the customer data.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/hooks/useCustomers.ts`, `src/lib/customerSource.ts`, `src/pages/Customers.tsx`, `server/workbook.ts`

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
- **Status:** ✅ Implemented
- **Criterion:** WHEN save succeeds THE system SHALL show the toast "Executive summary updated". IF save fails THEN THE editor SHALL stay open with the draft and show "Could not save: <message>".
- **Source:** `src/components/customers/CustomerDetails.tsx`

#### SUM-EDIT-006: Disable buttons while saving
- **Status:** ✅ Implemented
- **Criterion:** WHILE the save is in progress Save and Cancel SHALL be disabled with a spinner.
- **Source:** `src/components/customers/CustomerDetails.tsx`

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
- Edit → Save → reload → new text shown and present in the workbook (SUM-T08..T10; G5 passed 2026-11-18).
- Click a link in the summary → opens in a new tab, editor does not open.
- Customer "Acme Corp." exported on 2026-11-11 → `Acme_Corp_executive-summary_2026-11-11.doc`.
- After LAY-T11: pick a customer → the summary opens in a dialog over the full-width grids; click it, edit, Save → toast "Executive summary updated", the dialog closes; the "Executive summary" button in the top bar reopens it with the new Last modified (SUM-VIEW-006, LAY-DLG-009).
- Edit, then Esc → "Discard your unsaved summary changes?" (LAY-DLG-007); the other criteria above are unchanged inside the dialog.
