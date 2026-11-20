# Change Request: Executive Summary as a dialog over full-width grids (replaces the layout half of owner decision D2)

- **ID:** CR-20261120-2
- **Author / date:** Project owner (decision), drafted with Claude Code (spec author, AGENT-SPEC-AUTHOR@1.0.0) · 2026-11-20
- **Type:** Behaviour change (supersedes the layout half of decision D2 of [CR-20261120-1](CR-20261120-1-owner-decisions-summary-band.md); nothing was released)
- **Specs affected:** specs/002-workspace-layout, specs/003-executive-summary, specs/017-design-system (messages catalog,
  design surface), specs/022-ai-account-brief, specs/024-agent-ops (design note only)
- **Constitution articles affected:** none amended (v1.1.1 stays); compliance re-checked for I, II, V, VI, VII, VIII, IX
  and XII in the specs above
- **Status:** Approved 2026-11-20 by the project owner (dialog size changed, see section 6) · branch `cr-owner-decisions-summary-band`

## 1. Problem

The owner approved CR-20261120-1 on 2026-11-20 with decision D2 "a full-width, collapsible Executive Summary band above
the grids". The same day the owner chose a different option from the same list, in the owner's words:

> **"Dialog over the grids."** Grids fill the page; the summary opens in a dialog on selection. Save or close the dialog
> to reach the grids; a header button reopens it.

So the **layout half** of D2 (band, collapse, band height, collapsed-state storage) is replaced. The **AI half** of D2
(automatic draft for a customer without a summary, *Regenerate with AI*, the unsaved "AI draft — not saved" draft,
failure message, AI off = plain summary) is kept and re-homed from the band to the dialog. D1, D3 and D4 of CR-20261120-1
and tasks API-T13 and API-T14 are untouched.

State of the work today, which this CR has to account for (Article I.2, no spec and code left disagreeing):
- **Committed spec (HEAD `bcbd04e`):** LAY-PANEL-006, LAY-BAND-001..007, SUM-VIEW-005, AIB-GEN-007..015, AIB-HUMAN-004..008
  and tasks LAY-T09, LAY-T10, SUM-T13, AIB-T06, AIB-T07, AIB-T09, AIB-T10 are written for the band. None of the
  requirements shipped (all 📝 Planned); LAY-PANEL-002 is already Deprecated.
- **Uncommitted working tree (code not touched by this CR):** LAY-T08, LAY-T09 and SUM-T13 are 🔄 In progress and the band
  exists in code: `Panel` `collapse` prop with a chevron toggle, `Customers.tsx` with the band, the full-width vertical
  Use Cases / Events split (`autoSaveId="terra-split-v-v1"`) and `collapsed` state, `CustomerDetails` collapse props, tests
  in `tests/component/Panel.test.tsx`, `CustomerDetails.test.tsx` and the new `Customers.test.tsx`; hand-offs
  [LAY-T09](../handoffs/LAY-T09.md), [SUM-T13](../handoffs/SUM-T13.md), [LAY-T08](../handoffs/LAY-T08.md) with verdict pass for
  the code and G5 not done.

## 2. Proposed behaviour

### 2.1 Layout (spec 002)
- **≥ 1024px:** no summary panel and no band. The Use Cases and Events panels fill the workspace at full width as one
  vertical split, Use Cases 60% (min 20%) over Events 40% (min 20%), divider draggable and remembered
  (`terra-split-v-v1`, LAY-T08). The one-viewport rule (LAY-PANEL-001) holds. New LAY-PANEL-007.
- **< 1024px:** Use Cases, Events stacked, each at most 60vh, page scrolls; the summary is not part of the stack. LAY-PANEL-005
  said "Summary, Use Cases, Events", so it is Deprecated and replaced by LAY-PANEL-008.
