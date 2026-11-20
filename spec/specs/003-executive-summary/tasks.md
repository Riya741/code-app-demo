# Tasks — Executive Summary

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 13 tasks — ✅ 11 · 🔄 1 · ⬜ 1 · ⛔ 0

- [x] **SUM-T01** Panel with stone theme; sanitised rich or plain text; empty state.
  - Status: ✅ Done · Covers: SUM-VIEW-001..003 · Files: `CustomerDetails.tsx`
- [x] **SUM-T02** `fmtUtc` and "Last modified" header label.
  - Status: ✅ Done · Covers: SUM-VIEW-004 · Files: `CustomerDetails.tsx`
- [x] **SUM-T03** Click/keyboard to edit with lazy Quill editor; Cancel/Save.
  - Status: ✅ Done · Covers: SUM-EDIT-002..004 · Files: `CustomerDetails.tsx`, `RichTextEditor.tsx`
- [x] **SUM-T04** Interim session-only save with "Edited (on screen only)" label.
  - Status: ✅ Done · Covers: SUM-EDIT-007 · Files: `CustomerDetails.tsx`
- [x] **SUM-T05** Word export with file naming and toast.
  - Status: ✅ Done · Covers: SUM-WORD-001..003 · Files: `CustomerDetails.tsx`, `lib/wordDoc.ts`
- [x] **SUM-T06** Disable export when empty.
  - Status: ✅ Done · Covers: SUM-WORD-002

### Persist the summary (SUM-EDIT-001)
- [x] **SUM-T07** Server endpoint `POST /customers/:id/summary`.
  - Status: ✅ Done · Covers: SUM-EDIT-001, API-SUMM-001 · Files: `server/workbook.ts` · Tracked also as API-T09
  - Verified 2026-11-17 via the agent workflow (implementer subagent, read-only reviewer subagent; hand-off `spec/handoffs/API-T09.md`, verdict pass): delivered as API-T09 (server part of SUM-EDIT-001; the client follows in SUM-T08..T10).
- [x] **SUM-T08** Client fetcher `saveSummary` + `useSaveSummary` hook invalidating `["customers"]`.
  - Status: ✅ Done · Covers: SUM-EDIT-001 · Files: `lib/customerSource.ts`, `hooks/useCustomers.ts`
  - Verified 2026-11-18 via the agent workflow (implementer subagent, then the project reviewer subagent; hand-off `spec/handoffs/SUM-T08.md`, verdict pass): fetcher and hook; layering proven by the component test that stubs only `fetch`. G5 n/a (no visual change).
- [x] **SUM-T09** Wire Save: pending state, error message, keep draft on failure; re-pick selected row after refetch.
  - Status: ✅ Done · Covers: SUM-EDIT-005, SUM-EDIT-006 · Files: `CustomerDetails.tsx`, `pages/Customers.tsx`
  - Verified 2026-11-18: agent workflow review passed (hand-off `spec/handoffs/SUM-T09.md`); G5 manual check reported passed by the owner on 2026-11-18 (light and dark themes, ≥ 1024px and < 1024px, every item in the hand-off list).
- [x] **SUM-T10** Remove `editedSummaries`, interim label and toast description; retire SUM-EDIT-007.
  - Status: ✅ Done · Covers: SUM-EDIT-007 · Depends on: SUM-T09
  - Verified 2026-11-18: agent workflow review passed (hand-off `spec/handoffs/SUM-T10.md`); G5 manual check reported passed by the owner on 2026-11-18 (light and dark themes, ≥ 1024px and < 1024px, every item in the hand-off list).
- [x] **SUM-T11** Tests: `fmtUtc` unit, endpoint integration, save/cancel component test.
  - Status: ✅ Done · Covers: SUM-VIEW-004, SUM-EDIT-001 · Depends on: QA-T01, QA-T03
  - Verified 2026-11-18 via the agent workflow (implementer subagent, then the project reviewer subagent; hand-off `spec/handoffs/SUM-T11.md`, verdict pass): 7 `fmtUtc` unit tests and 12 component tests (`tests/component/CustomerDetails.test.tsx`); endpoint tests reused from API-T09.
- [ ] **SUM-T12** Harden the summary save: update the cached customer from the save response (so a failed refetch cannot show the old text), move the selected-row re-pick into a tested helper, move `fmtUtc` to `src/lib/dates.ts`, and narrow the over-claiming component test title.
  - Status: ⬜ Not started · Covers: SUM-EDIT-001, SUM-VIEW-004 · Files: `src/hooks/useCustomers.ts`, `src/pages/Customers.tsx`, `src/lib/dates.ts` · Found 2026-11-18 in the SUM-T08/T09/T11 reviews (minor findings).

### Summary dialog (CR-20261120-2: replaces the band of CR-20261120-1, owner decision D2)
- [ ] **SUM-T13** Summary content in the dialog: `CustomerDetails` loses the band's collapse props, reports its editing, dirty and saving state and its successful save, and keeps every existing summary behaviour.
  - Status: 🔄 In progress · Covers: SUM-VIEW-001, SUM-VIEW-006 · Files: `src/components/customers/CustomerDetails.tsx`, `tests/component/CustomerDetails.test.tsx` · Depends on: LAY-T11 (same change) · Do with: LAY-T09, LAY-T11, LAY-T12, LAY-T08 · Re-scoped by CR-20261120-2 (was: collapse props for the band, Covers SUM-VIEW-001, SUM-VIEW-005, LAY-BAND-007)
  - Step: Remove `collapsed`, `onToggleCollapsed` and the `collapse` pass-through to `Panel` (the unreleased band work added them)
  - Step: Add `onStateChange?({ editing, dirty, saving })` and `onSaved?()` (design: "Planned — the summary dialog"); without them the component behaves as today; Cancel still returns to the view inside the dialog
  - Step: Tests that must change (rewritten, not weakened): in `tests/component/CustomerDetails.test.tsx` the band section is replaced: the three kept `SUM-VIEW-005 …` behaviours (view, Last modified and Export; editor opens and Save/Cancel work; export from the header) are retitled `SUM-VIEW-006 …` without the collapse props; `SUM-VIEW-005 behaves as before when no collapse props are passed` is deleted with the props; the four `LAY-BAND-007 …` tests become `LAY-DLG-007/008 …` tests on `onStateChange` and a `LAY-DLG-009 …` test on `onSaved`; `SUM-VIEW-001 …` and the twelve earlier tests stay unchanged
  - Step: G5 with LAY-T11: view, empty state, Last modified, click/Enter to edit, lazy editor, Cancel/Save, save error, Word export inside the dialog, both themes, ≥ 1024px and < 1024px
  - Step: Hand-off: [SUM-T13.md](../../handoffs/SUM-T13.md) describes the band delivery; it is marked superseded and its front matter reset (`covers: [SUM-VIEW-001]`, `verdict: pending`); fresh hand-off at re-delivery
