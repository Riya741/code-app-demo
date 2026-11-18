---
contract: task-handoff.v1
task: QA-T02
agent: AGENT-IMPLEMENTER
covers: [QA-TEST-002]
files_changed: [package.json, package-lock.json, vitest.config.ts, tests/setup.ts, tests/component/ConfirmDelete.test.tsx, tests/component/Panel.test.tsx]
tests: [tests/component/ConfirmDelete.test.tsx, tests/component/Panel.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: QA-T02 Add Testing Library for component tests

## What changed
Component tests now use Testing Library. Four dev dependencies were added with `npm install -D` (package-lock.json
updated by npm): `@testing-library/react` ^16.3.3 (peer range React ^18 || ^19; resolves against the installed React
18.3.1), its peer `@testing-library/dom` ^10.4.2, `@testing-library/user-event` ^14.6.12 and
`@testing-library/jest-dom` ^7.0.1. Nothing else was added (Article VIII.2). The new `tests/setup.ts` registers the
jest-dom matchers on Vitest's `expect` (`@testing-library/jest-dom/vitest`) and calls `cleanup()` after each test,
because Testing Library only cleans up by itself when Vitest globals are on, and they are not. `vitest.config.ts`
loads it through `test.setupFiles`; the jsdom environment and the include globs are unchanged. No tsconfig change was
needed: `tests/` is already in `tsconfig.app.json`, and the setup file's import brings the jest-dom matcher types into
the program, so `npm run typecheck` type-checks the component tests including `toBeInTheDocument` and friends. Two
component test files prove the harness against behaviour that is already implemented and specified:
`ConfirmDelete` (DS-COMP-003, UCP-DEL-002) and `Panel` (LAY-SHELL-001). They query by role and visible text and drive
the dialog with `userEvent`. No production code changed.

### Fix: lower-case drive letter (found by the stop hook)
From a cwd with a lower-case drive letter (`c:\…`, how VS Code terminals open this workspace), every test file failed
with "Vitest failed to find the current suite" at `tests/setup.ts` (`afterEach`). **Cause:** Node loads Vitest's own
worker modules from `file:///c:/…` (the path it was started with), while Vite normalises the project root to `C:/…`
and hands the worker `file:///C:/…/vitest/dist/index.js` for the tests' `import … from "vitest"` (and jest-dom's own
`vitest` import). Node caches ES modules by URL, so the worker held two Vitest instances: the tests registered
suites on one while the runner read the other. This is not caused by the setup file: with `setupFiles` removed, the
existing unit tests already failed from `c:\` ("Cannot read properties of undefined (reading 'config')"), so the
defect dates from QA-T01; the setup file only moved where it shows. Upper-casing the cwd in the config
(`process.chdir`), `resolve.preserveSymlinks` and a `resolveId` plugin that pins `vitest` to a lower-case external URL
were tried and did not help (Vitest re-normalises the URL). **Fix:** `vitest.config.ts` passes `test.execArgv` (Windows
only) with `--import` of an inline `data:` module that registers a Node module resolve hook in each test worker; the
hook upper-cases the drive letter of every `file:///x:/` URL, so all modules load under one URL and there is one Vitest
instance. No new file or dependency. Verified: `node node_modules/vitest/vitest.mjs run` with cwd `c:\…` and with cwd
`C:\…` both give 7 files, 54 passed, 1 expected fail; `npm test` with cwd `c:\…` (via `py -I` subprocess) and from
Git Bash give the same.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| QA-TEST-002 | `package.json` devDependencies + `tests/setup.ts` + `vitest.config.ts` `setupFiles` (and `execArgv` drive-letter hook, so the harness runs from `c:\` and `C:\` cwd); the 10 tests below render with `@testing-library/react`, interact with `@testing-library/user-event` and assert with jest-dom matchers, and all pass under `npm test` |
| DS-COMP-003 (harness proof) | `tests/component/ConfirmDelete.test.tsx`: "DS-COMP-003 asks in an alert dialog and does not ask to close when Yes, delete is clicked"; "DS-COMP-003 closes on Escape when nothing is pending" (control: proves the Escape path is live); "DS-COMP-003 stays open while the delete is pending, even when Escape is pressed"; "DS-COMP-003 closes through Cancel when nothing is pending"; "DS-COMP-003 stays open on error: reading the error, tabbing and retrying with Yes, delete do not ask to close". `open` is a controlled prop, so "stays open" is proven as "ConfirmDelete never calls onCancel", the only way it asks its caller to close. |
| UCP-DEL-002 (harness proof) | `tests/component/ConfirmDelete.test.tsx`: "UCP-DEL-002 disables both buttons and shows a spinner while deleting"; "UCP-DEL-002 shows no spinner and enables the buttons when not deleting"; "UCP-DEL-002 shows Could not delete: <message> in the dialog when the delete fails" |
| LAY-SHELL-001 (harness proof) | `tests/component/Panel.test.tsx`: "LAY-SHELL-001 shows a header bar with the title, count, tally badges and actions, followed by the body" (body is outside the header and follows it in document order); "LAY-SHELL-001 leaves out the count badge when no count is given" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 490 requirements, 225 tasks, 12 agents, 6 contracts, 5 prompts, 3 hand-offs, 0 error(s) (re-run by the reviewer; the count includes QA-T03 and API-T09) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 7 warnings (the known `react-refresh/only-export-components` ones); typecheck: exit 0 |
| G4 | `npm test` | 7 files, 54 passed, 1 expected fail (pinned gap EXP-NAME-002), from both `c:\` and `C:\` cwd; includes the 10 new component tests and the in-progress QA-T03/API-T09 integration tests |
| G5 | manual UI check | n/a: no UI change |

## Open questions
- The drive-letter fix works around what looks like a Vitest 5.1.0 bug (its own drive-letter normalisation in the
  worker does not cover `file://` ids). Someone may want to report it upstream; when a fixed Vitest is installed, the
  `execArgv` hook can be removed (check by running from a `c:\` cwd without it).
- The tests also cite DS-COMP-003, UCP-DEL-002 and LAY-SHELL-001, which are outside this task's Covers line; the
  closer may want to record them as test evidence for those requirements in the traceability. Visual parts of
  LAY-SHELL-001 (rounded card, uppercase title, scroll only when needed, fade/slide-in) are CSS and are not asserted.
- Observation for the DS/UCP owner (from review): clicking Cancel calls `onCancel` twice, once from the
  `AlertDialogCancel` `onClick` and once from `onOpenChange(false)`. It is harmless today because callers only set
  their state to null, but a caller with side effects in `onCancel` would run them twice. The test asserts only that
  `onCancel` was called, not how often.
- Right alignment of the header actions (LAY-SHELL-001) is CSS (`ml-auto`) and is not asserted.
- The spinner check in "UCP-DEL-002 disables both buttons …" looks for an `svg` inside the "Yes, delete" button
  (the Loader2 icon has no accessible name). If the button ever gains a decorative icon, that assertion will need an
  accessible label on the spinner instead (e.g. `aria-label`), which would be a small UI change under its own task.
- `tests/setup.ts` runs for every test file, including the node-environment integration tests from QA-T03; it is
  harmless there (they pass), but if QA-T03 prefers a separate Vitest project for server tests, the setup file can
  move to the jsdom project only.
- `npm install` reported 26 audit findings (1 low, 6 moderate, 19 high) across the whole tree. `npm audit --json`
  lists none in `@testing-library/*` or their dependencies (they sit in vite, vitest, typescript-eslint, tailwindcss,
  exceljs, quill, react-router, zod and their transitive packages), so they predate this task; SEC should triage them.

## Review
Recorded by the orchestrating session from the reviewer subagent's reports (AGENT-REVIEWER@1.1.0, read-only), 2026-11-17.

**Round 1: VERDICT pass**, 5 minor findings. Two were fixed by the implementer before round 2:
- the "stays open on error" check could not fail (DS-COMP-003);
- the Panel test title claimed right alignment and order it did not assert (LAY-SHELL-001).

The orchestrator's stop hook (DEVA-GATE-002) then found a **real defect**: the suite failed from a lower-case `c:` working directory, which is how VS Code terminals open. The implementer fixed it in `vitest.config.ts`, and it dates from QA-T01.

**Round 2 (re-review of the fix and the revised tests): VERDICT pass**, minor findings:
- [minor] Article VIII.1: the resolve hook is an escaped string inside two nested `data:` URLs, which ESLint and tsc do not see. A small `.mjs` file would be easier to maintain (optional).
- [minor] QA-TEST-001: the workaround has no owner for its removal. Tracked as **QA-T10** at close.
- [minor] Hand-off G1 count was stale (fixed above).
- [minor] G4 stability: 1 unexplained failure in 9 runs during parallel work. Not reproduced; watch.

GATES (round 2): G1 pass (0 errors) · G3 pass (lint 0 errors, 7 known warnings; typecheck 0) · G4 pass (7 files, 54 passed + 1 expected fail, from `c:\` and `C:\`).
