# Tasks — Workbook Storage Engine

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 5 · 🔄 0 · ⬜ 2 · ⛔ 0

- [x] **STO-T01** Load with mtime freshness check and openpyxl table-path fix.
  - Status: ✅ Done · Covers: STO-LOAD-001..005 · Files: `server/workbook.ts`
- [x] **STO-T02** Value normalisation and cleaning.
  - Status: ✅ Done · Covers: STO-LOAD-006, STO-SAVE-003
- [x] **STO-T03** Save as Excel tables with README first.
  - Status: ✅ Done · Covers: STO-SAVE-001, STO-SAVE-002, STO-SAVE-008
- [x] **STO-T04** Atomic temp-file save, 423 on lock, discard memory on failure.
  - Status: ✅ Done · Covers: STO-SAVE-004..007
- [x] **STO-T05** Serial request queue.
  - Status: ✅ Done · Covers: STO-CONC-001, STO-CONC-002
- [ ] **STO-T06** Rolling backups before each save.
  - Status: ⬜ Not started · Covers: STO-SAVE-010, REL-SAFE-008
  - Step: Copy to `../data/backups/` with timestamp
  - Step: Keep newest 10
  - Step: Warn, do not fail, on backup error
- [ ] **STO-T07** Integration tests: reload on mtime, atomic save, 423 mapping (mock `renameSync`).
  - Status: ⬜ Not started · Covers: STO-LOAD-002, STO-SAVE-004, STO-SAVE-005 · Depends on: QA-T03
