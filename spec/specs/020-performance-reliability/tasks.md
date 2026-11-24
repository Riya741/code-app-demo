# Tasks — Performance, Reliability, Compatibility, Dates

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 3 · 🔄 0 · ⬜ 4 · ⛔ 0

- [x] **PERF-T01** Performance mechanisms (search index, caching, lazy editor, mtime reload).
  - Status: ✅ Done · Covers: PERF-SPEED-001..004
- [x] **PERF-T02** Reliability mechanisms (atomic save, lock error, reload on failure, queue, retry).
  - Status: ✅ Done · Covers: REL-SAFE-001..005, REL-SAFE-007
- [x] **PERF-T03** Add `src/lib/dates.ts` `formatDay` and use it everywhere dates are shown.
  - Status: ✅ Done · Covers: DT-TIME-003 · Same work as UCP-T08 / EVP-T07 · Deferred by CR-20261123-2; delivered with UCP-T08 (shared work, one helper)
  - Verified 2026-11-24: `src/lib/dates.ts` is the one helper for every displayed date-only value (Launch Date, Event Date, event delete confirmation); `fmtUtc` and export file names unchanged (already correct); `tests/unit/dates.test.ts` titled `DT-TIME-003 …`; G1, G3, G4 pass; G5 passed (owner) ([hand-off](../../handoffs/UCP-T08.md)).
- [ ] **PERF-T04** Workbook backups.
  - Status: ⬜ Not started · Covers: REL-SAFE-008 · Same work as STO-T06
- [ ] **PERF-T05** Add `"engines": { "node": ">=20.19" }` and rename the package to `code-app-demo`.
  - Status: ⬜ Not started · Covers: COMP-ENV-003 · Files: `package.json`
- [ ] **PERF-T06** "Close the workbook in Excel" guidance in the lock error and workbook README.
  - Status: ⬜ Not started · Covers: REL-SAFE-006
- [ ] **PERF-T07** Measure save time on the real workbook and record it in this spec.
  - Status: ⬜ Not started · Covers: PERF-SPEED-005
