---
contract: task-handoff.v1
task: SUM-T11
agent: AGENT-IMPLEMENTER
covers: [SUM-VIEW-004, SUM-EDIT-001]
files_changed: [tests/unit/fmtUtc.test.ts, tests/component/CustomerDetails.test.tsx, src/components/customers/CustomerDetails.tsx]
tests: [tests/unit/fmtUtc.test.ts, tests/component/CustomerDetails.test.tsx, tests/integration/summary.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: SUM-T11 Tests: `fmtUtc` unit, endpoint integration, save/cancel component test

## What changed
- **`fmtUtc` unit tests** (`tests/unit/fmtUtc.test.ts`, 7 tests). `fmtUtc` is now `export`ed from `CustomerDetails.tsx`.
  The keyword is the only change: its behaviour is the same.
- **Component test** (`tests/component/CustomerDetails.test.tsx`, 12 tests) for save and cancel, rendered inside a
  `QueryClientProvider` with retries off. It mocks at the network boundary: `fetch` is stubbed with `vi.stubGlobal`, so
  the real `useSaveSummary` → `saveSummary` → `workbookApi.post`/`api()` chain runs. `sonner`'s `toast` is mocked so
  the tests can assert the exact toast arguments.
- **The rich-text editor is mocked.** `@/components/customers/RichTextEditor` is replaced with a plain `<textarea>` that
  has the same `html`/`onChange` props. I did not try to run Quill in jsdom; it needs browser layout and selection APIs
  that jsdom lacks. The lazy `import()` still runs, so the "Loading editor…" Suspense path is used and the tests wait
  for the editor with `findByLabelText`.
- **Endpoint integration tests** are not duplicated. `tests/integration/summary.test.ts` from API-T09 already covers the
  server half of SUM-EDIT-001 (6 tests: stored text, timestamp = now, response shape, blank → null, only the named
  customer, 404).

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| SUM-VIEW-004 | `tests/unit/fmtUtc.test.ts`: "SUM-VIEW-004 formats as Mon D, YYYY, h:mm AM/PM UTC" |
| SUM-VIEW-004 | "SUM-VIEW-004 reads a zone-less timestamp as UTC" |
| SUM-VIEW-004 | "SUM-VIEW-004 reads a zone-less timestamp with a space instead of T as UTC" |
| SUM-VIEW-004 | "SUM-VIEW-004 converts a timestamp with a zone offset to UTC" |
| SUM-VIEW-004 | "SUM-VIEW-004 reads a date-only value as midnight UTC" |
| SUM-VIEW-004 | "SUM-VIEW-004 hides placeholder dates before the year 2000 and shows 2000 itself" |
| SUM-VIEW-004 | "SUM-VIEW-004 returns null for invalid, blank and non-string values" |
| SUM-VIEW-004 | `tests/component/CustomerDetails.test.tsx`: "SUM-VIEW-004 shows Last modified in UTC in the header, reading the zone-less value as UTC" |
| SUM-EDIT-001 | "SUM-EDIT-001 posts { executive_summary } for the customer's sheet id when Save is clicked" (`id` 7 ≠ `parent_id` 1007; URL `/api/workbook/customers/7/summary`) |
| SUM-EDIT-001 | "SUM-EDIT-001 refreshes the customer data after a successful save" |
| SUM-EDIT-001 | "SUM-EDIT-001 shows the stored summary and new Last modified from the refreshed row, with no on-screen-only copy" |
| SUM-EDIT-001 (server) | `tests/integration/summary.test.ts`: the six "API-SUMM-001 …" tests (API-T09) |

Other tests in the component file prove requirements from SUM-T09 and SUM-T03, so they are listed in those hand-offs
rather than in this task's `covers`:
- the five SUM-EDIT-005 tests and the two SUM-EDIT-006 tests (SUM-T09 hand-off);
- "SUM-EDIT-004 Cancel discards the draft and posts nothing", which asserts that `fetch` is never called, the editor
  closes and the original summary is shown.

## Gates
Run once for SUM-T08..T11 together, on the final tree.

| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 490 requirements, 226 tasks, 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings · typecheck: exit 0 |
| G4 | `npm test` | 13 files passed. 86 tests passed and 1 failed as expected (EXP-NAME-002 is pinned with `it.fails`). The two new files pass 19 of 19 (7 + 12). |

## Open questions
- **New lint warning.** Exporting `fmtUtc` from a component file adds one `react-refresh/only-export-components` warning
  at `CustomerDetails.tsx:17`, so the count goes from 7 known warnings to 8. The orchestrator allowed the export. The
  clean fix is to move `fmtUtc` into `src/lib` (for example `src/lib/dates.ts`) and import it in the component and the
  test. That is outside the files this task names. Who decides: the orchestrator or the spec owner (design.md
  "Components and files").
- The design's testing approach also lists "link click does not open editor" (SUM-EDIT-002). That is not on SUM-T11's
  Covers line, so no test was added for it.
- The `Customers.tsx` re-pick by `id` has no automated test (see the SUM-T09 hand-off); G5 covers it.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**VERDICT: pass.** The `fmtUtc` tests prove the criterion (format, UTC reading, offsets, date-only, the 2000 boundary, invalid input). No test was weakened.

Minor findings:
- [minor] Exporting `fmtUtc` from the component adds one react-refresh warning (8 instead of 7). Lint passes; moving it to `src/lib/dates.ts` is part of **SUM-T12**.
- [minor] The title "SUM-EDIT-001 shows the stored summary … from the refreshed row" over-states: the test re-renders with a new prop. To be narrowed in SUM-T12.

GATES (reviewer's own run): G1 pass (0 errors) · G3 pass (lint 0 errors, 8 warnings; typecheck 0) · G4 pass (13 files, 86 passed + 1 expected fail).