- **Kept from the unreleased band work:** the full-width vertical group with `autoSaveId`, its 60/40 sizes, the narrow stack,
  and LAY-T08. **Dropped:** the band, its 40% / 60vh sizing, the collapse button, the collapsed state and its
  `localStorage` key. The unused `Panel.collapse` prop (added only for the band) and the band wiring are removed by LAY-T09.

### 2.2 The summary dialog (new LAY-R7, LAY-DLG-001..014)
| Rule | Requirement |
|---|---|
| Opens when the user **selects** a customer, at every width, with or without AI | LAY-DLG-001 |
| Opens **once per selection**: a refetch (after a save, on Refresh, in the background) neither reopens a closed dialog nor closes or resets an open one | LAY-DLG-002 |
| Modal: overlay, page behind inert, accessible name "Executive Summary" via `aria-labelledby` on the single visible title (same text as SUM-VIEW-001) | LAY-DLG-003 |
| Initial focus inside the dialog, not in the editor; Tab trapped (A11Y-KEY-003) | LAY-DLG-004 |
| Esc, the × button ("Close") or an overlay click close it | LAY-DLG-005 |
| Focus returns to the reopen button, also after an automatic open | LAY-DLG-006 |
| Closing with unsaved editor changes asks "Discard your unsaved summary changes?" [Discard] [Keep editing]; Discard writes nothing | LAY-DLG-007 |
| While a save runs, ×, Esc and overlay clicks do nothing | LAY-DLG-008 |
| A successful save shows the toast and closes the dialog; a failed save keeps it open with the draft and the message | LAY-DLG-009 |
| Reopen button "Executive summary" in the top bar next to the customer chip while a customer is selected; label from 640px, icon only below, accessible name always | LAY-DLG-010 |
| Size on desktop: centred in the page, 80% of the viewport width wide, at most 85vh tall, title bar fixed, body scrolls | LAY-DLG-011 |
| Below 1024px: a full-screen sheet | LAY-DLG-012 |
| Tokens only, stone summary kept, legible in both themes | LAY-DLG-013 |
| Customer change or cleared selection resets the dialog with no confirm; a new selection opens it again | LAY-DLG-014 |

Notes on how the rules fit together (design in [002](../specs/002-workspace-layout/design.md), "Summary dialog design"):
- The dialog is **modal**, so the top bar (search, ×, Refresh) is inert while it is open: a customer cannot change while
  the editor holds text, and LAY-DLG-014 is a rule for completeness. The discard confirm is the only way text can be lost.
- LAY-BAND-007's intent ("an unsaved edit is never silently lost") is kept by LAY-DLG-007 and LAY-DLG-008, not dropped.
- LAY-BAND-003 / LAY-T10 ("remember the collapsed state") is **dropped without replacement**: the dialog opens on every
  selection and nothing about it is stored (Article II.1 is easier to meet: only theme and split sizes are in browser storage).
- Reuse (Article VI.3, VIII): the existing `Dialog` and `AlertDialog` (as `ConfirmDelete`), `Panel` and `Button`; no
  new dependency, no edit to `src/components/ui/`, hence "×, Esc and overlay have no effect" while saving, as the add and
  edit forms already do, instead of a disabled ×. No ADR (no new dependency, layer or store).

### 2.3 Summary (spec 003)
Every existing behaviour is kept inside the dialog unchanged: sanitised render, empty-state text, Last modified, click or
Enter to edit, lazy rich-text editor, Cancel (returns to the view inside the dialog) and Save, pending, success and failure
states and toasts, Word export of the **stored** summary. SUM-VIEW-001 is reworded "panel or band" → "wherever it is shown
(panel, band or dialog)", no behaviour change. SUM-VIEW-005 ("lives in the workspace band", 📝) is Deprecated and replaced
by SUM-VIEW-006 ("lives in the summary dialog and nowhere else"). `CustomerDetails` loses the band's collapse props and gains
`onStateChange({ editing, dirty, saving })` and `onSaved()` so the dialog can enforce LAY-DLG-007..009.

