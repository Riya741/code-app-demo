# Tasks — Events Panel

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 9 tasks — ✅ 6 · 🔄 0 · ⬜ 3 · ⛔ 0

- [x] **EVP-T01** Header with count, Completed and Attendees tallies, Add event, Export.
  - Status: ✅ Done · Covers: EVP-HEAD-001..003 · Files: `ParentActivity.tsx`
- [x] **EVP-T02** Event columns with filters and descending-first date sort.
  - Status: ✅ Done · Covers: EVP-GRID-001, EVP-GRID-002
- [x] **EVP-T03** Row expansion (Attendees, Meeting notes) and Edit/Delete actions.
  - Status: ✅ Done · Covers: EVP-GRID-004, EVP-GRID-005
- [x] **EVP-T04** Warning banners.
  - Status: ✅ Done · Covers: EVP-GRID-006
- [x] **EVP-T05** Delete confirmation and soft delete.
  - Status: ✅ Done · Covers: EVP-DEL-001, EVP-DEL-002
- [x] **EVP-T06** CSV export with extras; loading/error/empty states.
  - Status: ✅ Done · Covers: EVP-CSV-001, EVP-STATE-001
- [ ] **EVP-T07** Show event dates on the stored calendar day.
  - Status: ⬜ Not started · Covers: EVP-GRID-003 · Depends on: UCP-T08 (`src/lib/dates.ts`)
- [ ] **EVP-T08** Decide on the warnings mechanism (remove, or add server-side warnings) and update the spec.
  - Status: ⬜ Not started · Covers: EVP-GRID-006
- [ ] **EVP-T09** Component tests: tallies, attendee range filter, export.
  - Status: ⬜ Not started · Covers: EVP-HEAD-002, EVP-CSV-001 · Depends on: QA-T02
