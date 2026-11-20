# Requirements — Workspace Layout, Top Bar and Theme

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| workspace-layout | LAY | ⚠️ Implemented with 2 partial criteria · summary dialog planned (CR-20261120-2) | II, V, VI, VII, VIII |

## Introduction
The app is a single screen with two states: a landing page with a hero search, and a customer workspace showing the
Use Cases and Events panels. The Executive Summary opens in a modal dialog when a customer is selected (LAY-R7) and
can be reopened from a button in the top bar. The top bar carries the selected customer, that button, the compact
search, refresh and theme toggle. CR-20261120-1 (owner decision D2) first replaced the right-hand Executive Summary
panel with a collapsible band above the grids; CR-20261120-2 (the owner's revised decision of the same day, "Dialog
over the grids") supersedes that layout: the grids fill the page and the summary is a dialog. The band requirements
(LAY-R6) never shipped and are Deprecated; until LAY-T09 ships, the shipped layout (the deprecated LAY-PANEL-002 split
and the deprecated LAY-PANEL-005 stack) is what the app shows.

---

### LAY-R1 — Landing and workspace states
**User story:** As a CSS, I want to go from search to the customer's workspace without page navigation.

#### LAY-STATE-001: Landing page with hero search
- **Status:** ✅ Implemented
- **Criterion:** WHILE no customer is selected THE system SHALL show the top bar and a centred hero search (max 672px wide, 14vh from the top).
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-002: Workspace keyed by customer
- **Status:** ✅ Implemented
- **Criterion:** WHEN a customer is selected THE system SHALL show the workspace for it, keyed by customer so that filters, sorting, selections and dialogs reset on every customer change.
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-003: Pass customer keys to panels
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL pass the panels `parentId = customer.id` and `customerKeys = [customer.id, customer.parent_id]` (non-null, numeric).
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-004: Workspace width and padding
- **Status:** ✅ Implemented
- **Criterion:** THE workspace SHALL be at most 1920px wide with 16px (24px from 640px) side padding.
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-005: Decorative backdrop
- **Status:** ✅ Implemented
- **Criterion:** THE page SHALL show a decorative, `aria-hidden`, non-interactive backdrop (two blurred glows, masked 44px grid).
- **Source:** `src/pages/Customers.tsx`

### LAY-R2 — Responsive panels
**User story:** As a CSS on a wide screen, I want both grids to fill the page at full width, with the divider resizable; on a small screen I want them stacked.

#### LAY-PANEL-001: One-viewport desktop layout
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is ≥ 1024px and a customer is selected THE page SHALL be exactly one viewport tall and panels SHALL scroll internally.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-002: Desktop split proportions
- **Status:** Deprecated — retired by CR-20261120-1 (owner decision D2, 2026-11-20): the right-hand Executive Summary panel is removed; replaced by LAY-PANEL-006 and the summary band (LAY-BAND-001..007). Replaced in the code by LAY-T09 (2026-11-20).
- **Criterion:** THE desktop layout SHALL split horizontally: left 60% (min 25%) holding Use Cases 60% (min 20%) over Events 40% (min 20%); right 40% (min 20%) Executive Summary.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-003: Draggable dividers
- **Status:** ✅ Implemented
- **Criterion:** THE dividers SHALL be draggable with a visible grip and a 12px hit area highlighting on hover/drag.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-004: Persist all split sizes
- **Status:** ✅ Implemented — the only split left (Use Cases / Events) is saved under `terra-split-v-v1` (LAY-T08); save and restore after reload checked by the owner in G5 (2026-11-20)
- **Criterion:** WHEN the user resizes any split THE sizes SHALL be restored after reload.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-005: Stacked panels below 1024px
- **Status:** Deprecated — retired by CR-20261120-2 (owner decision, 2026-11-20): the Executive Summary leaves the stack and opens as a dialog (LAY-R7); replaced by LAY-PANEL-008. Replaced in the code by LAY-T09 (2026-11-20).
- **Criterion:** WHILE the viewport is < 1024px THE panels SHALL stack (Summary, Use Cases, Events), each at most 60vh, and the page SHALL scroll.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-006: Desktop band over full-width grids
- **Status:** Deprecated — never shipped. Specified by CR-20261120-1 (band above the grids), superseded by CR-20261120-2 (dialog over the grids); replaced by LAY-PANEL-007.
- **Criterion:** WHILE the viewport is ≥ 1024px and a customer is selected THE layout SHALL show the summary band across the full workspace width and, below it, a full-width vertical split of Use Cases 60% (min 20%) over Events 40% (min 20%), with no right-hand panel.
- **Source:** `src/pages/Customers.tsx`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-007: Desktop full-width grids
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is ≥ 1024px and a customer is selected THE layout SHALL show only the Use Cases and Events panels, across the full workspace width, as one vertical split of Use Cases 60% (min 20%) over Events 40% (min 20%), with no Executive Summary panel or band and no horizontal split, and LAY-PANEL-001 SHALL still hold.
- **Source:** `src/pages/Customers.tsx`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-008: Stacked panels below 1024px, without the summary
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is < 1024px THE panels SHALL stack (Use Cases, Events) with no Executive Summary in the stack, each at most 60vh, and the page SHALL scroll.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

### LAY-R6 — Executive Summary band (retired)
**User story:** *(retired)* As a CSS, I wanted the account narrative above my use cases and events, and out of the way
when I am working in the grids. CR-20261120-1 specified it; the owner chose a dialog instead (CR-20261120-2). None of
the seven criteria below was built for release; the blocks stay as history and are never reused (Article I.3).

#### LAY-BAND-001: Full-width summary band
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): the summary is a dialog, not a band; replaced by LAY-DLG-001 and LAY-PANEL-007.
- **Criterion:** WHEN a customer is selected THE workspace SHALL show the Executive Summary in one full-width band, built on the shared panel shell (LAY-SHELL-001), above the Use Cases and Events grids at every viewport width.
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`, `src/components/customers/CustomerDetails.tsx`

#### LAY-BAND-002: Collapse and expand the band
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): there is no band to collapse; the equivalent is closing and reopening the dialog (LAY-DLG-005, LAY-DLG-010).
- **Criterion:** WHEN the user activates the band's collapse control THE band SHALL collapse to its header row (title, Last modified and actions stay visible) and the grids SHALL take the freed height; WHEN the user activates it again THE band SHALL expand; THE band SHALL start expanded unless a stored state says otherwise (LAY-BAND-003).
- **Source:** `src/components/customers/Panel.tsx`, `src/pages/Customers.tsx`

#### LAY-BAND-003: Remember the collapsed state
- **Status:** Deprecated — dropped by CR-20261120-2 (never shipped): the dialog opens on every selection and its state is not remembered; no replacement. Task LAY-T10 is retired with it.
- **Criterion:** WHEN the user collapses or expands the band THE system SHALL store the state in browser storage as a UI preference and SHALL restore it after a reload and for every customer opened afterwards.
- **Source:** `src/pages/Customers.tsx`

#### LAY-BAND-004: Band height on desktop
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): replaced by the dialog size, LAY-DLG-011.
- **Criterion:** WHILE the viewport is ≥ 1024px THE expanded band SHALL be as tall as its content up to 40% of the workspace height, its body SHALL scroll internally beyond that, and the Use Cases / Events split SHALL fill the rest of the single viewport (LAY-PANEL-001).
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`