### 2.4 AI Account Brief in the dialog (spec 022; 024 only a design note)
- **Automatic run (AIB-GEN-016, replaces -007):** WHEN a customer is selected, has no saved summary and AI is available, one
  run starts, at the moment the dialog opens; progress shows in the dialog and on the reopen button. Closing and reopening
  the dialog, a refetch or a discard do not start another run for that selection; selecting the customer again later is a
  new selection (owner decision of CR-20261120-1, kept).
- **The run belongs to the customer, not to the dialog (AIB-HUMAN-010, new):** closing the dialog does **not** cancel the run
  or drop the draft; reopening shows the live progress or the waiting draft. A run or draft ends only through customer
  change or cleared selection (AIB-GEN-008), opening the editor (AIB-GEN-015), *Cancel* (AIB-GEN-018), *Save*
  (AIB-HUMAN-005) or *Discard* (AIB-HUMAN-007).
- **Reopen-button indicator (AIB-HUMAN-011, replaces the collapsed-band badge of -008):** a spinner while running, the badge
  "AI draft ready — not saved" while a draft waits, announced politely, focus never moved. A run never reopens the
  dialog or moves focus (AIB-GEN-020).
- **Regenerate with AI (AIB-GEN-017, replaces -009)** in the dialog header, also for a customer without a summary; busy
  state, `aria-live` progress and *Cancel* (AIB-GEN-018, replaces -010); confirm before replacing unsaved edits
  (AIB-GEN-011, unchanged); breaker open (AIB-GEN-012, unchanged: no automatic run, *Regenerate* disabled with the tooltip).
- **Draft in the dialog (AIB-HUMAN-009, replaces -004):** unsaved, sanitised, with citation markers, labelled "AI draft —
  not saved", *Save* / *Edit* / *Discard*, the unverified banner when it applies.
- **AI off (AIB-GEN-019, replaces -013):** no run, no AI action or indicator; the dialog still opens as the plain summary.
- **Unsaved AI draft and customer change (AIB-HUMAN-007, wording unchanged, note added):** the waiting draft is dropped with no
  confirm; typed text cannot be lost this way because it lives in the editor, which cannot be left without LAY-DLG-007.
- **Unchanged (not band-specific):** AIB-GEN-004 (failure message with *Try again*), AIB-GEN-008, AIB-GEN-011, AIB-GEN-012,
  AIB-GEN-015, AIB-HUMAN-002, -003, -005, -006, -007, all AIB-CITE, AIB-FAITH, AIB-SAFE, AIB-FMT, AIB-API. The pipeline (024),
  evaluation (023), agent specs and ADRs name neither the band nor the dialog and are unchanged; the fact sheet still
  never contains the old summary (ai-data-policy).

### 2.5 What happens to the in-progress tasks and the retired IDs (Article I.3, workflow.md)
`workflow.md` has four task statuses (✅ ⬜ 🔄 ⛔) and no "cancelled", so nothing is deleted and no status is invented.
- **Requirement IDs are never reused or renumbered.** Retired with `Deprecated — <why>`, their text kept as history:
  LAY-PANEL-005, LAY-PANEL-006, LAY-BAND-001..007, SUM-VIEW-005, AIB-GEN-007, -009, -010, -013, -014, AIB-HUMAN-004, -008.
  Where a Deprecated ID is still cited (tests in the working tree, the CR-1 text, hand-offs) it resolves, so lint stays green.
- **LAY-T09, SUM-T13 (🔄) are re-scoped, not reset.** They keep 🔄: the code they describe is partly delivered and partly
  wrong now. Their `Covers` lines, steps and tests-to-change are rewritten (section 3). The work they need is a delta on the
  working tree, not a restart.
