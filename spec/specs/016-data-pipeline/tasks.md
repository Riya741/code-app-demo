# Tasks — Data Pipeline

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 8 tasks — ✅ 5 · 🔄 0 · ⬜ 3 · ⛔ 0

- [x] **PIPE-T01** Import use cases, customers, lookups, personnel, content types.
  - Status: ✅ Done · Covers: PIPE-BUILD-001..004 · Files: `scripts/build_workbook.py`
- [x] **PIPE-T02** Event recovery, solution matching, subsidiary backfill.
  - Status: ✅ Done · Covers: PIPE-BUILD-005..008
- [x] **PIPE-T03** Table definitions, cleaning, README and styled output.
  - Status: ✅ Done · Covers: PIPE-BUILD-009..014
- [x] **PIPE-T04** Use case notes script.
  - Status: ✅ Done · Covers: PIPE-NOTES-001..006 · Files: `scripts/apply_use_case_notes.py`
- [ ] **PIPE-T05** Add a `requirements.txt` (openpyxl) and pytest smoke tests on a tiny export fixture.
  - Status: ⬜ Not started · Covers: PIPE-BUILD-001..014, PIPE-NOTES-001..006
- [x] **PIPE-T07** Fictional demo workbook generator and catalogue.
  - Status: ✅ Done · Covers: PIPE-GEN-001..008 · Files: `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json`
  - Built 2026-11-16 at the owner's request before this spec existed (a deviation from Article I), then recorded here and in ADR-0006. Verified manually: the integrity check passes; the same seed gives identical data; the output loads through the server's ExcelJS path with 0 broken joins; a planted real name fails the `--reference` check; a locked file gives the PIPE-GEN-008 message.
- [ ] **PIPE-T08** Automated tests for the generator (integrity, determinism, real-name guard, edge cases).
  - Status: ⬜ Not started · Covers: PIPE-GEN-003, PIPE-GEN-004, PIPE-GEN-006, PIPE-GEN-007 · Depends on: PIPE-T05
- [ ] **PIPE-T06** Document the end-to-end rebuild procedure (backup → build → notes → verify in app) in the README sheet text.
  - Status: ⬜ Not started · Covers: PIPE-BUILD-013
