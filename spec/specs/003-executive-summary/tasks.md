# Tasks — Executive Summary

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 11 tasks — ✅ 7 · 🔄 0 · ⬜ 3 · ⛔ 1

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
- [ ] **SUM-T08** Client fetcher `saveSummary` + `useSaveSummary` hook invalidating `["customers"]`.
  - Status: ⬜ Not started · Covers: SUM-EDIT-001 · Files: `lib/customerSource.ts`, `hooks/useCustomers.ts`
- [ ] **SUM-T09** Wire Save: pending state, error message, keep draft on failure; re-pick selected row after refetch.
  - Status: ⛔ Blocked by SUM-T07, SUM-T08 · Covers: SUM-EDIT-005, SUM-EDIT-006 · Files: `CustomerDetails.tsx`, `pages/Customers.tsx`
- [ ] **SUM-T10** Remove `editedSummaries`, interim label and toast description; retire SUM-EDIT-007.
  - Status: ⬜ Not started · Covers: SUM-EDIT-007 · Depends on: SUM-T09
- [ ] **SUM-T11** Tests: `fmtUtc` unit, endpoint integration, save/cancel component test.
  - Status: ⬜ Not started · Covers: SUM-VIEW-004, SUM-EDIT-001 · Depends on: QA-T01, QA-T03
