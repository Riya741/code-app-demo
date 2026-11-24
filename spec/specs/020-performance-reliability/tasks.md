# Tasks — Performance, Reliability, Compatibility, Dates

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 2 · 🔄 0 · ⬜ 5 · ⛔ 0

- [x] **PERF-T01** Performance mechanisms (search index, caching, lazy editor, mtime reload).
  - Status: ✅ Done · Covers: PERF-SPEED-001..004
- [x] **PERF-T02** Reliability mechanisms (atomic save, lock error, reload on failure, queue, retry).
  - Status: ✅ Done · Covers: REL-SAFE-001..005, REL-SAFE-007
- [ ] **PERF-T03** Add `src/lib/dates.ts` `formatDay` and use it everywhere dates are shown.
  - Status: ⬜ Not started · Covers: DT-TIME-003 · Same work as UCP-T08 / EVP-T07 · Deferred by CR-20261123-2
- [ ] **PERF-T04** Workbook backups.
  - Status: ⬜ Not started · Covers: REL-SAFE-008 · Same work as STO-T06
- [ ] **PERF-T05** Add `"engines": { "node": ">=20.19" }` and rename the package to `code-app-demo`.
  - Status: ⬜ Not started · Covers: COMP-ENV-003 · Files: `package.json`
- [ ] **PERF-T06** "Close the workbook in Excel" guidance in the lock error and workbook README.
  - Status: ⬜ Not started · Covers: REL-SAFE-006
- [ ] **PERF-T07** Measure save time on the real workbook and record it in this spec.
  - Status: ⬜ Not started · Covers: PERF-SPEED-005
