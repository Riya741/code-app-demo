# Tasks — Add / Edit Event

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 9 tasks — ✅ 5 · 🔄 1 · ⬜ 2 · ⛔ 1

- [x] **EVF-T01** Dialog, fields, stage suggestions.
  - Status: ✅ Done · Covers: EVF-FIELD-001, EVF-FIELD-002 · Files: `EventForm.tsx`
- [x] **EVF-T02** Subsidiary options with `detectKey`; lookup hooks.
  - Status: ✅ Done · Covers: EVF-FIELD-003
- [x] **EVF-T03** Required validation.
  - Status: ✅ Done · Covers: EVF-ADD-001
- [x] **EVF-T04** Add save with payload mapping and feedback.
  - Status: ✅ Done · Covers: EVF-ADD-002, EVF-ADD-003 · Files: `EventForm.tsx`, `hooks/useParentActivity.ts`
- [x] **EVF-T05** Edit pre-fill.
  - Status: ✅ Done · Covers: EVF-EDIT-001
- [ ] **EVF-T06** Save event edits.
  - Status: 🔄 In progress · Covers: EVF-EDIT-002
  - Review passed 2026-11-18 (hand-off `spec/handoffs/EVF-T06.md`, verdict pass); code and tests in place. Stays 🔄 until the owner records the G5 manual check listed in the hand-off.
  - Step: Add `Id: row.id` when editing
  - Step: Toast "Event updated" (add to messages catalog)
  - Step: Remove `NOT_WIRED`
- [ ] **EVF-T07** Whole-number validation for attendees and duration.
  - Status: ⬜ Not started · Covers: EVF-ADD-004
- [ ] **EVF-T08** Controlled Stage list.
  - Status: ⛔ Blocked — waiting for product decision (open question 1) · Covers: EVF-ADD-005
- [ ] **EVF-T09** Component tests: required, add, edit save.
  - Status: ⬜ Not started · Covers: EVF-ADD-001, EVF-ADD-003, EVF-EDIT-002 · Depends on: QA-T02
