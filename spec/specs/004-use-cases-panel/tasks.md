# Tasks — Use Cases Panel

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 9 tasks — ✅ 7 · 🔄 0 · ⬜ 2 · ⛔ 0

- [x] **UCP-T01** Header: title, count, Live tally.
  - Status: ✅ Done · Covers: UCP-HEAD-001, UCP-HEAD-002 · Files: `ParentActivity.tsx`
- [x] **UCP-T02** Add use case split button and menu.
  - Status: ✅ Done · Covers: UCP-HEAD-003 · Files: `ParentActivity.tsx` (`AddUseCaseMenu`)
- [x] **UCP-T03** Column definitions with filters, comma lists, status pills.
  - Status: ✅ Done · Covers: UCP-GRID-001..003 · Files: `ParentActivity.tsx` (`useCaseColumns`)
- [x] **UCP-T04** Row expansion with Value/Notes; selection; Clone/Edit/Delete wiring.
  - Status: ✅ Done · Covers: UCP-ROW-001..005, UCP-HEAD-004 · Files: `ParentActivity.tsx`
- [x] **UCP-T05** Delete confirmation with pending/error states and soft delete.
  - Status: ✅ Done · Covers: UCP-DEL-001..003 · Files: `ConfirmDelete.tsx`, `hooks/useParentActivity.ts`
- [x] **UCP-T06** CSV export with extras and toast.
  - Status: ✅ Done · Covers: UCP-HEAD-005, UCP-CSV-001 · Files: `ParentActivity.tsx`, `DataGrid.tsx`
- [x] **UCP-T07** Loading, error and empty states.
  - Status: ✅ Done · Covers: UCP-STATE-001..003 · Files: `ParentActivity.tsx` (`ListState`)
- [ ] **UCP-T08** Show launch dates on the stored calendar day in all time zones.
  - Status: ⬜ Not started · Covers: UCP-GRID-004, DT-TIME-003 · Files: new `src/lib/dates.ts`, `ParentActivity.tsx` · Shared with EVP-T07, PERF-T03
  - Step: Add `formatDay("YYYY-MM-DD")` using a local `Date(y, m-1, d)`
  - Step: Use it for Launch Date and in the delete description
  - Step: Verify with the OS time zone set to America/Los_Angeles
- [ ] **UCP-T09** Component tests: tallies, export content, clone-to selection.
  - Status: ⬜ Not started · Covers: UCP-HEAD-002, UCP-CSV-001, UCP-ROW-003 · Depends on: QA-T02
