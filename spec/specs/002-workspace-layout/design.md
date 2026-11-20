# Design — Workspace Layout, Top Bar and Theme

## Overview
`pages/Customers.tsx` owns `selected` (customer row or null) and renders either the landing or the workspace.
`useMediaQuery("(min-width: 1024px)")` chooses desktop vs stacked layout. Since CR-20261120-2 the workspace is just the
Use Cases and Events panels at full width; the Executive Summary opens in a modal dialog when a customer is selected and
is reopened from a top-bar button.

## Components and files
| File | Role |
|---|---|
| `src/App.tsx` | Providers: `ThemeProvider` (class, default light, `enableSystem=false`), `QueryClientProvider`, `TooltipProvider`, `Sonner` |
| `src/pages/Customers.tsx` | State (`selected`, `summaryOpen`), backdrop, layout switch, resizable group, the selection handlers |
| `src/components/customers/TopBar.tsx` | Chip, summary button slot, search slot, refresh, theme toggle |
| `src/components/customers/Panel.tsx` | Shared panel shell |
| `src/components/customers/SummaryDialog.tsx` | The modal around `CustomerDetails` (LAY-T11, LAY-T12); owns the discard confirm and the close rules |
| `src/components/ui/dialog.tsx`, `alert-dialog.tsx` | Existing Radix wrappers; reused unchanged (CONV-001) |
| `src/hooks/useMediaQuery.ts` | `matchMedia` subscription |
| `src/components/ui/resizable.tsx` | react-resizable-panels wrapper |

## Layout tree — dialog over full-width grids (LAY-T09, LAY-T11, CR-20261120-2; delivered 2026-11-20)
```
desktop (≥ 1024px), height = viewport − top bar (LAY-PANEL-001)       key=<customer>
div relative min-h-0 flex-1
└─ ResizablePanelGroup vertical  autoSaveId="terra-split-v-v1"  absolute inset-0   (LAY-PANEL-007, LAY-T08)
    ├─ "usecases" 60/min20 → UseCasesPanel
    └─ "events"   40/min20 → EventsPanel

narrow (< 1024px): UseCasesPanel (60vh) · EventsPanel (60vh); page scrolls (LAY-PANEL-008)

either width, over the workspace (portal):
SummaryDialog open → DialogContent → CustomerDetails (Panel shell: title, Last modified / Export or Cancel / Save, body)
```
- **History:** the right-hand panel layout (LAY-PANEL-002, LAY-PANEL-005, horizontal group `terra-split-h-v3`) and the
  band of CR-20261120-1 (built but never released) are gone; `Panel` is the LAY-SHELL-001 shell plus an optional
  `titleId`.
- **Why not keep the band collapsible *and* add the dialog?** Two places for the same summary is more UI to build, test
  and explain than the owner asked for ("the band is NOT wanted any more"); a dialog the user can reopen replaces
  collapse and expand (Article VIII.1).

## Summary dialog design (LAY-R7)
**Who owns the state.** `Customers.tsx` holds `summaryOpen` (plain `useState`). The selection handler passed to both
search boxes does `setSelected(row); setSummaryOpen(true)`; the clear handler does `setSelected(null);
setSummaryOpen(false)`. Opening is therefore caused by the **user action** of selecting, not by an effect on
`selected`: the re-pick of the selected row by `id` after a refetch (SUM-T09) creates a new `selected` object but calls
no handler, so a save, Refresh or background refetch never reopens or resets the dialog (LAY-DLG-002). Picking the
already open customer again in the search bar is a selection and reopens the dialog (see CR-20261120-2, question h).
**Customer change** (LAY-DLG-014): the modal makes the top bar inert while the dialog is open, so a change can only
happen after the dialog has closed; the handler still resets `summaryOpen` so the rule holds for any caller. The
`CustomerDetails` editor state lives inside the dialog content, which Radix unmounts on close (CONV-004), and the
discard confirm (LAY-DLG-007) is the only way to close with edits, so no editor text outlives the dialog.

**Run state is not dialog state.** The dialog *content* is unmounted when closed, but AI progress and an unsaved AI draft
must survive closing (022, AIB-HUMAN-010). They therefore live in a hook called from `Customers.tsx` beside
`summaryOpen` (AIB-T10 adds `useAutoBrief(customerKey)` there) and reach the dialog through props. LAY-T11 builds
only `summaryOpen`; nothing in it knows about AI, so with AI off it is complete (Article XII.8).

**Close rules (LAY-DLG-005, -007, -008, -009).** `SummaryDialog` uses the existing `Dialog` with `onOpenChange`
as the only exit, like `UseCaseForm` and `EventForm` (`!o && !save.isPending && onClose()`):
1. saving → ignore (× , Esc and overlay clicks do nothing; the shared `ui/dialog.tsx` × cannot be disabled and must
   not be edited for feature work, CONV-001, so "no effect" is the specified behaviour);