#### LAY-BAND-005: Band on narrow screens
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): replaced by LAY-PANEL-008 (stack without the summary) and LAY-DLG-012 (dialog as a sheet).
- **Criterion:** WHILE the viewport is < 1024px THE band SHALL be first in the stack (LAY-PANEL-005), at most 60vh tall with internal scrolling when expanded, and only its header row when collapsed.
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`

#### LAY-BAND-006: Accessible collapse control
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): replaced by the dialog's accessibility criteria LAY-DLG-003, LAY-DLG-004 and LAY-DLG-006 and the reopen button's LAY-DLG-010.
- **Criterion:** THE collapse control SHALL be a button named "Collapse executive summary" or "Expand executive summary" with `aria-expanded` and `aria-controls` pointing at the band body, operable with Enter and Space and with visible focus (A11Y-KEY-005); WHEN the band collapses while focus is inside its body THE focus SHALL move to the control.
- **Source:** `src/components/customers/Panel.tsx`

#### LAY-BAND-007: No collapse while editing
- **Status:** Deprecated — retired by CR-20261120-2 (never shipped): the intent (an unsaved edit is never silently lost) is kept by LAY-DLG-007 (confirm before discarding) and LAY-DLG-008 (no close while saving).
- **Criterion:** WHILE the summary editor is open or a summary save is in progress THE collapse control SHALL be disabled, so that an unsaved edit is never hidden.
- **Source:** `src/components/customers/Panel.tsx`, `src/components/customers/CustomerDetails.tsx`

### LAY-R7 — Executive Summary dialog
**User story:** As a CSS, I want the Executive Summary to appear when I open a customer, so that I read the account
narrative first, and I want to close it and work in the full-width grids, with a button to bring it back.

#### LAY-DLG-001: Summary dialog opens on selection
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user selects a customer THE system SHALL open the Executive Summary in a modal dialog over the workspace, at every viewport width, whether or not AI is enabled.
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/ui/dialog.tsx`

