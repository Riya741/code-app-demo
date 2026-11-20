# Design — Workspace Layout, Top Bar and Theme

## Overview
`pages/Customers.tsx` owns `selected` (customer row or null) and renders either the landing or the workspace.
`useMediaQuery("(min-width: 1024px)")` chooses desktop vs stacked layout.

## Components and files
| File | Role |
|---|---|
| `src/App.tsx` | Providers: `ThemeProvider` (class, default light, `enableSystem=false`), `QueryClientProvider`, `TooltipProvider`, `Sonner` |
| `src/pages/Customers.tsx` | State, backdrop, layout switch, resizable groups |
| `src/components/customers/TopBar.tsx` | Chip, search slot, refresh, theme toggle |
| `src/components/customers/Panel.tsx` | Shared panel shell |
| `src/hooks/useMediaQuery.ts` | `matchMedia` subscription |
| `src/components/ui/resizable.tsx` | react-resizable-panels wrapper |

## Layout tree (desktop)
```
ResizablePanelGroup horizontal  autoSaveId="terra-split-h-v3"  key=<customer>
├─ Panel "left" 60/min25
│   └─ ResizablePanelGroup vertical            (no autoSaveId → LAY-PANEL-004 gap)
│       ├─ "usecases" 60/min20 → UseCasesPanel
│       └─ "events"   40/min20 → EventsPanel
└─ Panel "summary" 40/min20 → CustomerDetails
```

The tree above is the shipped layout (LAY-PANEL-002, now Deprecated). It is replaced by the band layout below.

## Planned layout tree — summary band (LAY-T09, CR-20261120-1)
```
desktop (≥ 1024px), height = viewport − top bar (LAY-PANEL-001)       key=<customer>
div flex-col
├─ CustomerDetails as Panel with collapse   full width · shrink-0 · max-h 40% (expanded) | header row (collapsed)
│    body overflow-y:auto                   (LAY-BAND-001, -002, -004)
└─ ResizablePanelGroup vertical  autoSaveId="terra-split-v-v1"  flex-1 min-h-0   (LAY-PANEL-006, LAY-T08)
    ├─ "usecases" 60/min20 → UseCasesPanel
    └─ "events"   40/min20 → EventsPanel

narrow (< 1024px): band (max 60vh expanded, header only collapsed) · UseCasesPanel (60vh) · EventsPanel (60vh); page scrolls (LAY-PANEL-005, LAY-BAND-005)
```
- **Why not a resizable band?** A third divider adds a size to persist and a drag target the owner did not ask for;
  a content-sized band capped at 40% is simpler (Article VIII.1). Open question (b) in CR-20261120-1 asks the owner
  to confirm the cap or ask for a draggable band.
- **Collapsed state** lives in `Customers.tsx` *above* the customer-keyed workspace (LAY-STATE-002 resets everything
  inside the key), so it survives a customer change; LAY-T10 persists it in `localStorage` (`terra-summary-band-v1`),
  a UI preference allowed by Article II.1. The old `terra-split-h-v3` entry is simply no longer read.
- **Collapse keeps state.** Collapsing hides the body with the `hidden` attribute but keeps it mounted, so an AI run
  in progress or an unsaved AI draft (022, AIB-HUMAN-008) survives. Collapsing is disabled while the editor is open
  or saving (LAY-BAND-007), so a half-typed edit is never hidden.
- **Header when collapsed:** title, Last modified, the summary actions (Export; Regenerate with AI when AI is on) and,
  from 022, the run progress or the "AI draft — not saved" badge. The band never expands by itself.

## Interfaces
```ts
TopBar({ selectedLabel?: {name, id?}, onClear, onRefresh, refreshing, children? })
Panel({ title, count?, badges?, headerRight?, className?, bodyClassName?, headerClassName?, children,
        collapse? })   // planned (LAY-T09): collapse?: { collapsed: boolean; onToggle(): void; disabled?: boolean }
// Panel with `collapse`: header gets a toggle button, name "Collapse executive summary" / "Expand executive summary",
// aria-expanded, aria-controls = body id; body rendered with `hidden` when collapsed. Without `collapse`: unchanged.
CustomerDetails({ row, collapsed, onToggleCollapsed })   // planned: passes `collapse` through to its Panel
```

## Planned changes
- **LAY-PANEL-004:** add `autoSaveId="terra-split-v-v1"` to the inner vertical group (LAY-T08; ship with LAY-T09).
- **LAY-TOP-004:** `onRefresh` → `queryClient.invalidateQueries()` (all keys); `refreshing` → `useIsFetching() > 0`.
- **LAY-PANEL-006, LAY-BAND-001..007:** summary band (LAY-T09, LAY-T10), see the planned layout tree.

## Error handling
Layout has no I/O of its own; panels handle their own states.

## Testing approach
Component test: selection switches state; key change resets children. Manual: resize persistence, breakpoint behaviour, both themes.

Band (LAY-T09/T10): component tests for the collapse toggle (`aria-expanded`, name, Enter/Space), the control
disabled while editing, focus moving to the control, no right-hand panel, and the stored state surviving a remount.
**Tests to update:** no automated test asserts the right-hand panel or the LAY-PANEL-002 proportions today
(`tests/component` has only the LAY-SHELL-001 `Panel` tests, checked 2026-11-20); the G5 notes recorded on LAY-T03,
SUM-T09/T10, UCF-T07 and EVF-T06 describe the old right-hand panel and are re-done in LAY-T09's G5 check.

## Constitution check
| Article | Compliance |
|---|---|
| II Single source of truth | Only theme, split sizes and the band's collapsed state (UI preferences) in browser storage. ✅ |
| V Clear feedback | Refresh spinner; but refresh scope incomplete → LAY-T07. ⚠️ |
| VI Theme-aware, responsive | Light/dark; ≥1024 band over a full-width split, <1024 stacked; band uses the stone tokens of SUM-VIEW-001 in both themes (G5 in LAY-T09). ✅ |
| VII Accessible | Collapse control is a named button with `aria-expanded`/`aria-controls`, keyboard-operable, focus kept (LAY-BAND-006). ✅ |
| VIII Simple | Single page, no router; band reuses the `Panel` shell instead of a new component; no new dependency. ✅ |
| XII AI agents & data | The band hosts the optional AI draft (022); with AI off it is the plain summary. ✅ |

**Exceptions:** none.
