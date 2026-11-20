---
contract: task-handoff.v1
task: LAY-T12
agent: AGENT-IMPLEMENTER
covers: [LAY-DLG-007, LAY-DLG-008, LAY-DLG-009]
files_changed: [src/components/customers/SummaryDialog.tsx, tests/component/SummaryDialog.test.tsx]
tests: [tests/component/SummaryDialog.test.tsx, tests/component/CustomerDetails.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: LAY-T12 Summary dialog close rules (done together with LAY-T09, LAY-T11, LAY-T08 and SUM-T13)

The close rules live in `SummaryDialog.tsx` (written in the same change as the shell, LAY-T11.md); the state and the
success signal they use come from `CustomerDetails` (SUM-T13.md).

## What changed
`onOpenChange(false)` is the only way out and is handled by `requestClose`: while a save is running it is ignored (Esc, ×
and the overlay do nothing); if the editor is open and dirty it opens an `AlertDialog` with the title "Discard your
unsaved summary changes?", the description "Your changes to the executive summary have not been saved." and the actions
*Keep editing* (the `AlertDialogCancel`, so Radix puts the initial focus on it) and *Discard* (destructive style, as
`ConfirmDelete`); otherwise it closes. *Keep editing* closes only the confirm and gives the focus back to the element that
had it (the editor or ×); *Discard* closes the dialog (and with it the editor and the draft; nothing is posted) and the
focus goes to the reopen button. After a successful save `CustomerDetails` calls `onSaved` after the toast and the dialog
closes directly (not through the discard question). A failed save keeps `editing` and `dirty`, so the editor, the draft,
"Could not save: <message>" stay and a later close still asks. The dialog state (`editing`, `dirty`, `saving`, confirm
open) is reset when the dialog closes. All texts are in catalog §6.

## Criteria -> evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| LAY-DLG-007 | `SummaryDialog.test.tsx`: "LAY-DLG-007 asks before closing with unsaved changes, with Discard and Keep editing, focus on Keep editing"; "… Keep editing returns to the dialog with the editor and its text intact, and a later close asks again"; "… Discard closes the dialog, posts nothing and hands the focus to the reopen button" (`fetch` not called, no toast); "… drops the discarded text: the dialog opens again on the stored summary, not in the editor"; "… asks also when the Close button is used"; "… asks also when the overlay is clicked"; "… closes without asking when the editor is open but nothing was changed"; "… closes without asking after Cancel has returned to the view, and Cancel does not close the dialog". `CustomerDetails.test.tsx` (the reported state): "LAY-DLG-007 reports not editing, not dirty and not saving while the summary is only viewed"; "… reports editing but not dirty when the editor opens, dirty after an edit, and nothing after Cancel"; "… is not dirty again when the text is back to what the editor was opened with"; "… keeps reporting editing and dirty, and not saving, after a failed save" |
| LAY-DLG-008 | `SummaryDialog.test.tsx`: "LAY-DLG-008 ignores Esc, the Close button and the overlay while a save is pending" (no `onOpenChange` call, editor and draft intact, no confirm); "LAY-DLG-008 can be closed again once the save has failed, with the confirmation". `CustomerDetails.test.tsx`: "LAY-DLG-008 reports saving, still editing and dirty, while the save is pending, and not saving when it has finished" |
| LAY-DLG-009 | `SummaryDialog.test.tsx`: "LAY-DLG-009 shows the toast, then closes the dialog after a successful save, and the focus goes to the reopen button" (one close request, made after one toast); "LAY-DLG-009 stays open with the editor, the draft and the error after a failed save, and a later close still asks". `CustomerDetails.test.tsx`: "LAY-DLG-009 calls onSaved once after a successful save, after the toast"; "LAY-DLG-009 does not call onSaved after a failed save, and keeps the editor, the draft and the message". Page level: `Customers.test.tsx` "LAY-DLG-002 closes after a save, shows the stored summary when reopened, and does not pop open again when the data arrives" |

Verified to fail against the previous code: with `CustomerDetails.tsx` and the page reset to `HEAD` (no callbacks, no dialog),
all the `LAY-DLG-007/008/009` tests above failed except two that pass vacuously without the callbacks ("closes without
asking when the editor is open but nothing was changed" and `CustomerDetails` "does not call onSaved after a failed save"). Mutation check: removing the `state.saving` guard from `requestClose` fails
both `LAY-DLG-008` tests in `SummaryDialog.test.tsx`; removing the `onCloseAutoFocus` handlers fails the Discard test, the
"drops the discarded text" test and the success test (focus on the reopen button).

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | spec_lint: 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 16 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 8 warnings (same 8 as before, none from this change); typecheck clean |
| G4 | `npm test` | 16 files passed; 163 passed + 1 expected fail (`it.fails`), 164 total |
| G5 | manual | not done: no browser available to the implementer |

## G5 manual checks a person still has to do (both themes, >= 1024px and < 1024px)
1. Edit the summary, press Esc: the confirm appears stacked over the dialog, readable in both themes, focus on *Keep
   editing* (visible ring); at < 1024px it is still centred and not cut off. The overlay of the confirm darkens the dialog.
2. *Keep editing*: back in the editor with the text and the caret area focused. *Discard*: dialog closes, focus on the
   "Executive summary" button, reopening shows the stored text. Esc on the confirm itself acts as *Keep editing*.
3. While a save is slow (hold the workbook open in Excel, or throttle): Esc, × and a click outside do nothing; after a
   save error the same actions ask the discard question.
4. Save: toast "Executive summary updated", then the dialog closes and does not pop open when the data arrives.

## Open questions
- The *Discard* button reuses the destructive style of `ConfirmDelete` ("Yes, delete"); the catalog gives only the words.
  Tell me if you want it neutral.
- None blocking.

## Surprises
- Radix returns the focus after the confirm closes to the trigger, and there is none; so the confirm's own
  `onCloseAutoFocus` puts the focus back on the element that had it (*Keep editing*) or on the reopen button (*Discard*).
- While the confirm is open the dialog behind it is `aria-hidden`; tests query it with `hidden: true`.

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
