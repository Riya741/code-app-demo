# Tasks — Customer Search

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 9 tasks — ✅ 7 · 🔄 0 · ⬜ 2 · ⛔ 0

- [x] **SRCH-T01** Load visible customers through `fetchCustomers` + `useCustomers`.
  - Status: ✅ Done · Covers: SRCH-LOAD-001, SRCH-LOAD-002 · Files: `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts`
- [x] **SRCH-T02** Implement tokeniser, `score()` ranking, 100-result cap and match header.
  - Status: ✅ Done · Covers: SRCH-RANK-001..004 · Files: `SearchBox.tsx`
- [x] **SRCH-T03** Render results with `Highlight`, empty state, hidden parent ID.
  - Status: ✅ Done · Covers: SRCH-RANK-005, SRCH-RANK-006 · Files: `SearchBox.tsx`
- [x] **SRCH-T04** Keyboard navigation, outside-click close, clear button, "↵ to open" hint.
  - Status: ✅ Done · Covers: SRCH-SEL-001..006 · Files: `SearchBox.tsx`
- [x] **SRCH-T05** Hero and bar variants; loading and error states with retry.
  - Status: ✅ Done · Covers: SRCH-LOAD-003, SRCH-LOAD-004, SRCH-VAR-001, SRCH-VAR-002 · Files: `SearchBox.tsx`, `pages/Customers.tsx`
- [ ] **SRCH-T06** Add `aria-activedescendant` and option ids.
  - Status: ⬜ Not started · Covers: SRCH-ARIA-002 · Files: `SearchBox.tsx`
  - Step: Give each option `id="customer-option-<i>"`
  - Step: Set `aria-activedescendant` on the input while the panel is open
  - Step: Verify with a screen reader (NVDA / VoiceOver)

## Test tasks
- [x] **SRCH-T07** Unit tests for `score()` covering every rank and the scenarios in requirements.
  - Status: ✅ Done · Covers: SRCH-RANK-001..004 · Files: `src/lib/search.ts`, `tests/unit/search.test.ts`
  - Pure ranking logic moved unchanged from `SearchBox.tsx` to `src/lib/search.ts` so it can be tested. 13 tests. The exact-ID test failed on first run and found the SRCH-T09 defect.
- [x] **SRCH-T09** Defect: an exact parent ID match ranked 4 instead of 0 unless the name also contained the digits.
  - Status: ✅ Done · Covers: SRCH-RANK-003 · Files: `src/lib/search.ts`
  - Found 2026-11-16 by SRCH-T07 (`SRCH-RANK-003 ranks an exact parent ID match 0`). The spec says 0 = name or ID equals the query; `score()` now checks the exact ID first. Test passes.
- [ ] **SRCH-T08** Component test for keyboard flow and empty state.
  - Status: ⬜ Not started · Covers: SRCH-SEL-002..004, SRCH-RANK-006 · Depends on: QA-T02
