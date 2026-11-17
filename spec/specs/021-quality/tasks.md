# Tasks — Quality, Testing and Definition of Done

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 4 · 🔄 0 · ⬜ 6 · ⛔ 0

- [x] **QA-T00** ESLint configuration and SDD process documents (constitution, steering, specs, templates).
  - Status: ✅ Done · Covers: QA-TRACE-002, QA-GATE-001, QA-DOD-001..005
- [x] **QA-T01** Set up Vitest (jsdom) with `npm test`; first unit tests for `score` and `exportCsv`.
  - Status: ✅ Done · Covers: QA-TEST-001, QA-TRACE-001 · Files: `vitest.config.ts`, `package.json`, `tests/unit/`, `spec/scripts/spec_lint.py`
  - Verified 2026-11-16: `npm test` → 18 passed, 1 expected fail (pinned gap EXP-NAME-002). Spec lint check 9 now rejects any JS/TS test title that does not start with a requirement ID (probe file rejected, then removed). `tests/` and `vitest.config.ts` are type-checked.
- [ ] **QA-T02** Add Testing Library for component tests.
  - Status: ⬜ Not started · Covers: QA-TEST-002 · Depends on: QA-T01
- [ ] **QA-T03** Server integration harness with fixture workbook and `WORKBOOK_PATH`.
  - Status: ⬜ Not started · Covers: QA-TEST-003 · Depends on: QA-T01, DATA-T09
- [ ] **QA-T04** Playwright E2E smoke flows with axe scans in both themes.
  - Status: ⬜ Not started · Covers: QA-TEST-004 · Depends on: QA-T03
- [x] **QA-T05** `typecheck` script.
  - Status: ✅ Done · Covers: QA-TEST-005 · Files: `package.json`
  - Verified 2026-11-16: `npm run typecheck` (app with `tsconfig.app.json`, server + Vite config with `tsconfig.node.json`) exits 0.
- [ ] **QA-T06** Enable `strictNullChecks`, then `strict`, for `src/`.
  - Status: ⬜ Not started · Covers: QA-GATE-002 · Depends on: QA-T05
- [ ] **QA-T07** CI pipeline running lint, typecheck and tests.
  - Status: ⬜ Not started · Covers: QA-GATE-003 · Unblocked 2026-11-16 by SEC-T02; needs a remote (GitHub) for Actions
- [x] **QA-T08** Fix the lint errors raised by the first locked dependency install (newer `typescript-eslint` rules).
  - Status: ✅ Done · Covers: QA-GATE-001 · Files: `src/components/ui/command.tsx`, `src/lib/html.ts`, `tailwind.config.ts`
  - Found 2026-11-16: `npm run lint` reported 4 errors (empty interface, literal NBSP in a regex, two `require()` imports). Fixed without behaviour change: NBSP regex now `/\u00a0/g` (checked to match U+00A0 only); Tailwind plugins imported as ES modules (built CSS still contains `.prose` and `animate-in`). Lint: 0 errors, 7 existing `react-refresh` warnings.
- [ ] **QA-T09** Make the spec tree count JS/TS test evidence.
  - Status: ⬜ Not started · Covers: — (tooling) · Found 2026-11-16: `spectree/build_spectree.py` (sdd-spectree skill 1.3.0) scans only `.py` test files, so the page shows 0% test evidence although `tests/unit/*.test.ts` cite 10 requirements. Fix in the sdd-spectree skill (its files must not be edited here), then regenerate. Spec lint (G1, G4) already reads the TS tests.
