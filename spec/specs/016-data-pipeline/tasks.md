# Tasks — Data Pipeline

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 6 tasks — ✅ 4 · 🔄 0 · ⬜ 2 · ⛔ 0

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
- [ ] **PIPE-T06** Document the end-to-end rebuild procedure (backup → build → notes → verify in app) in the README sheet text.
  - Status: ⬜ Not started · Covers: PIPE-BUILD-013
