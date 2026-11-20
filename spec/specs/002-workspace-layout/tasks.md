# Tasks — Workspace Layout, Top Bar and Theme

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 6 · 🔄 0 · ⬜ 4 · ⛔ 0

- [x] **LAY-T01** App providers: theme (light default, no system), query client defaults, tooltip, toaster.
  - Status: ✅ Done · Covers: LAY-THEME-001 · Files: `src/App.tsx`
- [x] **LAY-T02** Landing vs workspace switch keyed by customer; parentId / customerKeys derivation; backdrop.
  - Status: ✅ Done · Covers: LAY-STATE-001..005 · Files: `pages/Customers.tsx`
- [x] **LAY-T03** Desktop resizable split and stacked mobile layout.
  - Status: ✅ Done · Covers: LAY-PANEL-001, LAY-PANEL-002, LAY-PANEL-003, LAY-PANEL-005 · Files: `pages/Customers.tsx`, `hooks/useMediaQuery.ts`
- [x] **LAY-T04** Top bar chip, search slot, refresh button, theme toggle.
  - Status: ✅ Done · Covers: LAY-TOP-001, LAY-TOP-002, LAY-TOP-003, LAY-THEME-002 · Files: `TopBar.tsx`
- [x] **LAY-T05** Shared `Panel` shell.
  - Status: ✅ Done · Covers: LAY-SHELL-001 · Files: `Panel.tsx`
- [x] **LAY-T06** Persist horizontal split sizes.
  - Status: ✅ Done · Covers: LAY-PANEL-004 (part) · Files: `pages/Customers.tsx`
- [ ] **LAY-T07** Refresh reloads everything for the open customer.
  - Status: ⬜ Not started · Covers: LAY-TOP-004 · Files: `pages/Customers.tsx`, `TopBar.tsx`
  - Step: Replace `refetch()` with `queryClient.invalidateQueries()`
  - Step: Drive the spinner from `useIsFetching()`
  - Step: Manual check: edit a use case in Excel, click Refresh, see the change
- [ ] **LAY-T08** Persist the vertical split size.
  - Status: ⬜ Not started · Covers: LAY-PANEL-004 · Files: `pages/Customers.tsx`
  - Step: Add `autoSaveId` to the inner `ResizablePanelGroup`
  - Step: Fix the misleading comment ("every divider … sizes are remembered") if behaviour differs
  - Note (CR-20261120-1): once LAY-T09 removes the horizontal split, the vertical split is the only one left; ship LAY-T08 in the same change or LAY-PANEL-004 drops from ⚠️ to ❌

### Summary band (CR-20261120-1, owner decision D2)
- [ ] **LAY-T09** Replace the right-hand summary panel with a full-width, collapsible summary band above a full-width Use Cases / Events split.
  - Status: ⬜ Not started · Covers: LAY-PANEL-006, LAY-BAND-001, LAY-BAND-002, LAY-BAND-004, LAY-BAND-005, LAY-BAND-006, LAY-BAND-007 · Files: `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`, `tests/component/Panel.test.tsx`, new `tests/component/Customers.test.tsx` · Do with: LAY-T08, SUM-T13
  - Step: Remove the horizontal `ResizablePanelGroup` (`terra-split-h-v3`); render the band, then the vertical Use Cases / Events group, both full width (design: "Planned layout tree")
  - Step: Add the optional `collapse` prop to `Panel` (toggle button, `aria-expanded`, `aria-controls`, body `hidden` but mounted); the other panels are unchanged (LAY-SHELL-001 tests must still pass)
  - Step: Band height: content height up to 40% of the workspace at ≥ 1024px, 60vh below; body scrolls inside
  - Step: Collapse control disabled while the editor is open or saving; focus moves to the control on collapse
  - Step: Tests titled `LAY-BAND-…` / `LAY-PANEL-006 …` for the toggle, `aria-expanded`, disabled-while-editing and the absence of a right-hand panel. No existing automated test asserts LAY-PANEL-002 (checked 2026-11-20); update any that is added before this task
  - Step: G5: light and dark themes, ≥ 1024px and < 1024px, collapsed and expanded, long and empty summary; repeat the summary checks of SUM-T09 (save, error, cancel) inside the band
  - Step: Steering: `tech.md` panel-memory row; messages catalog §6 control names
- [ ] **LAY-T10** Remember the band's collapsed state across reloads and customers.
  - Status: ⬜ Not started · Covers: LAY-BAND-003 · Files: `src/pages/Customers.tsx` · Depends on: LAY-T09 and the owner's answer to CR-20261120-1 open question (a)
  - Step: Hold the state in `Customers.tsx` above the customer-keyed workspace, so it survives a customer change
  - Step: Persist it in `localStorage` under `terra-summary-band-v1` (UI preference, Article II.1); read errors fall back to expanded
  - Step: Test titled `LAY-BAND-003 …`: collapse, remount, still collapsed
