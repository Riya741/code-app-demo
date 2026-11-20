# Tasks — Add / Edit Event

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 6 · 🔄 0 · ⬜ 3 · ⛔ 1

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
- [x] **EVF-T06** Save event edits.
  - Status: ✅ Done · Covers: EVF-EDIT-002
  - Verified 2026-11-18: agent workflow review passed (hand-off `spec/handoffs/EVF-T06.md`); G5 manual check reported passed by the owner on 2026-11-18 (light and dark themes, ≥ 1024px and < 1024px, every item in the hand-off list).
  - Step: Add `Id: row.id` when editing
  - Step: Toast "Event updated" (add to messages catalog)
  - Step: Remove `NOT_WIRED`
- [ ] **EVF-T07** Whole-number validation for attendees and duration.
  - Status: ⬜ Not started · Covers: EVF-ADD-004
- [ ] **EVF-T08** Controlled Stage list.
  - Status: ⛔ Blocked — waiting for product decision (open question 1) · Covers: EVF-ADD-005
- [ ] **EVF-T09** Component tests: required, add, edit save.
  - Status: ⬜ Not started · Covers: EVF-ADD-001, EVF-ADD-003, EVF-EDIT-002 · Depends on: QA-T02
- [ ] **EVF-T10** Tests for the edit normalisation the owner accepted (D4, CR-20261120-1); no code change expected.
  - Status: ⬜ Not started · Covers: EVF-EDIT-003, EVF-EDIT-004 · Files: `tests/component/EventForm.test.tsx`, `tests/integration/event-edit.test.ts`
  - Step: `EVF-EDIT-003 …`: a row with HTML `attendee_names` shows plain text in the textarea and posts that plain text
  - Step: `EVF-EDIT-004 …`: a row with `event_date` `2026-03-05T00:00:00` posts `2026-03-05` (today proven only inside an EVF-EDIT-002 test), and the server stores `2026-03-05` when sent a value with a time part
  - Step: Set EVF-EDIT-003 to ✅ and close its gap-register row