#### LAY-DLG-002: Opens once per selection
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer stays selected THE dialog SHALL open only because of a selection: a refetch of the customer data (after a summary save, on Refresh or in the background) SHALL NOT reopen it once it was closed, and SHALL NOT close it or reset its content while it is open.
- **Source:** `src/pages/Customers.tsx`

#### LAY-DLG-003: Modal dialog named Executive Summary
- **Status:** ✅ Implemented
- **Criterion:** WHILE the dialog is open THE system SHALL present it as a modal dialog (overlay; the page behind it inert to pointer and assistive technology) whose accessible name is "Executive Summary", given by `aria-labelledby` pointing at its single visible title.
- **Source:** `src/components/ui/dialog.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-004: Initial focus and focus trap
- **Status:** ✅ Implemented — the dialog container that takes the initial focus shows no focus ring; accepted by the owner at G5 (2026-11-20)
- **Criterion:** WHEN the dialog opens THE focus SHALL move into it without starting the summary editor, and WHILE it is open Tab and Shift+Tab SHALL stay inside it (A11Y-KEY-003).
- **Source:** `src/components/ui/dialog.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-005: Ways to close the dialog
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user presses Esc, activates the × button (named "Close") or clicks the overlay THE dialog SHALL close, subject to LAY-DLG-007 and LAY-DLG-008, and the Use Cases and Events grids SHALL then be usable.
- **Source:** `src/components/ui/dialog.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-006: Focus returns to the reopen button
- **Status:** ✅ Implemented
- **Criterion:** WHEN the dialog closes, by any route and also when it was opened automatically, THE focus SHALL move to the reopen button (LAY-DLG-010).
- **Source:** `src/components/customers/TopBar.tsx`, `src/components/ui/dialog.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-007: Confirm before discarding edits
- **Status:** ✅ Implemented
- **Criterion:** IF the summary editor holds unsaved changes WHEN the user tries to close the dialog THEN THE system SHALL ask "Discard your unsaved summary changes?" with the actions *Discard* and *Keep editing*; WHEN the user chooses *Keep editing* THE dialog SHALL stay open with the editor and its text intact; WHEN the user chooses *Discard* THE dialog SHALL close, the changes SHALL be dropped and nothing SHALL be written to the workbook.
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-008: No closing while saving
- **Status:** ✅ Implemented
- **Criterion:** WHILE a summary save is in progress THE × button, Esc and a click on the overlay SHALL have no effect, so that the dialog stays open until the save has succeeded or failed (A11Y-KEY-003).
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/ui/dialog.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-009: Dialog closes after a successful save
- **Status:** ✅ Implemented
- **Criterion:** WHEN a summary save succeeds THE system SHALL show the toast "Executive summary updated" (SUM-EDIT-005) and close the dialog; IF the save fails THEN THE dialog SHALL stay open with the editor, the draft and the message "Could not save: <message>" (SUM-EDIT-005).
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-010: Reopen button in the top bar
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer is selected THE top bar SHALL show, next to the customer chip, a button named "Executive summary" that opens the dialog, showing its label from 640px width and only its icon below that while keeping the accessible name, operable with Enter and Space and with visible focus (A11Y-KEY-005).
- **Source:** `src/components/customers/TopBar.tsx`, `src/pages/Customers.tsx`

#### LAY-DLG-011: Dialog size on desktop
- **Status:** ✅ Implemented — centred, 80% of the viewport width, at most 85vh (owner decision, CR-20261120-2 question a)
- **Criterion:** WHILE the viewport is ≥ 1024px THE dialog SHALL be centred in the page, horizontally and vertically, and 80% of the viewport width wide and at most 85vh tall, so that it reads as a popup over the grids, its title bar SHALL stay in view and its body SHALL scroll when the content is taller.
- **Source:** `src/components/ui/dialog.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-012: Dialog as a sheet on narrow screens
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is < 1024px THE dialog SHALL fill the viewport width and height as a sheet, with its title bar and × button in view and its body scrolling.
- **Source:** `src/components/ui/dialog.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-013: Dialog and button in both themes
- **Status:** ✅ Implemented
- **Criterion:** THE dialog, its overlay and the reopen button SHALL take their colours from design tokens, THE summary SHALL keep its stone scheme (SUM-VIEW-001), and all three SHALL be legible in the light and the dark theme (Article VI.1).
- **Source:** `src/components/customers/CustomerDetails.tsx`, `src/components/customers/TopBar.tsx`, `src/components/ui/dialog.tsx`, `src/components/customers/SummaryDialog.tsx`

