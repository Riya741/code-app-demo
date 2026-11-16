# Tasks — Exports

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 3 · 🔄 0 · ⬜ 4 · ⛔ 0

- [x] **EXP-T01** CSV writer with BOM, CRLF, quoting and formula guard.
  - Status: ✅ Done · Covers: EXP-CSV-001..005 · Files: `lib/csv.ts`
- [x] **EXP-T02** File name helper.
  - Status: ✅ Done · Covers: EXP-NAME-001 · Files: `lib/csv.ts`
- [x] **EXP-T03** Word document export.
  - Status: ✅ Done · Covers: EXP-WORD-001..003 · Files: `lib/wordDoc.ts`
- [ ] **EXP-T04** Unicode-safe file names.
  - Status: ⬜ Not started · Covers: EXP-NAME-002
- [ ] **EXP-T05** Remove unused `prettify` (or use it).
  - Status: ⬜ Not started · Covers: — (Article VIII cleanup)
- [ ] **EXP-T06** Evaluate `.docx` export; write ADR if adopted.
  - Status: ⬜ Not started · Covers: EXP-WORD-004
- [ ] **EXP-T07** Unit tests for escaping, formula guard and file names.
  - Status: ⬜ Not started · Covers: EXP-NAME-001, EXP-NAME-002, EXP-CSV-002, EXP-CSV-003 · Depends on: QA-T01
