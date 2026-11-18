# Tasks — Add / Edit Use Case

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 7 · 🔄 1 · ⬜ 2 · ⛔ 0

- [x] **UCF-T01** Dialog shell, fields, labels and placeholders.
  - Status: ✅ Done · Covers: UCF-FIELD-001, UCF-ADD-006, UCF-ADD-007 · Files: `UseCaseForm.tsx`
- [x] **UCF-T02** Lookup hooks and option building (labels, detectKey).
  - Status: ✅ Done · Covers: UCF-FIELD-002, UCF-FIELD-003, UCF-FIELD-008 · Files: `UseCaseForm.tsx`, `hooks/useLookups.ts`, `lib/lookups.ts`
- [x] **UCF-T03** Cascading clears, disabled states, empty/loading/error texts.
  - Status: ✅ Done · Covers: UCF-FIELD-004..007 · Files: `UseCaseForm.tsx`, `Combobox.tsx`
- [x] **UCF-T04** Required validation after first submit.
  - Status: ✅ Done · Covers: UCF-ADD-001
- [x] **UCF-T05** Add save: payload mapping, pending, success toast, error banner.
  - Status: ✅ Done · Covers: UCF-ADD-002..005 · Files: `UseCaseForm.tsx`, `hooks/useParentActivity.ts`
- [x] **UCF-T06** Edit mode pre-fill.
  - Status: ✅ Done · Covers: UCF-EDIT-001, UCF-EDIT-003
- [ ] **UCF-T07** Save edits through the API.
  - Status: 🔄 In progress · Covers: UCF-EDIT-002 · Files: `UseCaseForm.tsx`
  - Review passed 2026-11-18 (hand-off `spec/handoffs/UCF-T07.md`, verdict pass); code and tests in place. Stays 🔄 until the owner records the G5 manual check listed in the hand-off. Round 1 failed on a real data-loss defect (premium_credit erased when Save was clicked before the solutions lookup loaded); fixed and re-reviewed.
  - Step: Add `id: row.id` to the payload when editing
  - Step: Success toast "Use case updated"; add text to the messages catalog
  - Step: Remove `NOT_WIRED`
- [x] **UCF-T08** Preserve hidden fields on edit.
  - Status: ✅ Done · Covers: UCF-EDIT-004 · Depends on: UCF-T07
  - Verified 2026-11-18 via the agent workflow (implementer subagent, then the project reviewer subagent; hand-off `spec/handoffs/UCF-T08.md`, verdict pass): an edit posts the row's three targets; the component test pins the posted body and the integration test re-reads the file (round trip checked through the harness instead of opening Excel). G5 n/a (no visual change).
  - Step: Send `target_users`, `target_credits_consumed`, `target_api_calls` from `row`
  - Step: Verify the round trip in Excel: target values unchanged after an edit (fields already exist on `UseCaseRow`)
- [ ] **UCF-T09** Duplicate warning shared with the bulk form.
  - Status: ⬜ Not started · Covers: UCF-ADD-008 · Files: new `src/lib/useCaseChecks.ts`, `UseCaseForm.tsx`, `UseCaseBulkForm.tsx`
- [ ] **UCF-T10** Component tests: cascades, required, add success/failure, edit save.
  - Status: ⬜ Not started · Covers: UCF-FIELD-004, UCF-ADD-001, UCF-ADD-004, UCF-ADD-005, UCF-EDIT-002 · Depends on: QA-T02