#### LAY-DLG-014: Dialog state resets with the customer
- **Status:** ✅ Implemented
- **Criterion:** WHEN the selected customer changes or the selection is cleared THE system SHALL close the dialog and drop its editor state without a confirmation, and a new selection SHALL open it again (LAY-DLG-001, LAY-STATE-002).
- **Source:** `src/pages/Customers.tsx`

### LAY-R3 — Top bar

#### LAY-TOP-001: Sticky translucent top bar
- **Status:** ✅ Implemented
- **Criterion:** THE top bar SHALL be sticky, 48px tall, translucent with backdrop blur.
- **Source:** `src/components/customers/TopBar.tsx`

#### LAY-TOP-002: Customer chip
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer is selected THE top bar SHALL show a chip with icon, name (truncated), "Parent ID: <id>" when present, and a × button labelled "Clear selected customer" that returns to the landing page.
- **Source:** `src/components/customers/TopBar.tsx`

#### LAY-TOP-003: Bar search in top bar
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer is selected THE top bar SHALL show the bar search, max 448px, centred.
- **Source:** `src/components/customers/TopBar.tsx`

#### LAY-TOP-004: Refresh reloads all data
- **Status:** ⚠️ Partial — Only the customer list reloads
- **Criterion:** WHEN Refresh ("Refresh data") is clicked THE system SHALL reload the customer list, the open customer's use cases and events, and lookups; the icon SHALL spin while reloading.
- **Source:** `src/components/customers/TopBar.tsx`

### LAY-R4 — Theme

#### LAY-THEME-001: Light default theme, persisted
- **Status:** ✅ Implemented
- **Criterion:** THE default theme SHALL be light; OS theme SHALL be ignored; the choice SHALL persist across reloads.
- **Source:** `src/App.tsx`, `src/components/customers/TopBar.tsx`

#### LAY-THEME-002: Theme toggle
- **Status:** ✅ Implemented
- **Criterion:** WHEN the theme toggle ("Toggle theme") is clicked THE theme SHALL switch light ↔ dark; the icon is a moon in light and a sun in dark.
- **Source:** `src/App.tsx`, `src/components/customers/TopBar.tsx`

### LAY-R5 — Panel shell

#### LAY-SHELL-001: Shared panel shell
- **Status:** ✅ Implemented
- **Criterion:** THE panels SHALL share one shell: rounded card, header bar with uppercase title, optional count and tally badges, right-aligned actions, body scrolling only when needed, fade/slide-in on mount.
- **Source:** `src/components/customers/Panel.tsx`

## Scenarios
- 1440px wide, pick a customer → the Executive Summary opens in a dialog over Use Cases (top) and Events (below), both full width, no page scroll; the focus is inside the dialog (LAY-PANEL-007, LAY-DLG-001, LAY-DLG-004).
- Press Esc, click ×, or click outside → the dialog closes, the grids are usable, the focus is on the "Executive summary" button in the top bar; click it → the dialog opens again (LAY-DLG-005, LAY-DLG-006, LAY-DLG-010).
- Save a summary edit → toast "Executive summary updated", the customer data refetches, the dialog closes and does not pop open again when the data arrives (LAY-DLG-009, LAY-DLG-002). Click Refresh while the dialog is closed → it stays closed.
- Edit the summary and press Esc → "Discard your unsaved summary changes?"; *Keep editing* returns to the text, *Discard* closes the dialog and writes nothing (LAY-DLG-007). While the save is running, Esc, × and the overlay do nothing (LAY-DLG-008).
- Pick customer A, close the dialog, pick customer B → the dialog opens for B (LAY-DLG-014, LAY-STATE-002).
- Long summary at 1440px → the dialog stops at 85vh and its body scrolls under a fixed title bar (LAY-DLG-011).
- Resize the Use Cases / Events split, reload, open a customer → split restored (LAY-PANEL-004, LAY-T08).
- 800px wide → stacked Use Cases and Events, page scrolls; the summary dialog is a full-screen sheet (LAY-PANEL-008, LAY-DLG-012).
- Light and dark themes → dialog, overlay and the top-bar button are legible in both (LAY-DLG-013).
- Filter on customer A, pick customer B → B shows unfiltered.
- Click × → landing page.
