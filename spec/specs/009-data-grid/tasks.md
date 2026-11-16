# Tasks — Data Grid

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 5 · 🔄 0 · ⬜ 2 · ⛔ 0

- [x] **GRID-T01** TanStack table setup, sorting with arrows and `aria-sort`, empty-last.
  - Status: ✅ Done · Covers: GRID-SORT-001..003 · Files: `DataGrid.tsx`
- [x] **GRID-T02** Select, text, number and date filters with header popovers.
  - Status: ✅ Done · Covers: GRID-FILT-001..006
- [x] **GRID-T03** Clear-filters strip and filtered-empty state.
  - Status: ✅ Done · Covers: GRID-FILT-007, GRID-FILT-008
- [x] **GRID-T04** Row expansion, selection, action buttons, sticky header.
  - Status: ✅ Done · Covers: GRID-ROW-001..005
- [x] **GRID-T05** Export function via `exportRef` with extras.
  - Status: ✅ Done · Covers: GRID-CSV-001 · Files: `DataGrid.tsx`, `lib/csv.ts`
- [ ] **GRID-T06** Keyboard-operable row expansion.
  - Status: ⬜ Not started · Covers: GRID-ROW-006, A11Y-KEY-001
  - Step: Chevron becomes a button with `aria-expanded` / `aria-controls`
  - Step: Detail row gets an id
  - Step: Keyboard test: Tab to chevron, Enter toggles
- [ ] **GRID-T07** Component tests for each filter type, faceting and clear.
  - Status: ⬜ Not started · Covers: GRID-FILT-002..008 · Depends on: QA-T02
