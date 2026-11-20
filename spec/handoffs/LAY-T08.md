---
contract: task-handoff.v1
task: LAY-T08
agent: AGENT-IMPLEMENTER
covers: [LAY-PANEL-004]
files_changed: [src/pages/Customers.tsx, tests/component/Customers.test.tsx]
tests: [tests/component/Customers.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
> **Note 2026-11-20 (spec author, [CR-20261120-2](../changes/CR-20261120-2-summary-dialog.md)).** LAY-T08 is not
> re-scoped and its front matter and verdict are unchanged: `autoSaveId="terra-split-v-v1"` on the vertical group and
> its test are what the dialog layout needs. The band, collapse and `LAY-BAND-…` parts described below were superseded
> by CR-20261120-2 (see the notice in [LAY-T09.md](LAY-T09.md)); read them as history. G5 for LAY-T08 is still open.

# Hand-off: LAY-T08 Persist the vertical split size (delivered in one change with LAY-T09; the full write-up is spec/handoffs/LAY-T09.md)

This one change implements three tasks: **LAY-T09** (band layout and the `Panel` `collapse` prop), **SUM-T13**
(`CustomerDetails` takes the collapse props and disables collapsing while editing or saving; Covers SUM-VIEW-001,
SUM-VIEW-005, LAY-BAND-007) and **LAY-T08** (Covers LAY-PANEL-004: `autoSaveId="terra-split-v-v1"` on the vertical group,
misleading comment fixed). The front matter `covers` lists only LAY-T09's Covers line (lint check 12); the SUM-T13 and
LAY-T08 IDs are in the evidence table below. LAY-T10 (storing the collapsed state), any AI behaviour and LAY-TOP-004 are
not built.

## What changed
- `Panel` has an optional `collapse?: { collapsed; onToggle(); disabled? }`. When set, the header gets a real `<button>`
  with `aria-expanded` and `aria-controls` = the body id (`useId`), whose accessible name is `Collapse <title>` /
  `Expand <title>` with the title in lower case, so "Executive Summary" gives exactly "Collapse executive summary" /
  "Expand executive summary" (the catalog §6 names) without a label prop; icon ChevronDown / ChevronRight (lucide), focus
  ring `ring-ring`, `disabled` honoured. The body gets `hidden` when collapsed but stays mounted. A layout effect moves
  focus to the toggle when the panel collapses while `document.activeElement` is inside the body (LAY-BAND-006). The
  header drops its bottom border while collapsed. Without `collapse` the panel renders as before (the body div now also
  carries an `id`, nothing else).
- `CustomerDetails` takes optional `collapsed` and `onToggleCollapsed`; when `onToggleCollapsed` is given it passes
  `collapse` to its `Panel` with `disabled: editing || saving` (`saveSummary.isPending`). Without the props nothing
  changes. No other summary behaviour was touched.
- `Customers.tsx`: the horizontal group (`terra-split-h-v3`) and the right-hand panel are gone. Desktop is
  `div flex h-full flex-col gap-4` -> `CustomerDetails` (`max-h-[40%] shrink-0`, body scrolls via the panel's
  `overflow-auto`) -> `div relative min-h-0 flex-1` holding the `ResizablePanelGroup direction="vertical"
  autoSaveId="terra-split-v-v1"` (`absolute inset-0`, the same sized-positioned-parent pattern as before) with
  `usecases` 60 (min 20) and `events` 40 (min 20). Narrow: band (`max-h-[60vh]`), Use Cases, Events stacked as before.
  The collapsed flag is `useState(false)` in `Customers`, above the `key={key}` workspace, so it survives a customer
  change; no storage (LAY-T10). Comments updated to the new layout.

## Criteria -> evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| LAY-PANEL-006 | `Customers.test.tsx`: "LAY-PANEL-006 shows the Executive Summary band before Use Cases and Events, with no horizontal split or right-hand panel"; "LAY-PANEL-006 splits Use Cases over Events in one vertical group of two panels at 60% and 40%". Pixel layout at >= 1024px: manual G5 |
| LAY-PANEL-004 (LAY-T08) | `Customers.test.tsx`: "LAY-PANEL-004 gives the vertical Use Cases / Events group the autoSaveId terra-split-v-v1 and renders no other group". Saving on drag and restore after reload: manual G5 (see surprises) |
| LAY-BAND-001 | `Customers.test.tsx`: "LAY-BAND-001 puts the band in the workspace as a full-width sibling above the grids, not inside any panel"; "LAY-BAND-001 keeps the band above both grids and the collapsed state across a customer change when narrow" |
| LAY-BAND-002 | `Customers.test.tsx`: "LAY-BAND-002 starts expanded; the control collapses the band to its header row and expands it again"; "LAY-BAND-002 keeps the collapsed state when another customer is picked (the state lives above the keyed workspace)". `Panel.test.tsx`: "LAY-BAND-002 hides the body when collapsed but keeps it mounted, keeps the header visible, and expanding restores it"; "LAY-BAND-002 can start collapsed". The grids growing into the freed height: manual G5 |
| LAY-BAND-004 | `Customers.test.tsx`: "LAY-BAND-004 caps the expanded band at 40% of the workspace and lets its body scroll" (class check only). Real heights: manual G5 |
| LAY-BAND-005 | `Customers.test.tsx`: "LAY-BAND-005 stacks the band first, then Use Cases, then Events, with no resizable group"; "LAY-BAND-005 limits the expanded band to 60vh and shows only the header row when collapsed" |
| LAY-BAND-006 | `Panel.test.tsx`: "LAY-BAND-006 names the toggle Collapse executive summary when expanded and Expand executive summary when collapsed"; "LAY-BAND-006 sets aria-expanded to match the state and aria-controls to the body that holds the content"; "LAY-BAND-006 moves the focus to the toggle when the band collapses while focus is inside the body"; "LAY-BAND-006 does not steal the focus when the band collapses while focus is elsewhere"; "LAY-BAND-006 toggles with the Enter key and with the Space key". Visible focus ring: manual G5 |
| LAY-BAND-007 | `Panel.test.tsx`: "LAY-BAND-007 disables the toggle when collapse.disabled is set and does not toggle on click". `CustomerDetails.test.tsx`: "LAY-BAND-007 leaves the collapse control enabled while the summary is only being viewed"; "... disables the collapse control while the editor is open and enables it again after Cancel"; "... keeps the collapse control disabled while a save is pending and enables it when the save finishes"; "... keeps the collapse control disabled after a failed save, because the editor is still open" |
| SUM-VIEW-001 (SUM-T13) | `CustomerDetails.test.tsx`: "SUM-VIEW-001 is still titled Executive Summary and does not repeat the customer name or ID" |
| SUM-VIEW-005 (SUM-T13) | `CustomerDetails.test.tsx`: "SUM-VIEW-005 shows the view, Last modified and Export in the collapsible band, and keeps the view mounted when collapsed"; "SUM-VIEW-005 opens the editor inside the band, and Save and Cancel work as before with the collapse props passed"; "SUM-VIEW-005 exports the summary from the band header"; "SUM-VIEW-005 behaves as before when no collapse props are passed: no collapse control". The 12 existing tests in that file pass unchanged |
| LAY-SHELL-001 | `Panel.test.tsx`: the two existing tests pass unchanged; added "LAY-SHELL-001 shows no toggle button and never hides the body when collapse is absent" |

Verified to fail against the old code: with `Panel.tsx`, `CustomerDetails.tsx` and `Customers.tsx` temporarily reset to
`HEAD` (then restored), 22 of the 62 component tests failed: every `LAY-BAND-002/004/006/007` test, both
`LAY-PANEL-006` tests, `LAY-PANEL-004`, the `LAY-BAND-001` desktop test, the narrow `LAY-BAND-005` 60vh/collapse test, the
narrow `LAY-BAND-001` test and the two band `SUM-VIEW-005` tests. The tests that pass on both are the ones that assert
behaviour that did not change (narrow stack order, `SUM-VIEW-001` title, `SUM-VIEW-005` "no props" and export, the
`LAY-SHELL-001` tests).

Test helpers: `Customers.test.tsx` stubs `window.matchMedia` per describe block, seeds the query cache with two fictional
customers (never stale, so nothing is fetched), and replaces `SearchBox` and `ParentActivity` with small stand-ins so the
test stays on layout. It also wraps `ResizablePanelGroup` to record the props it is rendered with (the real group still
renders). `CustomerDetails.test.tsx` now mocks `@/lib/wordDoc` (no existing test used the export).

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | spec_lint: 26 specs, 519 requirements, 237 tasks, 12 agents, 6 contracts, 5 prompts, 12 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (all `react-refresh/only-export-components`, in files this change does not add; the `CustomerDetails.tsx` one is the existing `fmtUtc` export); typecheck clean |
| G4 | `npm test` | 14 files passed; 127 passed, 1 expected fail (`it.fails`), 128 total |
| G5 | manual | not done: no browser available to the implementer |

Smoke test: with a generated fixture workbook (`--customers 8`, kept in the session scratchpad, not in the repo) the dev
server started on http://localhost:3001 (port 3000 was already taken by another process, so Vite moved on) and served `/`,
`/src/pages/Customers.tsx`, `/src/components/customers/Panel.tsx` and `/api/workbook/table/customer` with HTTP 200. That
proves it compiles and serves, nothing about how it looks.

## G5 manual checks a person still has to do (light and dark themes, >= 1024px and < 1024px)
1. At >= 1024px: the band spans the full width above Use Cases over Events; the page does not scroll (LAY-PANEL-001); no
   right-hand panel. Check the `absolute inset-0` group really fills the flex-1 wrapper (the grids must not collapse to
   zero height or overflow the viewport).
2. Short summary: band is as tall as its content. Long summary: band stops at 40% of the workspace and scrolls inside;
   the header stays put (LAY-BAND-004). Empty summary: "No executive summary yet. Click to add one." shows.
3. Collapse: only the header row remains (title, Last modified, Export), the grids take the freed height; expand
   restores; the chevron and the focus ring are visible in both themes (A11Y-KEY-005). Keyboard: Tab to the chevron,
   Enter and Space toggle it.
4. Collapse, then pick another customer: still collapsed. Reload: expanded again (storage is LAY-T10).
5. Open the editor: the chevron is dimmed and inert; Save in progress: still inert; Cancel / successful Save: usable.
6. Repeat the SUM-T09 checks inside the band: click and Enter to edit, lazy editor, Cancel, Save (toast, new Last
   modified), save error (close Excel lock case), Word export; HTML sanitising still applies.
7. LAY-PANEL-004: drag the Use Cases / Events divider, reload, open a customer: split restored; DevTools ->
   localStorage shows `react-resizable-panels:terra-split-v-v1` and the old `terra-split-h-v3` entry is no longer touched.
8. < 1024px: band (<= 60vh, scrolls inside), Use Cases, Events stacked, the page scrolls; collapsed band is just its
   header.

## Open questions
- None blocking. The G5 list above needs a person; the orchestrator closes tasks, requirement statuses, gap register
  and traceability.
- Housekeeping for the orchestrator: lint check 12 requires one file per task, so `spec/handoffs/SUM-T13.md` and
  `spec/handoffs/LAY-T08.md` do not exist; copy this file if wanted (with `task:` and `covers:` changed to that task's
  own line).

## Surprises
- The saved-split behaviour cannot be observed in jsdom: Vitest loads `react-resizable-panels` through Node's `node`
  export condition, which is the server build; there its layout effects never compute or save a layout (a minimal group
  with an `autoSaveId` wrote nothing to `localStorage`). So the LAY-PANEL-004 test checks the `autoSaveId` handed to the
  group, not a save/restore round trip. Changing `vitest.config.ts` (for example inlining that package) would make it
  testable, but that file is outside this task, so I left it.
- Port 3000 was already in use during the smoke test (see above).
- Percent `max-h-[40%]` works because the chain main (`flex-1 min-h-0` in a `h-screen` column) -> `h-full` column has a
  definite height; this is the part most likely to need a tweak after G5.

## Review
**Verdict: pass** (AGENT-REVIEWER, 2026-11-20) for the code and tests. **G5 is not done**, so the three tasks (LAY-T09,
SUM-T13, LAY-T08) stay 🔄 until the owner records the manual checks above. G1, G3 and G4 pass (spec lint 0 errors; lint
0 errors, 8 existing warnings; typecheck clean; 14 files, 127 passed + 1 expected fail).

Findings (no blocker, no major):
- [minor] LAY-BAND-004, LAY-PANEL-006, LAY-BAND-002 (grids take the freed height): the jsdom tests assert classes and
  structure only; the 40% cap, the internal scroll and the remainder fill are layout and depend on G5 (items 1-3).
  Reading the code, the percent cap should resolve (`main` is `lg:min-h-0 lg:flex-1` in an `h-screen` flex column, then
  `h-full`, then `max-h-[40%]`); if it did not, the band would be uncapped and push the grids out. Check in Chrome and Edge.
- [minor] LAY-PANEL-004: the only automated evidence is the `autoSaveId="terra-split-v-v1"` prop and that no other group
  renders (save and restore belong to react-resizable-panels, which loads its server build in jsdom). LAY-PANEL-004 and
  LAY-T08 go to ✅ only after G5 item 7 (drag, reload, split restored) is recorded.
- [minor] LAY-BAND-006 / Article V: the toggle's name is built as `Collapse|Expand <title in lower case>` instead of being
  read from the messages catalog. It matches the catalog exactly for "Executive Summary" and both names are pinned by
  tests; a future Panel title would change the name silently. Accepted for now.
- [minor] Front matter `gates: {G5: n/a}` understates that G5 applies and is outstanding (the contract has no "pending");
  set it to `pass` when the owner's checks are recorded.
- [minor] LAY-BAND-001, -005: `ParentActivity` and `SearchBox` are mocked in `Customers.test.tsx`, so the grids are
  stand-ins; ordering and nesting are covered, `max-h-[60vh]` is a class assertion (G5 item 8).

Criteria: LAY-BAND-002, -006, -007 and SUM-VIEW-001/005 are proven by behavioural tests (toggle, `aria-expanded`/
`aria-controls`, Enter/Space, focus move, disabled while editing, saving and after a failed save, the 12 existing
CustomerDetails tests unchanged). LAY-PANEL-006 and LAY-BAND-001/004/005 are implemented and proven structurally.
Scope: no localStorage (LAY-T10), no AI, no right-hand panel code, no dead imports, no `fetch` in components, tokens only,
no test weakened or deleted.
