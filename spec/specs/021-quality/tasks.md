# Tasks — Quality, Testing and Definition of Done

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 8 tasks — ✅ 1 · 🔄 0 · ⬜ 6 · ⛔ 1

- [x] **QA-T00** ESLint configuration and SDD process documents (constitution, steering, specs, templates).
  - Status: ✅ Done · Covers: QA-TRACE-002, QA-GATE-001, QA-DOD-001..005
- [ ] **QA-T01** Set up Vitest (jsdom) with `npm test`; first unit tests for `score` and `exportCsv`.
  - Status: ⬜ Not started · Covers: QA-TEST-001, QA-TRACE-001
- [ ] **QA-T02** Add Testing Library for component tests.
  - Status: ⬜ Not started · Covers: QA-TEST-002 · Depends on: QA-T01
- [ ] **QA-T03** Server integration harness with fixture workbook and `WORKBOOK_PATH`.
  - Status: ⬜ Not started · Covers: QA-TEST-003 · Depends on: QA-T01, DATA-T09
- [ ] **QA-T04** Playwright E2E smoke flows with axe scans in both themes.
  - Status: ⬜ Not started · Covers: QA-TEST-004 · Depends on: QA-T03
- [ ] **QA-T05** `typecheck` script.
  - Status: ⬜ Not started · Covers: QA-TEST-005
- [ ] **QA-T06** Enable `strictNullChecks`, then `strict`, for `src/`.
  - Status: ⬜ Not started · Covers: QA-GATE-002 · Depends on: QA-T05
- [ ] **QA-T07** CI pipeline running lint, typecheck and tests.
  - Status: ⛔ Blocked by SEC-T02 (repository not in git) · Covers: QA-GATE-003
