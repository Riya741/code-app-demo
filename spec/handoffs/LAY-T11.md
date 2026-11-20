---
contract: task-handoff.v1
task: LAY-T11
agent: AGENT-IMPLEMENTER
covers: [LAY-DLG-001, LAY-DLG-002, LAY-DLG-003, LAY-DLG-004, LAY-DLG-005, LAY-DLG-006, LAY-DLG-010, LAY-DLG-011, LAY-DLG-012, LAY-DLG-013, LAY-DLG-014]
files_changed: [src/components/customers/SummaryDialog.tsx, src/pages/Customers.tsx, src/components/customers/TopBar.tsx, tests/component/Customers.test.tsx, tests/component/SummaryDialog.test.tsx, tests/component/TopBar.test.tsx]
tests: [tests/component/Customers.test.tsx, tests/component/SummaryDialog.test.tsx, tests/component/TopBar.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: LAY-T11 Summary dialog (done together with LAY-T09, LAY-T12, LAY-T08 and SUM-T13)

One change (CR-20261120-2) implements five tasks; each has its own hand-off. This one covers the dialog shell, the
page wiring and the top-bar button. Close rules (discard confirm, no close while saving, close after save) are LAY-T12.md;
the `CustomerDetails` props are SUM-T13.md; the layout is LAY-T09.md and LAY-T08.md. No AI behaviour or indicator is built.

## What changed
- New `src/components/customers/SummaryDialog.tsx` on the existing `Dialog` (content mounted only while open, CONV-004; I
  did not edit `src/components/ui/`). `DialogContent` has `tabIndex={-1}`, `aria-labelledby` = the id of the panel's
  visible "Executive Summary" heading (so the name is given once, no hidden second heading), `onOpenAutoFocus` prevented
  and the focus put on the container (the editor is not started; Enter does nothing until the user moves focus), and
  `onCloseAutoFocus` prevented and the focus put on the reopen button (a ref owned by the page). Esc, the shared "Close"
  button and the overlay all go through `onOpenChange` (LAY-T12 rules). `CustomerDetails` is inside.
- Size (LAY-DLG-011/012): the shared content keeps `fixed … translate-x/y-1/2`. Classes: below 1024px a full-screen
  sheet `left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none`; from `lg:` it is centred,
  `lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[80vw] lg:max-h-[85vh] lg:h-auto lg:rounded-lg`,
  with `max-w-none p-0 gap-0 overflow-hidden flex flex-col` overriding the shared `max-w-lg p-6 gap-4`. The `Panel` inside
  (through `CustomerDetails`' `className`) is `min-h-0 flex-1 rounded-none border-0 shadow-none !animate-none`, so the
  header is the fixed title bar and the panel body (`min-h-0 flex-1 overflow-auto`) scrolls. The header gets `pr-10`
  (`[&>header]:pr-10`) and the shared × button is moved to `right-3 top-2` (`[&>button]:…`) so it does not sit on Last
  modified / Export and lines up with the 32px title bar. Stone summary colours kept, tokens elsewhere.
- `Customers.tsx`: `summaryOpen` state; `select` (both search boxes) sets the row and `summaryOpen` true; `clear` sets
  null and false; nothing watches `selected` in an effect. The dialog is rendered next to the workspace and keyed by
  customer like it, so a customer change drops the editor state; a new selection reopens it. The "Executive summary"
  button (ghost `Button`, `FileText` icon `aria-hidden`, label `<span class="hidden sm:inline">`, `aria-label="Executive
  summary"`) is built there, only while a customer is selected, owns `summaryButtonRef`, and reopens on click.
- `TopBar.tsx`: optional `summaryButton` slot, rendered (in a `shrink-0` wrapper) right of the chip and before the
  search slot, only when a customer is selected.
- Texts: only "Executive Summary", "Close" (the shared `Dialog`'s own) and "Executive summary", all in catalog §6; the
  catalog has no tooltip for the button, so none was added.

## Criteria -> evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| LAY-DLG-001 | `Customers.test.tsx`: "LAY-DLG-001 opens the summary dialog when a customer is chosen, with AI off, and shows no dialog on the landing page" (hero search box); "LAY-DLG-001 opens the dialog again when a customer is chosen in the top-bar search box"; "LAY-DLG-001 opens the summary dialog on selection when the screen is narrow too" |
| LAY-DLG-002 | `Customers.test.tsx`: "LAY-DLG-002 does not reopen a closed dialog when the customer list is refetched with a changed row"; "LAY-DLG-002 neither closes nor resets the open dialog, or its editor and draft, when the row is refetched"; "LAY-DLG-002 does not reopen a closed dialog after Refresh brings back a changed row"; "LAY-DLG-002 closes after a save, shows the stored summary when reopened, and does not pop open again when the data arrives" |
| LAY-DLG-003 | `SummaryDialog.test.tsx`: "LAY-DLG-003 is a modal dialog named Executive Summary by its single visible title, with the page behind it hidden"; "LAY-DLG-003 logs no Radix title or description warning"; "LAY-DLG-003 mounts its content only while open and shows the summary, Last modified and Export" |
| LAY-DLG-004 | `SummaryDialog.test.tsx`: "LAY-DLG-004 puts the focus on the dialog itself, not in the editor, and Enter does not start editing"; "LAY-DLG-004 keeps Tab and Shift+Tab inside the dialog" |
| LAY-DLG-005 | `SummaryDialog.test.tsx`: "LAY-DLG-005 closes on Esc, and the content is gone"; "… closes with the Close button"; "… closes when the overlay is clicked"; "… does not close when a click lands inside the dialog". The grids being usable afterwards: manual G5 |
| LAY-DLG-006 | `SummaryDialog.test.tsx`: "LAY-DLG-006 moves the focus to the reopen button after Esc, although the dialog was opened automatically"; "… after the Close button"; "… after a click on the overlay"; "LAY-DLG-006 reopens from the button and returns the focus to it again". `Customers.test.tsx`: "LAY-DLG-006 returns the focus to the top-bar button when the automatically opened dialog is closed" (the real page wiring) |
| LAY-DLG-010 | `TopBar.test.tsx`: "LAY-DLG-010 shows the summary button right of the customer chip and before the search slot"; "… shows no summary button when no customer is selected"; "… renders the bar as before when no summary button is given". `Customers.test.tsx`: "LAY-DLG-010 shows the button only while a customer is selected"; "… names the button Executive summary at every width and shows its label only from 640px" (class check `hidden sm:inline`, `aria-label`, icon `aria-hidden`); "… reopens the dialog on click, and Enter and Space also operate it"; "… puts the button next to the customer chip in the top bar". The visible focus ring: manual G5 |
| LAY-DLG-011 | `SummaryDialog.test.tsx`: "LAY-DLG-011 is centred, 80vw wide and at most 85vh tall from 1024px up, with a fixed title bar over a scrolling body" (classes only). Real centring, 80% width, 85vh, scrolling: manual G5 (jsdom has no layout) |
| LAY-DLG-012 | `SummaryDialog.test.tsx`: "LAY-DLG-012 fills the viewport as a sheet below 1024px, with the title bar and Close button in view" (classes only). Real sheet: manual G5 |
| LAY-DLG-013 | `SummaryDialog.test.tsx`: "LAY-DLG-013 takes the dialog colours from tokens, keeps the stone summary scheme, and drops the panel's own card chrome" (classes only). Legibility in both themes: manual G5 |
| LAY-DLG-014 | `Customers.test.tsx`: "LAY-DLG-014 opens the dialog for the new customer when another customer is chosen after closing it"; "LAY-DLG-014 drops the editor and its draft without a confirmation when the customer changes while the dialog is open"; "LAY-DLG-014 closes the dialog and shows the landing page when the selection is cleared"; "LAY-DLG-014 opens the dialog again when the same customer is chosen again after being cleared" |

Verified to fail against the previous code: with `Customers.tsx`, `Panel.tsx`, `CustomerDetails.tsx` and `TopBar.tsx` reset to
`HEAD` (then restored, checked with `cmp`), 44 of the 75 tests in the five touched component files failed, among them every
`LAY-DLG-001/002/010/014` page test, the `LAY-DLG-006` page test, `TopBar` "right of the customer chip", and the dialog tests
that need the new `CustomerDetails` callbacks. Mutation checks on the new code (each reverted, checked with `cmp`):
opening the dialog from an effect on `selected` fails the three `LAY-DLG-002` tests that follow a refetch, Refresh and a
save; removing the saving guard fails both `LAY-DLG-008` tests; removing the `onOpenAutoFocus` / `onCloseAutoFocus`
handlers fails the `LAY-DLG-004` tests (2), every `LAY-DLG-006` test (5) and the `LAY-DLG-007` Discard, `LAY-DLG-007` "drops the
discarded text" and `LAY-DLG-009` success tests that check where focus lands.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | spec_lint: 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 16 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (all `react-refresh/only-export-components`, the same 8 as before; none in a file this change adds); typecheck clean |
| G4 | `npm test` | 16 files passed; 163 passed + 1 expected fail (`it.fails`), 164 total |
| G5 | manual | not done: no browser available to the implementer |

## G5 manual checks a person still has to do (light and dark themes; >= 1024px and < 1024px)
1. >= 1024px: pick a customer; the dialog is centred horizontally and vertically, 80% of the viewport width, no taller than
   85vh, over the dimmed grids; the title bar ("Executive Summary", Last modified, Export, ×) stays in view and the
   body scrolls. Try an empty summary (short dialog), a long summary (stops at 85vh, body scrolls under the fixed title bar).
2. The × button sits at the right of the title bar without covering Last modified / Export, and lines up with the title.
3. < 1024px (e.g. 800px): the dialog is a full-screen sheet; title bar and × in view; body scrolls. Look at the open
   animation on the sheet (the shared content slides in from the left half; check it is not ugly).
4. Overlay, dialog and the top-bar button are legible in both themes; the stone summary colours look right in both.
5. Top-bar button: icon only below 640px, icon and label from 640px, name "Executive summary" at both (screen reader or
   inspector); visible focus ring; Enter and Space operate it; it is not there on the landing page; chip and button fit
   on a narrow top bar with a long customer name.
6. Focus: on opening, focus is on the dialog (no cursor in the text, no editor); Tab and Shift+Tab stay inside; Esc, ×,
   and a click outside close it; focus lands on the "Executive summary" button; clicking the button reopens it.
7. Open once per selection: close it, click Refresh, save an edit elsewhere or wait: it does not reopen. Pick another
   customer: it opens for that one. Click the chip's × then pick a customer: it opens.
8. Repeat the SUM-T09 checks inside the dialog (click and Enter to edit, lazy editor, Cancel, Save, save error with Excel
   open, Word export). Quill in a dialog: toolbar dropdowns (size, colour) are not clipped by `overflow-hidden`, and typing
   a long summary scrolls the body, not the page.
9. The grids are usable (scroll, filter, edit a use case) after closing the dialog, and the divider is draggable.

## Open questions
- Design says `CustomerDetails({ row, className?, onSaved?, onStateChange? })`; to name the dialog by its visible
  title (LAY-DLG-003) it also takes an optional `titleId` that it passes to `Panel` (`Panel` has the design's optional
  `titleId`). The design allows the `Panel` prop "if needed" but not the `CustomerDetails` one: please confirm or tell me
  to use another way (the design's other option, `DialogTitle asChild`, cannot wrap the `Panel`'s own `h2`).
- Radix Dialog 1.3.1 (installed) logs no missing-title warning at all, and an explicit `aria-labelledby` wins over its own,
  so the design's `aria-labelledby` route is the one used, not `DialogTitle asChild`. A test pins "no console error or warning".
- The sheet below 1024px uses `left-0 top-0` with `h-dvh w-screen` rather than `inset-0`: `inset-0` would also set
  `bottom-0`/`right-0` and, with `lg:h-auto`, stretch the popup to full height on desktop.
- None blocking otherwise. The orchestrator closes tasks, requirement statuses, gap register and traceability.

## Surprises
- `react-resizable-panels` in jsdom swallows pointer-down events on the desktop layout (every jsdom box is at (0, 0), so a
  click is taken for a grab of the divider); a browser, with real boxes, ignores it for the dialog above the divider (the
  library has code for "a modal above a handle"). Tests that type into the editor on that layout focus it directly.
  Nothing to fix in the app, but G5 item 9 (divider usable, and clicking in the dialog over the divider's height still
  focuses the editor) is the check that proves it in a browser.
- react-query notifies the page in a timer, so a test that changes the query cache must let it run before asserting
  (`refetchWith` in `Customers.test.tsx`); my first version of the two `LAY-DLG-002` cache tests passed vacuously and was
  corrected after a mutation check showed it.
- While the discard confirm is open, the dialog behind it is `aria-hidden` (Radix hides everything but the top layer), so
  a test must query it with `hidden: true`.

## Review
**G5 recorded 2026-11-20 by the owner:** all 11 manual checks passed in light and dark themes at ≥ 1024px and < 1024px; the missing focus ring on the dialog container (A11Y-KEY-005 finding) was accepted.

**Verdict: pass** (AGENT-REVIEWER, 2026-11-20) for code and tests of the one change LAY-T09, LAY-T11, LAY-T12, LAY-T08,
SUM-T13. **G5 is not done**: the task stays 🔄 until the owner records the manual checks. G1, G3, G4 pass (spec lint 0 errors;
lint 0 errors, 8 existing warnings; typecheck clean; 16 files, 163 passed + 1 expected fail). The superseded band
delivery and its earlier review are in git at b16dec2.

Findings (no blocker, no major):
- [minor] LAY-DLG-007/008: `requestClose` (SummaryDialog.tsx) reads the state `CustomerDetails` reports from an effect, a
  few ms behind; an Esc/×/overlay in that window after Save or the first keystroke sees the old state. Not reachable by
  a person in practice; optional hardening: derive `saving` synchronously (e.g. `useIsMutating`).
- [minor] LAY-DLG-006/007: the `discarded` ref in SummaryDialog.tsx is dead (reset by the `[open]` effect before the
  confirm's deferred `onCloseAutoFocus`); focus still lands on the reopen button through the Dialog's own handler. Tested.
- [minor] A11Y-KEY-005: the dialog container that takes the initial focus has `outline-none`; decide at G5 whether to add
  a focus-visible style or record the exception in the 002 design.
- [minor] LAY-DLG-001/002 (CR question h): no test re-picks the already-selected customer from the top-bar search without
  clearing; the code reopens it without a remount.
- [minor] LAY-DLG-012: tailwindcss-animate enter/exit classes are not merged away, so the narrow-screen sheet may sweep in
  from the upper left; check at G5.
- [minor] CLAUDE.md rule 6: `CustomerDetails.titleId`, `onStateChange` on mount, `left-0 top-0` instead of `inset-0`,
  the moved × (`[&>button]:right-3 top-2`, header `pr-10`) and the destructive *Discard* go beyond the design text;
  all accepted, the design and Source fields are updated at close.
- [minor] Hand-off accuracy: front matter `G5: n/a` although G5 applies (the contract has no "pending"); LAY-T09
  `files_changed` lists `tests/component/Panel.test.tsx`, which equals HEAD.

Checked clean: every Covers ID has tests titled with its ID; `summaryOpen` only set by select/clear (no effect on
`selected`); focus start, trap and return on every close path; `Panel.tsx` = HEAD shell + `titleId`; `Panel.test.tsx`
identical to HEAD; no `src/components/ui/` edits, no `fetch` in components, no AI code, no band leftovers; texts match
catalog §6; tokens only; the 12 earlier CustomerDetails tests and SUM-VIEW-001 unchanged; no test weakened.
