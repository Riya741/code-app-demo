---
contract: task-handoff.v1
task: QA-T03
agent: AGENT-IMPLEMENTER
covers: [QA-TEST-003]
files_changed: [tests/integration/harness.ts, tests/integration/harness.test.ts, tests/integration/workbook-api.test.ts]
tests: [tests/integration/harness.test.ts, tests/integration/workbook-api.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: QA-T03 Server integration harness with fixture workbook and WORKBOOK_PATH

## What changed
Server integration tests now run each test against a temp copy of a fixture workbook via `WORKBOOK_PATH`.
`tests/integration/harness.ts` exports `workbookApi()`, which registers the Vitest hooks for a test file:
- `beforeAll` generates the fixture once per test file with `scripts/generate_demo_workbook.py <tmp>/fixture.xlsx --customers 8`
  (interpreter `$PYTHON`, else `py` on Windows, else `python3`, always with `-I`). It takes about 2 s.
- `beforeEach` copies the fixture to a new temp folder, sets `WORKBOOK_PATH` to the copy and creates a new
  `workbookPlugin(...)`. The plugin's default path points to a file that does not exist, so the tests fail if
  `WORKBOOK_PATH` is not used. The harness records the middleware from `configureServer` (and checks that it is mounted
  on `/api/workbook`).
- `request(method, url, body?)` sends a fake `IncomingMessage` (a `Readable` with `url`/`method`, mount path removed as
  Connect does) and a fake `ServerResponse`. It resolves when `res.end` is called, because the handler runs without being
  awaited. `reopen()` gives a new plugin on the same file, so tests can check what was saved in the file, not in memory.
- `afterEach` restores `WORKBOOK_PATH` and deletes the copy. `afterAll` deletes the fixture. No port is opened.
  `../data` is never read or written.

Each integration test file starts with `// @vitest-environment node`. `vitest.config.ts` was not changed.
`server/workbook.ts` was not changed for this task.
The harness is shown working by tests of API behaviour that already exists (API-GEN-001..004, API-READ-004,
API-WRITE-001, API-WRITE-007, API-DEL-001, API-DEL-002). Those tests also count toward API-T11.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| QA-TEST-003 | `tests/integration/harness.test.ts`: "QA-TEST-003 serves a temp copy of the generated fixture through WORKBOOK_PATH" (the env var is the copy; the copy is in the OS temp folder, outside `../data`; it is byte-identical to the fixture; `GET /health` reports that file) |
| QA-TEST-003 | `tests/integration/harness.test.ts`: "QA-TEST-003 uses the fixture generated with --customers 8" |
| QA-TEST-003 | `tests/integration/harness.test.ts`: "QA-TEST-003 writes land in the test's copy, never in the fixture" |
| QA-TEST-003 | `tests/integration/harness.test.ts`: "QA-TEST-003 isolation, part 1: …" / "QA-TEST-003 isolation, part 2: the next test gets a new copy where that use case is still live" (and the previous copy was deleted) |
| QA-TEST-003 | `tests/integration/harness.test.ts`: an `afterAll` assertion checks that `WORKBOOK_PATH` is back to its original value |

Harness proof via existing API behaviour (`tests/integration/workbook-api.test.ts`):
"API-GEN-001 answers a successful request with 200 and JSON", "API-GEN-002 answers a failure with { error: message }
and its status", "API-GEN-002 returns 500 and logs it as [workbook] when the workbook is missing", "API-GEN-003 answers
an unknown route with 404 Unknown workbook request", "API-GEN-004 rejects a body that is not JSON with 400 and reads an
empty body as {}", "API-READ-004 requires a numeric parentId", "API-WRITE-001 inserts a use case when no id is given",
"API-WRITE-001 updates the use case named by id", "API-WRITE-001 answers 404 when the id to update
does not exist", "API-WRITE-001 answers 400 Missing: status_id and leaves the file unchanged", "API-WRITE-007 answers
use case and event saves with exactly { id: number }", "API-DEL-001 soft-deletes a use case: deleted = true,
last_modified = now, { ok: true }", "API-DEL-001 soft-deletes an event: deleted = true, last_modified = now, { ok: true }",
"API-DEL-002 answers 404 for a use case or event that does not exist", "API-DEL-002 answers 409 when the use case or
event was already deleted".

Some of these tests also check that the record appears in, or is missing from, `GET /use-cases` or `GET /events`. Those
are marked in the code as supporting checks only. They are not evidence for API-READ-002 or API-READ-003, which their
titles do not claim.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors (26 specs, 490 requirements, 225 tasks, 12 agents, 6 contracts, 5 prompts, hand-offs) |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 7 known `react-refresh` warnings · typecheck exit 0 (the tests are type-checked by `tsconfig.app.json`) |
| G4 | `npm test` | 7 files passed. 54 tests passed and 1 failed as expected (EXP-NAME-002 is pinned with `it.fails`). The 3 integration files pass 26 of 26: harness 5, workbook-api 15, summary 6 (API-T09). |

## Open questions
- The fixture is generated once per test **file**, not once per run. Vitest isolates modules per file, so a value
  stored in one module cannot be shared. Generating once per run needs a `globalSetup` entry in `vitest.config.ts`,
  which QA-T02 currently owns. Today this costs about 2 s per integration file. Should the orchestrator add
  `globalSetup` after QA-T02 closes?
- CI needs `openpyxl` installed in the interpreter's own site-packages. The harness runs the generator with `-I`,
  which ignores user site-packages, so a `pip install --user openpyxl` is not found and fixture generation fails. This
  is input for DEVA-T12 / QA-T07.
- The tests in `workbook-api.test.ts` cite requirements that API-T11 covers. That task can count them as partial
  evidence.
- G5 is n/a: the UI did not change.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (AGENT-REVIEWER@1.1.0, read-only), 2026-11-17.

**VERDICT: pass**, with minor findings.

Fixed by the implementer before close, and checked by the orchestrator (diff and a fresh gate run, no second review):
- [minor] QA-TRACE-001: three titles over-claimed API-READ-002/-003 behaviour ("lists it", "hidden from reads"). The titles are narrowed; the listing checks remain as commented supporting checks.
- [minor] QA-TEST-003: the `../data` guard depended on the working directory. It now builds the path from the harness `ROOT`.
- [minor] Hand-off: G4 recorded as fail because of QA-T02's since-fixed drive-letter defect. It is now pass.

Left open:
- [minor] CI must install openpyxl into the interpreter's own site-packages (`-I`). Input for QA-T07 / DEVA-T12.
- [minor] The 423 (file locked) path is untested. Input for API-T11.

GATES: G1 pass · G3 pass · G4 pass (7 files, 54 passed + 1 expected fail; integration 26/26).