2. editor open and *dirty* → open the discard confirm (an `AlertDialog`, as `ConfirmDelete` does: Article V.3, title
   "Discard your unsaved summary changes?", actions *Discard* and *Keep editing*; focus starts on *Keep editing*, Radix's
   default for `AlertDialogCancel`);
3. otherwise → close.
*Dirty* = the editor is open and its HTML differs from the text it was opened with. `RichTextEditor` reports only real
edits (`text-change`), never its own initial load, so a dialog opened and left alone is not dirty. `CustomerDetails`
reports `{ editing, dirty, saving }` upward through one callback (once on mount, then whenever one changes) and calls `onSaved()` after a successful save; the
dialog closes on `onSaved` (LAY-DLG-009). A failed save keeps `editing` and `dirty`, so closing still asks. *Discard* uses the destructive button tokens, as in `ConfirmDelete`.

**Focus (LAY-DLG-004, -006).** Radix returns focus to the element that was focused before opening; after an
automatic open that is `body`. `DialogContent` therefore gets `onCloseAutoFocus` that prevents the default and focuses
the reopen button (a ref owned by `Customers.tsx`, passed to the button it renders into `TopBar`). Initial focus goes to
the dialog container (`onOpenAutoFocus` prevented, container `tabIndex={-1}`), so an auto-opened dialog does not put
the cursor in the text or start the editor and Enter does nothing until the user moves focus. The focus trap and Esc
come from Radix (A11Y-KEY-003). The container itself has no visible focus ring (`outline-none`); the owner accepted this at G5
on 2026-11-20 (an exception to A11Y-KEY-005 for this one container; every control inside keeps its ring).

**Accessible name (LAY-DLG-003).** The dialog is labelled by its visible title, "Executive Summary", once: no second
hidden heading. `CustomerDetails` keeps its `Panel` shell, so SUM-VIEW-001..004 and the existing tests hold; the
shell's `h2` carries an id that `DialogContent` references with `aria-labelledby`: `CustomerDetails` takes an optional
`titleId` and passes it to the generic optional `Panel.titleId` (`DialogTitle asChild` cannot wrap the panel's own
`h2`). Radix Dialog 1.3.1 logs no missing-`DialogTitle` warning on this route; a test pins that nothing is logged.

**Size and sheet (LAY-DLG-011, -012).** The content classes override the shared defaults (`grid`, `max-w-lg`, `p-6`,
`gap-4`, centring translate) as `UseCaseForm` does with its `className`. Below 1024px a full-screen sheet:
`left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none` (not `inset-0`, whose `right-0` and
`bottom-0` would stretch the desktop popup). From 1024px centred again: `lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2
lg:-translate-y-1/2 lg:w-[80vw] lg:h-auto lg:max-h-[85vh] lg:rounded-lg lg:border`. The panel header is the fixed title
bar and the panel body scrolls (`min-h-0 overflow-auto`). The shared × is moved into the 32px title bar with
`[&>button]:right-3 [&>button]:top-2` (it is a direct child button of the content; `ui/dialog.tsx` is not edited) and
the panel header keeps `[&>header]:pr-10` clear for it. `Panel` inside the dialog drops its own card border, radius,
shadow and entry animation through `className`.

**Reopen button (LAY-DLG-010).** `TopBar` gains an optional `summaryButton?: ReactNode` slot rendered right of the
chip (`TopBar` stays presentational; `Customers.tsx` builds the button so it can own the ref and the AI indicator of
022, AIB-HUMAN-011). The button is a ghost `Button` with an icon (`FileText`), the visible label "Executive summary"
from `sm` (640px) and `aria-label="Executive summary"` always. The chip keeps `sm:max-w-[40%]`; the button is
`shrink-0`.

**Themes (LAY-DLG-013).** Overlay is the existing `bg-black/80`; the summary uses the stone classes `CustomerDetails`
already has in both themes; the button uses `Button` ghost tokens. G5 covers both themes.

## Interfaces
```ts
TopBar({ selectedLabel?: {name, id?}, onClear, onRefresh, refreshing, children?, summaryButton? })
//   summaryButton?: ReactNode, rendered next to the customer chip while a customer is selected (LAY-DLG-010)
Panel({ title, count?, badges?, headerRight?, className?, bodyClassName?, headerClassName?, children, titleId? })
//   LAY-SHELL-001 shell; titleId? puts an id on the h2 for aria-labelledby
SummaryDialog({ row, open, onOpenChange(open: boolean), returnFocusRef })   // LAY-T11, LAY-T12
CustomerDetails({ row, className?, titleId?, onSaved?(), onStateChange?({ editing, dirty, saving }) })   // SUM-T13
```

