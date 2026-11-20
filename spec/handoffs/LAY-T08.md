---
contract: task-handoff.v1
task: LAY-T08
agent: AGENT-IMPLEMENTER
covers: [LAY-PANEL-004]
files_changed: [src/pages/Customers.tsx, tests/component/Customers.test.tsx]
tests: [tests/component/Customers.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: LAY-T08 Persist the vertical split size (done together with LAY-T09, LAY-T11, LAY-T12 and SUM-T13)

This is a fresh hand-off for the re-delivered change; it replaces the earlier one (which carried a reviewer verdict of
pass for the band delivery). The code is unchanged in substance; the comments and the file around it were reworked.

## What changed
The vertical Use Cases / Events `ResizablePanelGroup` has `autoSaveId="terra-split-v-v1"`, and it is the only resizable
group left (LAY-T09 removed the horizontal one, whose `terra-split-h-v3` entry is no longer read). The comment in
`Customers.tsx` above the workspace says what is true now: on desktop the divider is draggable and its size is remembered
(`autoSaveId`), on small screens the panels stack; the summary is a dialog, not part of the workspace. The misleading old
comment ("every divider … sizes are remembered") is gone. `spec/steering/tech.md` panel-memory row says `terra-split-v-v1`
only (LAY-T09.md).

## Criteria -> evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| LAY-PANEL-004 | `Customers.test.tsx`: "LAY-PANEL-004 gives the vertical Use Cases / Events group the autoSaveId terra-split-v-v1 and renders no other group" (kept as it was; it records the props every group is rendered with and expects exactly `vertical:terra-split-v-v1`). Saving on drag and restoring after a reload: manual G5 only |

Verified to fail against the previous code: with `Customers.tsx` reset to `HEAD` (horizontal `terra-split-h-v3` group plus an
unsaved inner group) the `LAY-PANEL-004` test fails.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | spec_lint: 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 16 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (same 8 as before, none from this change); typecheck clean |
| G4 | `npm test` | 16 files passed; 163 passed + 1 expected fail (`it.fails`), 164 total |
| G5 | manual | not done: no browser available to the implementer |

## G5 manual check a person still has to do
At >= 1024px: pick a customer, close the summary dialog, drag the Use Cases / Events divider, reload, pick a customer: the
split is restored. DevTools -> Local Storage shows `react-resizable-panels:terra-split-v-v1`, and nothing writes
`terra-split-h-v3` any more. LAY-PANEL-004 and LAY-T08 go to done only after this is recorded (both themes need no extra
check; it is not theme-dependent).

## Open questions
- None blocking. Note for the orchestrator: the task note said the earlier LAY-T08 hand-off "stays valid"; I replaced it as
  instructed, so its reviewer verdict (pass) is gone and `verdict` is `pending` again.

## Surprises
- The saved-split behaviour cannot be observed in jsdom: Vitest loads `react-resizable-panels` through its non-browser
  build, where the layout effects never compute or save a layout. So the test checks the `autoSaveId` handed to the group,
  not a save/restore round trip. Changing `vitest.config.ts` would make it testable, outside this task.

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