- **LAY-T08 (🔄) is unchanged:** its code and its test are exactly what the new layout needs.
- **LAY-T10 (⬜, "remember the collapsed state") is dropped.** There is no "cancelled" status, deleting the task would break
  every reference in CR-20261120-1, and leaving an unbuildable ⬜ would inflate the dashboard forever. It is therefore
  re-scoped to a **spec-only task, "Retire the band's remember-the-state work"**, Covers LAY-BAND-003 (now Deprecated),
  nothing to build, closing ✅ when the owner approves this CR with G1 as its only verification, the same pattern as API-T13
  in CR-20261120-1.
- **New tasks:** LAY-T11 (dialog shell, open on selection, modal behaviour, reopen button, size, themes, reset) and LAY-T12
  (discard confirm, no close while saving, close after save).
- **The three hand-offs** ([LAY-T09](../handoffs/LAY-T09.md), [SUM-T13](../handoffs/SUM-T13.md),
  [LAY-T08](../handoffs/LAY-T08.md)) record work reviewed against the band. Lint check 12 requires a hand-off's `covers` to
  be on its task's Covers line, so the two re-scoped hand-offs had their front matter `covers` reset to the new Covers
  line (LAY-T09: LAY-PANEL-007, LAY-PANEL-008; SUM-T13: SUM-VIEW-001, the one still-proven ID) and `verdict` set from
  `pass` to `pending`, with a "SUPERSEDED" notice on top. Their bodies, including the reviewer's findings, are unchanged
  history. LAY-T08's hand-off got a note only. The implementer writes fresh hand-offs at re-delivery. This is the one
  edit to files that are records, forced by the lint rule; open question (j) asks the owner to confirm it.

## 3. Spec impact

| File | IDs | Change |
|---|---|---|
| changes/CR-20261120-1-owner-decisions-summary-band.md | — | note at the top and in D2: the layout half of D2 is superseded by this CR; Status line extended; text otherwise kept as history |
| changes/CR-20261120-2-summary-dialog.md | — | this CR |
| specs/002-workspace-layout/requirements.md | LAY-PANEL-005, LAY-PANEL-006, LAY-BAND-001..007 | retire (Deprecated); section LAY-R6 marked retired |
| | LAY-PANEL-007, LAY-PANEL-008, LAY-DLG-001..014 | add (📝 Planned); intro, user story, scenarios, new section LAY-R7 |
| specs/002-workspace-layout/design.md | — | components, layout tree (shipped vs planned), summary dialog design, interfaces (`TopBar.summaryButton`, `SummaryDialog`, no `Panel.collapse`), tests that must change, Constitution check |
| specs/002-workspace-layout/tasks.md | LAY-T09, LAY-T10 | re-scoped (LAY-T09 🔄 kept, LAY-T10 spec-only ⬜) |
| | LAY-T11, LAY-T12 | new (⬜); LAY-T08 note; Summary line |
| specs/003-executive-summary/requirements.md | SUM-VIEW-001 | reworded, no behaviour change |
| | SUM-VIEW-005 | retire (Deprecated) |
| | SUM-VIEW-006 | add (📝 Planned); intro and scenarios |
| specs/003-executive-summary/design.md | — | "Planned — the summary dialog", `CustomerDetails` props, tests that must change, Constitution check (V, VI, VII, XII) |
| specs/003-executive-summary/tasks.md | SUM-T13 | re-scoped (🔄 kept) |
| specs/022-ai-account-brief/requirements.md | AIB-GEN-007, -009, -010, -013, -014, AIB-HUMAN-004, -008 | retire (Deprecated) |
| | AIB-GEN-016..020, AIB-HUMAN-009..011 | add (📝 Planned); intro, AIB-API-004 note, AIB-HUMAN-007 note, AIB-GEN-008 and -015 notes, out of scope, scenarios |
| specs/022-ai-account-brief/design.md | — | overview, files, "Flows — dialog states" (where the run state lives, once per selection, cancel rules, unsaved draft, indicator), error table, tests, alternatives, Constitution check |
| specs/022-ai-account-brief/tasks.md | AIB-T06, AIB-T07, AIB-T09, AIB-T10 | Covers, wording and dependencies updated (all still ⬜) |
| specs/017-design-system/messages-catalog.md | — | §5 re-pointed to dialog IDs, the collapsed-band badge retired, two reopen-button rows; §6 is now the summary dialog (collapse names retired; title, Close, reopen button, discard confirm title, description and actions) |
| specs/017-design-system/design.md | — | Executive Summary surface is a dialog |
| specs/024-agent-ops/design.md | — | run-volume note: AIB-GEN-007 → AIB-GEN-016, closing the dialog does not cancel |
| contracts/README.md, contracts/brief-draft.v1.schema.json | — | requirement list: AIB-HUMAN-004 → AIB-HUMAN-009 (metadata only; the schema shape is unchanged, so no v2) |
| steering/constitution-mapping.md | — | rows II, V, VI, VII, XII updated; new section 7 (re-check, no amendment) |
| steering/glossary.md, product.md, tech.md | — | "Summary dialog" (band retired), AI draft and Automatic draft terms, product scope sentence, panel-memory row |
| gates/gap-register.md | LAY-PANEL-004 | row note (ships with LAY-T09; vertical split is the only one left) |
| traceability.md | — | source rows, shared task "Summary dialog", dependency chain |
| README.md | — | changes list, dashboard counts (recounted), next steps |
| handoffs/LAY-T09.md, SUM-T13.md, LAY-T08.md | — | superseded notices; front matter `covers` and `verdict` of the first two reset (see 2.5) |

