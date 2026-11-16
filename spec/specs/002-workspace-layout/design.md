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

## Interfaces
```ts
TopBar({ selectedLabel?: {name, id?}, onClear, onRefresh, refreshing, children? })
Panel({ title, count?, badges?, headerRight?, className?, bodyClassName?, headerClassName?, children })
```

## Planned changes
- **LAY-PANEL-004:** add `autoSaveId="terra-split-v-v1"` to the inner vertical group.
- **LAY-TOP-004:** `onRefresh` → `queryClient.invalidateQueries()` (all keys); `refreshing` → `useIsFetching() > 0`.

## Error handling
Layout has no I/O of its own; panels handle their own states.

## Testing approach
Component test: selection switches state; key change resets children. Manual: resize persistence, breakpoint behaviour, both themes.

## Constitution check
| Article | Compliance |
|---|---|
| II Single source of truth | Only theme and panel sizes in browser storage. ✅ |
| V Clear feedback | Refresh spinner; but refresh scope incomplete → LAY-T07. ⚠️ |
| VI Theme-aware, responsive | Light/dark, ≥1024 split, <1024 stacked. ✅ |
| VIII Simple | Single page, no router. ✅ |

**Exceptions:** none.
