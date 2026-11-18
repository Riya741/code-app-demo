---
contract: task-handoff.v1
task: SUM-T08
agent: AGENT-IMPLEMENTER
covers: [SUM-EDIT-001]
files_changed: [src/lib/customerSource.ts, src/hooks/useCustomers.ts]
tests: [tests/component/CustomerDetails.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: SUM-T08 Client fetcher `saveSummary` + `useSaveSummary` hook

## What changed
This is the client data layer for SUM-EDIT-001, following step 2 of "Target design for SUM-EDIT-001" in
`003-executive-summary/design.md`. The server endpoint already existed (API-T09).

- `saveSummary(id, html)` in `src/lib/customerSource.ts` calls the existing `post` from `src/lib/workbookApi.ts`. It
  sends `POST /api/workbook/customers/:id/summary` with `{ executive_summary: html }` and returns
  `{ id, summary_last_modified }` (exported type `SaveSummaryResult`). `id` is the `customer` sheet `id`, which is the
  key the endpoint uses to find the customer. Server errors reach the caller as the `Error` message that `api()`
  already builds.
- `useSaveSummary()` in `src/hooks/useCustomers.ts` is a `useMutation` over `{ id, html }`. On success it invalidates
  `["customers"]`, and it returns that promise. So the mutation stays pending until the refetched customer rows are in
  the cache. The component therefore closes the editor (SUM-T09) only after the stored summary and the new timestamp
  are available.

The layering is component → hook → lib → API (Article IX). No component calls `fetch`.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| SUM-EDIT-001 (write) | `tests/component/CustomerDetails.test.tsx`: "SUM-EDIT-001 posts { executive_summary } for the customer's sheet id when Save is clicked". `fetch` is stubbed and the real hook → fetcher → `workbookApi` chain runs; the test asserts URL `/api/workbook/customers/7/summary`, method POST and the JSON body. |
| SUM-EDIT-001 (refresh) | same file: "SUM-EDIT-001 refreshes the customer data after a successful save" (`invalidateQueries({ queryKey: ["customers"] })`) |
| SUM-EDIT-001 (server) | `tests/integration/summary.test.ts` (API-T09, not duplicated): stores the text and sets `summary_last_modified` to now |

## Gates
Run once for SUM-T08..T11 together, on the final tree.

| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 490 requirements, 226 tasks, 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (the 7 known `react-refresh` warnings plus 1 new one from SUM-T11, see that hand-off) · typecheck: exit 0 |
| G4 | `npm test` | 13 files passed. 86 tests passed and 1 failed as expected (EXP-NAME-002 is pinned with `it.fails`). |

## Open questions
- None for this task. G5 is n/a because there is no UI here; the UI checks are in SUM-T09.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (project `reviewer` subagent, AGENT-REVIEWER@1.1.0, read-only), 2026-11-18.

**VERDICT: pass.** Layering is correct (component → `useSaveSummary` → `saveSummary` → `workbookApi.post`). The mutation invalidates `["customers"]`, the only query that holds the summary. It sends the sheet `id`, not `parent_id`, and the test proves it.

Minor findings:
- [minor] Process / AGENT-IMPLEMENTER tools: both files were first written through Bash, which skipped the spec-guard and post-edit hooks. The implementer reported this and rewrote them with Write so the hooks ran, and the result is unaffected. The root cause is that `.claude/agents/implementer.md` gives the implementer unrestricted Bash; tracked as **DEVA-T15**.
- [minor] SUM-EDIT-001: if the POST succeeds but the refetch fails, TanStack v5 does not throw, so the panel keeps the stale summary after a "successful" save. Tracked as **SUM-T12** (update the cache from the response).

GATES (reviewer's own run): G1 pass (0 errors) · G3 pass (lint 0 errors, 8 warnings; typecheck 0) · G4 pass (13 files, 86 passed + 1 expected fail).
