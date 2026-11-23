# Requirements — Quality, Testing and Definition of Done

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| quality | QA | ❌ No automated tests yet | I, X |

## Introduction
How the acceptance criteria in every spec are verified, and what "done" means.

---

### QA-R1 — Test harness

#### QA-TEST-001: Unit tests
- **Status:** ✅ Implemented
- **Criterion:** `npm test` SHALL run unit tests (Vitest, jsdom).
- **Source:** `package.json`

#### QA-TEST-002: Component tests
- **Status:** ✅ Implemented
- **Criterion:** Component tests SHALL use Testing Library.
- **Source:** `package.json`, `vitest.config.ts`, `tests/setup.ts`

#### QA-TEST-003: Server integration tests
- **Status:** ✅ Implemented
- **Criterion:** Server integration tests SHALL run each test against a temp copy of a fixture workbook via `WORKBOOK_PATH`.
- **Source:** `tests/integration/harness.ts`

#### QA-TEST-004: End-to-end smoke and axe
- **Status:** 📝 Planned
- **Criterion:** `npm run test:e2e` SHALL run Playwright smoke flows with an axe accessibility scan in both themes.
- **Source:** `package.json`

#### QA-TEST-005: Typecheck script
- **Status:** ✅ Implemented
- **Criterion:** `npm run typecheck` SHALL type-check app and server.
- **Source:** `package.json`

### QA-R2 — Traceability

#### QA-TRACE-001: Tests cite requirement IDs
- **Status:** ✅ Implemented
- **Criterion:** EVERY test name SHALL start with the requirement ID it verifies (e.g. `SRCH-RANK-003 …`).

#### QA-TRACE-002: Tasks list requirements and status
- **Status:** ✅ Implemented
- **Criterion:** EVERY task SHALL list its requirement IDs and status.

### QA-R3 — Code quality gates

#### QA-GATE-001: Lint passes
- **Status:** ✅ Implemented
- **Criterion:** `npm run lint` SHALL pass.
- **Source:** `.github/workflows/ci.yml`, `eslint.config.js`, `tsconfig.app.json`, `package.json`

#### QA-GATE-002: TypeScript strict
- **Status:** 📝 Planned — (`strict: false`)
- **Criterion:** TypeScript `strict` SHALL be enabled for `src/`.
- **Source:** `eslint.config.js`, `tsconfig.app.json`, `package.json`

#### QA-GATE-003: Checks on every commit
- **Status:** ✅ Implemented
- **Criterion:** Lint, typecheck and tests SHALL run on every commit/PR once the repo is in git.
- **Source:** `eslint.config.js`, `tsconfig.app.json`, `package.json`

### QA-R4 — Definition of Done (per task)

#### QA-DOD-001: Spec before code
- **Status:** ✅ Implemented — process
- **Criterion:** Spec (requirements → design → tasks) updated and reviewed before code.

#### QA-DOD-002: Criteria verified
- **Status:** ✅ Implemented — process
- **Criterion:** Acceptance criteria verified (automated, or manual with a note).

#### QA-DOD-003: Messages catalogued
- **Status:** ✅ Implemented — process
- **Criterion:** New messages added to the messages catalog.

#### QA-DOD-004: Themes and breakpoints checked
- **Status:** ✅ Implemented — process
- **Criterion:** Light + dark and ≥1024px + <1024px checked.

#### QA-DOD-005: Statuses and traceability updated
- **Status:** ✅ Implemented — process
- **Criterion:** Task status set to ✅ and requirement status updated; traceability updated.