Checked and unchanged: constitution.md (no amendment), specs/018-accessibility (LAY-DLG cites A11Y-KEY-003 and A11Y-KEY-005
as they are), specs/023-ai-evaluation, specs/024-agent-ops/requirements.md (its scenarios cite only AIB-GEN-008 and
AIB-GEN-012, which stand), agents/*.md (none names the band or the dialog), adr/*, workflow.md, templates, steering/structure.md
and ai-data-policy.md.

**New and re-scoped task Covers lines:**
- LAY-T09 (re-scoped): LAY-PANEL-007, LAY-PANEL-008
- LAY-T10 (re-scoped, spec only): LAY-BAND-003
- LAY-T11 (new): LAY-DLG-001..006, LAY-DLG-010..014
- LAY-T12 (new): LAY-DLG-007, LAY-DLG-008, LAY-DLG-009
- SUM-T13 (re-scoped): SUM-VIEW-001, SUM-VIEW-006
- AIB-T06 (changed): AIB-GEN-017, AIB-GEN-012, AIB-GEN-019, AIB-API-004
- AIB-T10 (re-scoped): AIB-GEN-016, AIB-GEN-008, AIB-GEN-015, AIB-HUMAN-010
- AIB-T07 (re-scoped): AIB-GEN-004, AIB-GEN-011, AIB-GEN-012, AIB-GEN-017..020, AIB-HUMAN-002, -003, -005..007, -009..011, AIB-CITE-004
- AIB-T09 (changed): AIB-GEN-004, -008, -011, -012, -015..020, AIB-HUMAN-002, -003, -005..007, -009..011

**Tests that must change** (all written in the uncommitted band work; each task rewrites them and says so; none is
weakened or deleted just to pass: every behaviour assertion that still applies survives under a new requirement ID, and only
assertions about the retired collapse feature go away with it):
- `tests/component/Panel.test.tsx`, LAY-T09: the `describe("Panel collapse")` block, nine tests (five `LAY-BAND-006 …`, two
  `LAY-BAND-002 …`, one `LAY-BAND-007 …`, and `LAY-SHELL-001 shows no toggle button and never hides the body when collapse is
  absent`), is deleted because the `collapse` prop it tests is removed. The two original `LAY-SHELL-001` tests stay.
- `tests/component/CustomerDetails.test.tsx`, SUM-T13: the band section is replaced. `SUM-VIEW-005 shows the view, Last
  modified and Export …` / `… opens the editor …` / `… exports the summary …` become `SUM-VIEW-006 …` without collapse
  props; `SUM-VIEW-005 behaves as before when no collapse props are passed …` is deleted; the four `LAY-BAND-007 …` tests
  become `LAY-DLG-007/008 …` tests on `onStateChange` and a `LAY-DLG-009 …` test on `onSaved`. `SUM-VIEW-001 …` and the
  twelve earlier tests stay.
- `tests/component/Customers.test.tsx`, LAY-T09 and LAY-T11: the band tests (`LAY-PANEL-006 shows the Executive Summary band
  …`, `LAY-BAND-001/002/004/005 …`) are replaced by `LAY-PANEL-007 …`, `LAY-PANEL-008 …` and `LAY-DLG-… ` tests; the
  vertical-group 60/40 test is kept retitled `LAY-PANEL-007 …`; the `LAY-PANEL-004 …` test stays.
- New: `tests/component/SummaryDialog.test.tsx`, `tests/component/TopBar.test.tsx` (LAY-T11, LAY-T12).

## 4. Risks and rollout

- **Nothing was released.** No data, schema or API change; no migration; Article II.5 untouched. The unreleased band code
  is a working-tree change on this branch.
- **Auto-opening modal on every selection.** A user who mostly works in the grids dismisses it every time (Esc or ×,
  one keystroke, focus returns to a named button). This is what the owner chose; nothing is remembered. If it annoys,
  a "don't open automatically" preference would be its own change (it would need storage, Article II.1).
- **Code that must be unwound:** `Panel.collapse` and its tests, the band in `Customers.tsx`, the `CustomerDetails` collapse
  props. All of it is uncommitted and named in 2.5, so the implementer has a precise delta.
- **Lint rule vs history:** the front-matter reset of two hand-offs (2.5) is a deliberate, noted edit forced by check 12.
- **Radix specifics:** returning focus after an automatic open needs `onCloseAutoFocus` (Radix would otherwise restore
  focus to `body`); the missing-`DialogTitle` warning must be avoided; both are in the design and the G5 checks.
- **AI cost:** unchanged from CR-20261120-1 (one run per selection of a customer without a summary, ≤ $0.50 and 60 s,
  AOPS-BUDG-001); keeping the run alive after the dialog closes (AIB-HUMAN-010) can add completed runs that nobody reads
  when the user dismisses and moves on, bounded by cancel on customer change. Fictional data only (ADR-0006); AI off by default.
- **Order:** LAY-T09, LAY-T11, LAY-T12, SUM-T13 and LAY-T08 ship together (after LAY-T09 the summary is nowhere until the
  dialog renders it). AIB-T10 and AIB-T07 need them. Each task follows the workflow (🔄, hand-off, review, G1–G5).
- **Rollback:** revert the spec commit; CR-20261120-1's band spec returns, together with the code state in the working tree.

## 5. Review

- [x] requirements.md approved by: project owner, 2026-11-20
- [x] design.md approved by: project owner, 2026-11-20
- [x] tasks.md approved by: project owner, 2026-11-20
- [ ] Implementation verified on:

## 6. Open questions for the owner

**Resolved 2026-11-20:** the owner approved every proposal below except (a), which they changed: the dialog is **centred in
the page and 80% of the full width, so that it looks like a popup** (LAY-DLG-011). The proposed answers to (b) to (j)
stand as written.

Each has a proposal; if the owner approves the CR without changing one, that proposal stands.

a. **Dialog size.** *Changed by the owner:* centred horizontally and vertically, 80% of the viewport width wide (≥ 1024px), at most 85vh tall, title bar fixed, body scrolls (LAY-DLG-011). Originally proposed: at most 56rem and 95vw wide.
   Alternatives: narrower (48rem, closer to the add and edit forms at about 50vw), or nearly full-screen at every width.
b. **Reopen button placement and label.** Proposed: in the top bar right of the customer chip, labelled "Executive
   summary", label shown from 640px and icon only below, with the progress and "draft ready" indicator on it (LAY-DLG-010,
   AIB-HUMAN-011). Alternatives: icon only everywhere with a tooltip; a button in the Use Cases or Events panel headers;
   a floating button.
c. **Open automatically when AI is off?** Proposed: **yes**, the dialog opens on every selection whatever the AI setting, as
   the owner's wording ("the summary opens in a dialog on selection") says (LAY-DLG-001, AIB-GEN-019). Alternative: open
   automatically only when there is something to review (a run or a draft), so AI-off users are not interrupted.
d. **Closing the dialog while an AI run is in progress.** Proposed: **keep the run going**; the button shows progress and then
   "AI draft ready", and reopening shows it (AIB-HUMAN-010). Alternative: closing cancels the run (simpler, but the draft the
   auto-run just paid for is lost the moment the user dismisses the auto-opened dialog).
e. **Unsaved AI draft and a customer change.** Proposed: the waiting draft is dropped **without a confirm**, as already
   specified (AIB-HUMAN-007). A confirm is not needed for typed text: it lives in the editor, which cannot be left without
   the discard confirm (LAY-DLG-007), and the modal keeps the customer search inert meanwhile. Alternative: always confirm
   before dropping an AI draft, or confirm only when the draft has been edited and kept (there is no such state in the proposal).
f. **Esc and overlay click while the editor is open.** Proposed: both close the dialog like ×, and **all three ask "Discard
   your unsaved summary changes?" when the editor has unsaved changes** (LAY-DLG-005, -007). Alternative: ignore Esc and
   overlay clicks while the editor is open (only Cancel, Save or × leave), which prevents accidents but traps keyboard users
   who expect Esc.
g. **Dialog below 1024px.** Proposed: a full-screen sheet with the title bar and × in view and the body scrolling
   (LAY-DLG-012). Alternative: the same centred dialog at 95vw and 90vh.
h. **Smaller choices I made, to confirm or change:**
   1. *Initial focus* goes to the dialog itself, not into the text and not to Export, so an automatic open never starts the
      editor and Enter does nothing until the user moves (LAY-DLG-004). Alternative: focus the first control.
   2. *Re-picking the customer that is already open* in the search bar counts as a selection and reopens the dialog; it does
      not restart a run that is running or whose draft is waiting.
   3. *Cancel inside the editor* returns to the summary view inside the dialog (SUM-EDIT-004 as today); it does not close the dialog.
   4. *Failure indicator*: a run that fails while the dialog is closed shows its message when the dialog is reopened; the
      button shows no failure state (AIB out of scope). Alternative: an error badge on the button.
   5. *Discard confirm text*: the catalog had no discard text, so "Discard your unsaved summary changes?" with the description
      "Your changes to the executive summary have not been saved." and the actions *Discard* and *Keep editing* (the second
      reused from the AIB-GEN-011 confirm) are new catalog rows.
i. **After a successful Save, close the dialog?** Proposed: **yes**, toast "Executive summary updated" and the dialog closes
   (LAY-DLG-009), matching the owner's "Save or close the dialog to reach the grids" and the add and edit forms (UCF-ADD-004).
   Alternative: stay open on the saved view, so the new Last modified is visible, until the user closes it.
j. **Process choices:** (1) LAY-T10 re-scoped to a spec-only task that closes with this CR's approval, instead of an invented
   "cancelled" status (2.5); (2) the front-matter `covers` and `verdict` of the LAY-T09 and SUM-T13 hand-offs reset with a
   SUPERSEDED notice, forced by lint check 12 (2.5). Alternative for (2): delete those two files and let the implementer
   recreate them (deleting audit records is not something I did or recommend).
