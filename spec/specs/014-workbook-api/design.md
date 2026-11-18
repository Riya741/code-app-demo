# Design — Workbook HTTP API

## Overview
`workbookPlugin(defaultFile)` in `server/workbook.ts` returns a Vite plugin that mounts `handle(req, res)` at
`/api/workbook` for dev and preview servers (ADR-0002). All handlers run in the storage queue.

## Routing table
| Method | Path | Handler |
|---|---|---|
| GET | `/table/:name` | `filterRows(store.table(name).rows, params)` |
| GET | `/use-cases?parentId` | `useCasesByParent` |
| GET | `/events?parentId` | `eventsByParent` |
| GET | `/solution-statuses` | `solutionStatuses` |
| GET | `/solution-use-case-types` | `solutionUseCaseTypes` |
| GET | `/health` | file + sheet names |
| POST | `/use-cases` | `saveUseCase` → save |
| POST | `/events` | `saveEvent` → save |
| DELETE | `/use-cases/:id`, `/events/:id` | `softDelete` → save |
| POST | `/customers/:id/summary` | `saveSummary` → save (API-T09) |

## Request bodies
**`UseCaseInput`** (snake_case): `id?`, `parent_id`★, `subsidiary_id`★, `solution_id`★, `status_id`★,
`department_id`, `stakeholder_id`, `use_case_type_id`, `target_users`, `target_credits_consumed`, `target_api_calls`,
`expected_launch_date`, `note`, `value_snippet`, `premium_credit`, `deleted`, `personnel_ids`, `content_type_ids`.

**`EventInput`** (PascalCase): `Id?`, `SubsidiaryId`★, `EventTypeId`★, `EventDate`★ (first 10 chars kept), `Stage`,
`AttendeeCount`, `AttendeeNames`, `MeetingNotes`, `Duration`, `Onsite`, `Virtual`, `Deleted`, `SolutionIds`, `PersonnelIds`.

★ required.

## Coercion helpers
`num` (null if empty/non-finite), `text` (null if blank), `bool` (true for `true`/`"true"`/`1`), `ids` (split on
whitespace `, ; |`, positive, unique), `nextId`, `now()` (UTC ISO, 19 chars).

## Read joins
Lookup maps built per request with `byId(rows, "id")`; link groups with `group(rows, key, value)`; derived names
comma-joined. Use cases filter `deleted !== true && parent_id === parentId`; events filter via
`subsidiary.get(subsidiary_id).parent_id === parentId`.

## Write algorithm (use case)
```
required(...) ; row = id ? find(id) || 404 : new row (all cols null, id, use_case_id, created)
previousStatus = row.status_id
Object.assign(row, fields incl. last_modified)
relink use_case_personnel, use_case_content_type
if previousStatus !== status_id: append history (if sheet exists)
```

## Planned design — API-WRITE-008 validation
Before assigning, check each provided FK exists (`subsidiary`, `department`, `stakeholder`, `solution`, `status`,
`use_case_type`, personnel/content type ids) and that `(solution_id, status_id)` exists in `solution_status` and
`(solution_id, use_case_type_id)` in `solution_use_case_type` when type is given. 400 with "Unknown <field>: <id>"
or "Status <id> is not allowed for solution <id>".

## Implemented — API-SUMM-001 summary (API-T09, 2026-11-17)
`saveSummary(s, id, body)`: find customer by `id` (404 "Customer <id> was not found."), set
`executive_summary = text(body.executive_summary)`, `summary_last_modified = now()`, return `{ id, summary_last_modified }`.
Open spec question (owner): a body without `executive_summary` clears the summary, as API-WRITE-002's full-replace rule implies.

## Constitution check
| Article | Compliance |
|---|---|
| II | Atomic saves, soft delete, history. ✅ |
| III | Message-only errors (SEC-SAFE-003); local-only by default (SEC-EXPO-001). ✅ |
| IV | Required fields enforced; FK/allowed-value checks missing. ⚠️ |
| IX | Server owns joins and persistence. ✅ |