## Planned changes
- **LAY-PANEL-004:** `autoSaveId="terra-split-v-v1"` on the vertical group (LAY-T08; ships with LAY-T09). Delivered 2026-11-20;
  the saved-split round trip was checked in the owner's G5.
- **LAY-TOP-004:** `onRefresh` → `queryClient.invalidateQueries()` (all keys); `refreshing` → `useIsFetching() > 0`.
- **LAY-PANEL-007, LAY-PANEL-008:** full-width grids (LAY-T09 ✅ 2026-11-20).
- **LAY-DLG-001..006, -010..014:** dialog shell, open on selection, close controls, focus, size, themes, reset and the
  reopen button (LAY-T11 ✅); **LAY-DLG-007..009:** discard confirm, no close while saving, close after save (LAY-T12 ✅, 2026-11-20).
- **Dropped:** collapse state and its storage (LAY-BAND-003, task LAY-T10). `terra-summary-band-v1` is never created.
  The old `terra-split-h-v3` entry stops being read when the horizontal group goes.

## Error handling
Layout has no I/O of its own; panels handle their own states. A failed summary save keeps the dialog open with the
message (SUM-EDIT-005, LAY-DLG-009).

## Testing approach
Component test: selection switches state; key change resets children. Manual: resize persistence, breakpoint
behaviour, both themes.

Dialog (LAY-T11, LAY-T12), with `Customers.test.tsx` as the page-level home and `SummaryDialog.test.tsx` for the rules:
opens on selection (also with AI off) and not again after a refetch, a save or Refresh (the test re-renders with a new
customers query result); `role="dialog"` named "Executive Summary"; initial focus not in the editor; Esc, the "Close"
button and the overlay close it; focus lands on the "Executive summary" button; dirty close asks and *Keep editing* /
*Discard* behave as written; nothing closes it while a save is pending; it closes after a successful save and stays
open after a failed one; a customer change resets it; the button's name and its label at narrow vs wide (class check);
no right-hand panel, no band, no collapse control. jsdom has no layout engine, so pixel sizes (85vh, 80vw, centring, sheet) and
both themes are G5.

**Tests changed by the delivery (2026-11-20; band tests from the unreleased work, rewritten, not weakened):**
- `tests/component/Panel.test.tsx`: the `describe("Panel collapse")` block (nine tests: five `LAY-BAND-006`, two
  `LAY-BAND-002`, one `LAY-BAND-007`, and "LAY-SHELL-001 shows no toggle button and never hides the body when collapse is
  absent") tests a prop that LAY-T09 removes, so the block is deleted with the prop. The two original `LAY-SHELL-001`
  tests stay unchanged.
- `tests/component/Customers.test.tsx`: the band tests are replaced by `LAY-PANEL-007` (no band, no summary panel, no
  horizontal group; vertical group 60/40 with `terra-split-v-v1`), `LAY-PANEL-008` (stack of Use Cases then Events) and
  the `LAY-DLG-…` tests above. The `LAY-PANEL-006` vertical-group test is kept under the new ID `LAY-PANEL-007`; the
  `LAY-PANEL-004` test is kept as it is.
- `tests/component/CustomerDetails.test.tsx`: see the executive-summary design.
The G5 notes recorded on LAY-T03, SUM-T09/T10, UCF-T07 and EVF-T06 describe the old right-hand panel and are redone in
the dialog's G5 check (LAY-T11).

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | CR-20261120-2 specifies the dialog before any code; the band IDs are Deprecated, never reused. ✅ |
| II Single source of truth | Only theme and split sizes in browser storage; dialog open state and the editor draft are not stored. ✅ |
| V Clear feedback | Refresh spinner; but refresh scope incomplete → LAY-T07 ⚠️. The discard confirm protects typed text (V.3); save success and failure feedback unchanged (SUM-EDIT-005). |
| VI Theme-aware, responsive | Light/dark; ≥ 1024 full-width split, < 1024 stack; dialog centred, 80vw wide and 85vh at most on desktop, sheet on narrow; tokens only, stone summary kept (G5 in LAY-T11). ✅ |
| VII Accessible | Modal with accessible name, focus trap, Esc, focus returned to a named, keyboard-operable button (LAY-DLG-003..006, -010; A11Y-KEY-003, -005); the dialog container shows no focus ring (owner-accepted exception at G5). ✅ |
| VIII Simple | Reuses `Dialog`, `AlertDialog`, `Panel` and `Button`; one `useState`; no new dependency; the band's `Panel.collapse` prop is removed rather than kept unused. ✅ |
| IX Layered | No data access in the layout or dialog; saves go through `useSaveSummary`. ✅ |
| XII AI agents & data | The dialog hosts the optional AI draft (022); with AI off it is the plain summary and still opens (LAY-DLG-001, AIB-GEN-019). ✅ |

**Exceptions:** none. No ADR: no new dependency, layer or store; the dialog reuses the existing Radix components
(Article VIII).
