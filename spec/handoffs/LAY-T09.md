---
contract: task-handoff.v1
task: LAY-T09
agent: AGENT-IMPLEMENTER
covers: [LAY-PANEL-007, LAY-PANEL-008]
files_changed: [src/pages/Customers.tsx, src/components/customers/Panel.tsx, tests/component/Customers.test.tsx, spec/steering/tech.md]
tests: [tests/component/Customers.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: LAY-T09 Full-width grids (done together with LAY-T08, LAY-T11, LAY-T12 and SUM-T13)

This replaces the hand-off of the superseded band delivery. One change implements LAY-T09, LAY-T11, LAY-T12, LAY-T08 and
SUM-T13 (CR-20261120-2); each has its own hand-off, this one covers the layout half.

## What changed
The workspace is Use Cases over Events, nothing else: at >= 1024px one full-width vertical `ResizablePanelGroup`
(`autoSaveId="terra-split-v-v1"`, `usecases` 60 / min 20, `events` 40 / min 20) in the `relative min-h-0 flex-1`
wrapper with the group `absolute inset-0`; below 1024px Use Cases then Events stacked, each `max-h-[60vh]`. The band is
gone: no `CustomerDetails` element in the workspace, no `max-h-[40%]` / `max-h-[60vh]` wrapper, no `summaryCollapsed` /
`toggleSummary`, no `band` props object. `Panel` is the LAY-SHELL-001 shell again: the `collapse` prop, `PanelCollapse`
type, chevron, `useId`, `useRef`, `useLayoutEffect`, `hidden` handling and the body `id` are removed; the only addition
is an optional `titleId` (the design's "generic optional `titleId`", used by the dialog for `aria-labelledby`). The
Executive Summary now opens as a dialog (LAY-T11). `spec/steering/tech.md` panel-memory row says `terra-split-v-v1` only.

## Criteria -> evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| LAY-PANEL-007 | `Customers.test.tsx`: "LAY-PANEL-007 shows only Use Cases over Events: no band, no summary panel, no horizontal split, no collapse control"; "LAY-PANEL-007 splits Use Cases over Events in one vertical group of two panels at 60% and 40%" (the old 60/40 test, retitled). One viewport tall with no page scroll and the grids filling the width: manual G5 |
| LAY-PANEL-008 | `Customers.test.tsx`: "LAY-PANEL-008 stacks Use Cases, then Events, with no resizable group and no summary in the stack"; "LAY-PANEL-008 limits each stacked panel to 60vh" (class check). Page scrolls below 1024px: manual G5 |
| LAY-SHELL-001 (kept) | `Panel.test.tsx`: the two original tests, unchanged |

Tests removed, as the task says (the prop they test is gone): the nine `describe("Panel collapse")` tests in
`Panel.test.tsx` (five `LAY-BAND-006`, two `LAY-BAND-002`, one `LAY-BAND-007`, "LAY-SHELL-001 shows no toggle button and
never hides the body when collapse is absent"), retired by LAY-T09 (CR-20261120-2). In `Customers.test.tsx` every band
test is replaced: `LAY-PANEL-006 shows the Executive Summary band …`, `LAY-BAND-001` (two), `LAY-BAND-002` (two),
`LAY-BAND-004`, `LAY-BAND-005` (two) became the `LAY-PANEL-007` / `LAY-PANEL-008` tests above. The `LAY-PANEL-004` test is
kept as it was (see LAY-T08.md).

Verified to fail against the previous code: with `Customers.tsx`, `Panel.tsx`, `CustomerDetails.tsx` and `TopBar.tsx`
temporarily reset to `HEAD` (then restored, checked with `cmp`), both `LAY-PANEL-007`, `LAY-PANEL-008` and
`LAY-PANEL-004` tests failed (HEAD still has the horizontal group and the right-hand panel); 44 of the 75 tests in the five
component files touched by this change failed in total. `Panel.test.tsx` passes on both, as it should (the shell did not
change).

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | spec_lint: 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 16 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (all `react-refresh/only-export-components`, the same 8 as before, none in a file this change adds); typecheck clean |
| G4 | `npm test` | 16 files passed; 163 passed + 1 expected fail (`it.fails`), 164 total |
| G5 | manual | not done: no browser available to the implementer |

## G5 manual checks a person still has to do (light and dark themes, >= 1024px and < 1024px)
1. >= 1024px: Use Cases over Events fill the viewport width, the page does not scroll (LAY-PANEL-001), the
   `absolute inset-0` group fills its wrapper (the grids must not collapse to zero height), no right-hand panel, no band.
   Close the summary dialog first, it covers the grids.
2. < 1024px: Use Cases, then Events, each at most 60vh, the page scrolls.
3. Both themes: nothing of the old band or panel is visible.
(The dialog's own G5 list is in LAY-T11.md; the divider drag-and-reload check is in LAY-T08.md.)

## Open questions
- `tech.md` (under `spec/`) was edited: the panel-memory row described `terra-split-h-v3` as the current key and the new
  one as planned; it is now `terra-split-v-v1` only. Outside the implementer's usual files, so listed here for the reviewer.
- None blocking. The orchestrator closes tasks, requirement statuses, gap register, dashboard and traceability.

## Surprises
- The saved-split behaviour cannot be seen in jsdom (see LAY-T08.md).
- In jsdom on the desktop layout `react-resizable-panels` swallows pointer-down events because jsdom reports every box at
  (0, 0): it takes a click for a grab of the divider (`preventDefault`, so the clicked input is not focused). A browser
  knows the dialog is above the divider and ignores it. Tests that must type into the editor on the desktop layout
  focus it directly (`typeAtEnd` in `Customers.test.tsx`).

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
