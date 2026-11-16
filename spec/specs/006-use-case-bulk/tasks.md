# Tasks — Bulk Use Cases

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 11 tasks — ✅ 8 · 🔄 0 · ⬜ 3 · ⛔ 0

- [x] **UCB-T01** Dialog shell, modes, titles and descriptions.
  - Status: ✅ Done · Covers: UCB-CLONE-001 (strip) · Files: `UseCaseBulkForm.tsx`
- [x] **UCB-T02** Clone row seeding, department hint, status reset.
  - Status: ✅ Done · Covers: UCB-CLONE-002..004
- [x] **UCB-T03** "Set on all rows" fill bar.
  - Status: ✅ Done · Covers: UCB-FILL-001, UCB-FILL-002
- [x] **UCB-T04** Row table with per-row cascades, solution switch keeping same-named type/status, duplicate/remove.
  - Status: ✅ Done · Covers: UCB-ROWS-001, UCB-ROWS-002, UCB-ROWS-005
- [x] **UCB-T05** Add row (template) and "every department in…".
  - Status: ✅ Done · Covers: UCB-ROWS-003, UCB-ROWS-004
- [x] **UCB-T06** Paste from Excel with name matching and unmatched warning.
  - Status: ✅ Done · Covers: UCB-PASTE-001..003
- [x] **UCB-T07** Shared details section and "Replace on every copy".
  - Status: ✅ Done · Covers: UCB-SHARE-001, UCB-SHARE-002
- [x] **UCB-T08** Checks, footer counts, sequential save with progress and partial-failure handling.
  - Status: ✅ Done · Covers: UCB-SAVE-001..008 · Files: `UseCaseBulkForm.tsx`, `hooks/useParentActivity.ts`
- [ ] **UCB-T09** Tab-only split when a pasted line contains a tab.
  - Status: ⬜ Not started · Covers: UCB-PASTE-004
  - Step: Change the split in `addPasted`
  - Step: Update the paste-box help text
- [ ] **UCB-T10** Move the duplicate check into `src/lib/useCaseChecks.ts` (shared with UCF-T09).
  - Status: ⬜ Not started · Covers: UCB-SAVE-001, UCF-ADD-008
- [ ] **UCB-T11** Component tests for the four scenarios in requirements.
  - Status: ⬜ Not started · Covers: UCB-ROWS-004, UCB-PASTE-002, UCB-SAVE-007, UCB-SAVE-002 · Depends on: QA-T02
