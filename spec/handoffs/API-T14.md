---
contract: task-handoff.v1
task: API-T14
agent: AGENT-IMPLEMENTER
covers: [API-SUMM-002]
files_changed: [server/workbook.ts, tests/integration/summary.test.ts]
tests: [tests/integration/summary.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: API-T14 Reject a summary POST without a string `executive_summary`

## What changed
`saveSummary` in `server/workbook.ts` now checks the body before the customer lookup and before any mutation. A body
with no `executive_summary` field (including a JSON body that is `null` or not an object) throws
`HttpError(400, "Missing: executive_summary")`. A present but non-string value (number, boolean, object, `null`) throws
`HttpError(400, "executive_summary must be a string.")`. `required()` is not used, so an explicit `""` still clears the
summary (stored as null, timestamp stamped). The check runs inside `mutate(change)` before `store.save()`, so a rejected
request never reaches the atomic save; the existing catch path also drops the in-memory store. An unknown customer with
a bad body gets 400 (check order); an unknown customer with a valid body still gets 404. No client code changed:
`src/lib/customerSource.ts` `saveSummary` always sends a string.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| API-SUMM-002 (absent field → 400 `Missing: executive_summary`, nothing changes) | `tests/integration/summary.test.ts`: "API-SUMM-002 rejects a body without executive_summary with 400 and changes nothing" |
| API-SUMM-002 (absent field, other fields present) | "API-SUMM-002 rejects a body whose other fields are present but executive_summary is absent" |
| API-SUMM-002 (JSON `null` body, no TypeError/500) | "API-SUMM-002 rejects a JSON body that is not an object with 400 and changes nothing" |
| API-SUMM-002 (number → 400 `executive_summary must be a string.`) | "API-SUMM-002 rejects a numeric executive_summary with 400 and changes nothing" |
| API-SUMM-002 (`null` value → 400) | "API-SUMM-002 rejects a null executive_summary with 400 and changes nothing" |
| API-SUMM-002 (boolean → 400) | "API-SUMM-002 rejects a boolean executive_summary with 400 and changes nothing" |
| API-SUMM-002 (object → 400) | "API-SUMM-002 rejects an object executive_summary with 400 and changes nothing" |
| API-SUMM-002 (explicit empty string still clears; API-SUMM-001) | "API-SUMM-002 still clears the summary for an explicit empty string (200, stored as null)" |
| API-SUMM-002 (400 before 404 for an unknown customer) | "API-SUMM-002 answers 400, not 404, for an unknown customer when the body fails the check" |
| API-SUMM-002 / API-SUMM-001 (404 kept for a valid body) | "API-SUMM-002 keeps answering 404 for an unknown customer when the body is valid" |

Each rejection test asserts the status, the exact `{ error }` body, the file's SHA-256 unchanged, and the old
`executive_summary` and `summary_last_modified` unchanged both when re-read from the file (`api.reopen()`) and from the
same running server.

Red/green: before the code change, `npx vitest run tests/integration/summary.test.ts` gave 8 failed, 8 passed (the 8
failures are the 8 rejection tests; the two passing new tests, empty-string clear and 404 for a valid body, are
regression guards, and the 6 older tests are API-SUMM-001). After the change all pass.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 519 requirements, 237 tasks, 12 agents, 6 contracts, 5 prompts, 11 hand-offs, 0 error(s) (run after writing this file) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (all existing react-refresh warnings in `src/components`); typecheck: clean |
| G4 | `npm test` | 13 files passed; 99 passed, 1 expected fail (100) |

## Open questions
- Messages catalog (`spec/specs/017-design-system/messages-catalog.md`, line 53): the task's third Step asks to mark the
  new 400 text as implemented (it is still marked "planned, API-SUMM-002"). I did not edit it because the instructions
  limit spec changes to this hand-off; the orchestrator should do it when closing the task.
- Beyond the stated plan: a JSON body of `null` (or another non-object) is treated as "Missing: executive_summary"
  rather than crashing with a TypeError (which would have been a 500). It stays within the criterion's text; flagging it
  so the reviewer can confirm.
- Not closed here (orchestrator): API-SUMM-002 requirement status, gap register, README dashboard, task status.
- G5: n/a (server-only change; no UI).

## Review
**Verdict: pass** (AGENT-REVIEWER, 2026-11-20). Gates G1, G3, G4 pass; G5 n/a (server only).

- [minor] API-SUMM-002 (extension, judged acceptable): a body that is not an object (`null`, number, string, boolean,
  array) is answered 400 "Missing: executive_summary" instead of a TypeError (500); it uses the catalog wording. Only
  `null` is tested. Resolved at close: the criterion and design now say so, and the messages catalog row names it.
- Criteria met: absent field and non-string value (incl. `null`) → 400 with the exact texts; check order presence →
  type → 404 lookup → mutation; nothing changes on rejection (file SHA-256, summary and timestamp re-read from the file
  and from the live server); `""` still clears to null; `required()` not used.
- Tests are not vacuous (8 failed against the old code); no client or unrelated files changed; no secrets or `.xlsx`.
