---
contract: task-handoff.v1
task: SUM-T13
agent: AGENT-IMPLEMENTER
covers: [SUM-VIEW-001, SUM-VIEW-006]
files_changed: [src/components/customers/CustomerDetails.tsx, src/components/customers/Panel.tsx, tests/component/CustomerDetails.test.tsx]
tests: [tests/component/CustomerDetails.test.tsx, tests/component/SummaryDialog.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: SUM-T13 Summary content in the dialog (done together with LAY-T09, LAY-T11, LAY-T12 and LAY-T08)

This replaces the hand-off of the superseded band delivery. SUM-T13 is the `CustomerDetails` half of the change; the dialog
that hosts it is LAY-T11.md and LAY-T12.md.

## What changed
`CustomerDetails` lost the band's `collapsed`, `onToggleCollapsed` and the `collapse` pass-through to `Panel`. It gained
`onStateChange?({ editing, dirty, saving })` and `onSaved?()`: `onStateChange` is called when the component mounts and
whenever one of the three changes; `onSaved` once after a successful save, after the toast. `dirty` is "the editor is open
and its draft differs from the text it was opened with" (the design's definition; the opening text is kept in state so a
background refetch of the row cannot change it); `saving` is the mutation's pending state, so after a failed save
`editing` and `dirty` stay true. Without the callbacks it behaves exactly as before (the 12 earlier tests are unchanged;
Cancel returns to the view). It also takes an optional `titleId`, passed to `Panel`'s heading, so a dialog can name itself
with `aria-labelledby` (see the open question). `Panel` has the matching optional `titleId` and is otherwise the
LAY-SHELL-001 shell (LAY-T09.md). Save, export, `fmtUtc`, sanitising and the stone colours are untouched.

## Criteria -> evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| SUM-VIEW-001 | `CustomerDetails.test.tsx`: "SUM-VIEW-001 is still titled Executive Summary and does not repeat the customer name or ID" (title kept; it now renders the component through `setup()`, since the band host and its props are gone) |
| SUM-VIEW-006 | `CustomerDetails.test.tsx`: "SUM-VIEW-006 shows the view, Last modified and Export" (also: no collapse control); "SUM-VIEW-006 opens the editor, and Save and Cancel work as before"; "SUM-VIEW-006 exports the summary from the header"; "SUM-VIEW-006 puts the id it is given on the Executive Summary heading, so the dialog can be named by it". `SummaryDialog.test.tsx`: "LAY-DLG-003 mounts its content only while open and shows the summary, Last modified and Export" (the summary is inside the dialog). `Customers.test.tsx`: "LAY-PANEL-007 shows only Use Cases over Events: …" (nowhere else in the workspace). Every other SUM-VIEW/EDIT/WORD behaviour inside the dialog: manual G5 |
| LAY-DLG-007/008/009 (reporting, LAY-T12) | `CustomerDetails.test.tsx`: "LAY-DLG-007 reports not editing, not dirty and not saving while the summary is only viewed"; "LAY-DLG-007 reports editing but not dirty when the editor opens, dirty after an edit, and nothing after Cancel"; "LAY-DLG-007 is not dirty again when the text is back to what the editor was opened with"; "LAY-DLG-008 reports saving, still editing and dirty, while the save is pending, and not saving when it has finished"; "LAY-DLG-007 keeps reporting editing and dirty, and not saving, after a failed save"; "LAY-DLG-009 calls onSaved once after a successful save, after the toast"; "LAY-DLG-009 does not call onSaved after a failed save, and keeps the editor, the draft and the message" |

Tests retitled, deleted and replaced, as the task lists (rewritten, not weakened): the three kept band tests became
`SUM-VIEW-006 shows the view, Last modified and Export` (the "keeps the view mounted when collapsed" half went with the
collapse), `SUM-VIEW-006 opens the editor, and Save and Cancel work as before`, `SUM-VIEW-006 exports the summary from the
header`. Deleted with the props: `SUM-VIEW-005 behaves as before when no collapse props are passed: no collapse control`
(retired by SUM-VIEW-006; SUM-VIEW-005 is Deprecated). The four `LAY-BAND-007 …` tests (control enabled in view; disabled
while the editor is open, enabled after Cancel; disabled while a save is pending; disabled after a failed save) became the
five `onStateChange` tests and two `onSaved` tests listed above (LAY-DLG-007/008/009). The `Band` / `setupBand` host and
the `useState` import were removed; `setup()` takes an optional second argument for props, so the 12 earlier tests are
unchanged. The `@/lib/wordDoc` mock stays.

Verified to fail against the previous code: with `CustomerDetails.tsx` and `Panel.tsx` reset to `HEAD`, the `titleId` test and
six of the seven `onStateChange` / `onSaved` tests failed (no such props; "does not call onSaved after a failed save" passes
vacuously without the prop); the other `SUM-VIEW-006` and `SUM-VIEW-001` tests pass on
both, as they assert behaviour that did not change.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | spec_lint: 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 16 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (the `CustomerDetails.tsx` one is the existing `fmtUtc` export); typecheck clean |
| G4 | `npm test` | 16 files passed; 163 passed + 1 expected fail (`it.fails`), 164 total |
| G5 | manual | not done: no browser available to the implementer |

## G5 manual checks a person still has to do (both themes, >= 1024px and < 1024px)
Inside the dialog (LAY-T11.md has the dialog's own list): view, empty state ("No executive summary yet. Click to add
one."), Last modified, click and Enter to edit, the lazy editor loads, Cancel returns to the view without closing the
dialog, Save (toast, dialog closes, reopening shows the new Last modified), save error (Excel open: "Could not save: …",
draft kept), Word export, HTML sanitising; the stone colours in both themes.

## Open questions
- `titleId` on `CustomerDetails` is not in the design's interface line for the component (`Panel`'s is). Needed for
  LAY-DLG-003; please confirm or choose another way.
- `onStateChange` is also called once on mount with all three false (so a host always knows the state); the design says
  "whenever one of the three changes". Say if you want the first call dropped.
- None blocking.

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
