---
contract: task-handoff.v1
task: API-T09
agent: AGENT-IMPLEMENTER
covers: [API-SUMM-001]
files_changed: [server/workbook.ts, spec/specs/017-design-system/messages-catalog.md, tests/integration/summary.test.ts]
tests: [tests/integration/summary.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: API-T09 `POST /customers/:id/summary`

## What changed
This work also delivers **SUM-T07**, the server endpoint for the executive summary. Only the server part of
SUM-EDIT-001 is done here. The client part (save fetcher, hook, refresh, UI) is SUM-T08..T10.

`POST /api/workbook/customers/:id/summary` with `{ executive_summary }` stores the text, saves a blank value as null and
sets `summary_last_modified = now`. It returns `{ id, summary_last_modified }`, or 404 "Customer <id> was not found." if
the customer does not exist. This follows target-design step 1 in `003-executive-summary/design.md` and the planned
design in `014-workbook-api/design.md`.

The new `saveSummary(s, id, body)` in `server/workbook.ts` finds the row in the `customer` sheet by `id`. It uses the
existing `text()` (blank → null) and `now()` helpers and throws `HttpError(404, …)`. The route runs inside the
`exclusive` queue and through `mutate`, so the save is serialised and atomic (temp file + rename, Article II). Store
`save()` applies the same `clean()` to the stored text as to every other cell.

The generated workbook's `customer` sheet has both columns (`id, parent_id, parent_name, executive_summary,
summary_last_modified, visible, industry, vertical`). The 404 message was added to the "Server 404" row of the
messages catalog.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| API-SUMM-001 | `tests/integration/summary.test.ts`: "API-SUMM-001 stores the summary text in the workbook file" (read back through a new plugin from the saved file) |
| API-SUMM-001 | "API-SUMM-001 sets summary_last_modified to now" (format `YYYY-MM-DDTHH:MM:SS`, between the times taken before and after the request) |
| API-SUMM-001 | "API-SUMM-001 returns { id, summary_last_modified } matching what was saved" |
| API-SUMM-001 | "API-SUMM-001 stores a blank summary as null and still stamps the time" (`""` and whitespace only) |
| API-SUMM-001 | "API-SUMM-001 changes only the named customer" |
| API-SUMM-001 | "API-SUMM-001 answers 404 when the customer does not exist and leaves the file unchanged" (`{ error: "Customer 999999 was not found." }`) |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | lint 0 errors, 7 known `react-refresh` warnings · typecheck exit 0 |
| G4 | `npm test` | 7 files passed. 54 tests passed and 1 failed as expected (EXP-NAME-002 is pinned with `it.fails`). `summary.test.ts` passes 6 of 6. |

## Open questions
- A body without `executive_summary` (for example `{}`) is treated as blank and clears the summary. This matches the
  full-replace style of the other writes (API-WRITE-002), but the criterion does not say what happens when the field
  is missing. Should a missing field be a 400 instead? Who answers: the spec owner (014 / 003).
- Clean-up needed when the task closes (spec files I must not edit): the routes table in `014-workbook-api/design.md`
  still marks the endpoint *(planned)*, and its "Planned design — API-SUMM-001" heading needs updating. The requirement
  status is also still 📝 Planned.
- A non-string `executive_summary` is not rejected. `text()` turns it into a string, so `123` is stored as `"123"`
  and `{}` as `"[object Object]"`. Should the endpoint answer 400 when the value is not a string? Who answers: the
  spec owner, as part of API-T11 / API-WRITE-008 validation.
- A JSON `null` body causes a 500. `readBody` returns `JSON.parse("null")`, which is `null`, and the next property read
  throws a `TypeError`. This was inherited, not introduced: `POST /use-cases` and `POST /events` behave the same way,
  because `required()` reads `body[k]`. It should be a 400 such as "The request body is not valid JSON." or a new
  catalog message. Input for API-T11 / API-WRITE-008. No server code was changed here, because the fix is outside
  this task.
- SUM-EDIT-001 stays open until SUM-T08..T10 deliver the client part.
- G5 is n/a: no UI change.

## Review
Recorded by the orchestrating session from the reviewer subagent's report (AGENT-REVIEWER@1.1.0, read-only), 2026-11-17.

The server code meets API-SUMM-001 exactly:
- it runs in the `exclusive` queue and saves through `mutate`, so the save is atomic and serialised;
- a blank summary is stored as null, and `summary_last_modified` is set to now;
- it returns `{ id, summary_last_modified }`;
- an unknown customer gets 404 with the message only.

The tests read back from the saved file, and the 404 test checks the file hash is unchanged.

**VERDICT: fail → pass after the orchestrator fixed the only major finding.**
- [major] Scope: the messages catalog diff held wave-2 entries (written by the orchestrator, not this task) that described not-yet-built behaviour as done. The orchestrator reworded them as *planned*, so the catalog matches the running app again; this task's own entry ("Customer <id> was not found.") is correct. The reviewer had stated this finding falls away once another task owns those edits.
- [minor] Hand-off: G4 was out of date. It is now pass (summary tests 6/6).

**Spec questions for the owner (not defects):**
- A body without `executive_summary` clears the summary. That follows API-WRITE-002's full-replace rule and the design as written.
- A non-string value is stored as text.

Inherited, for API-T11 / API-WRITE-008: a JSON `null` body gives 500 "Cannot read properties of null", as the other POST routes already do.

GATES: G1 pass · G3 pass · G4 pass.
