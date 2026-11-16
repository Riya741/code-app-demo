# Tasks — Workspace Layout, Top Bar and Theme

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 8 tasks — ✅ 6 · 🔄 0 · ⬜ 2 · ⛔ 0

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
