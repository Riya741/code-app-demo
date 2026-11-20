# Requirements — Workbook HTTP API

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| workbook-api | API | ⚠️ Implemented · FK validation and summary body check missing | II, III, IV, IX |

## Introduction
JSON API at `/api/workbook` served by the Vite dev/preview server. Contract details (bodies, fields) are in
[design.md](design.md).

---

### API-R1 — General contract

#### API-GEN-001: JSON success responses
- **Status:** ✅ Implemented
- **Criterion:** WHEN a request succeeds THE API SHALL return 200 with JSON.
- **Source:** `server/workbook.ts`, `vite.config.ts`

#### API-GEN-002: Error responses
- **Status:** ✅ Implemented
- **Criterion:** IF a request fails THEN THE API SHALL return `{ "error": message }` with 400/404/409/423/500, logging 500s as `[workbook]`.
- **Source:** `server/workbook.ts`, `vite.config.ts`

#### API-GEN-003: Unknown route
- **Status:** ✅ Implemented
- **Criterion:** IF the route is unknown THEN 404 "Unknown workbook request: <METHOD> <path>".
- **Source:** `server/workbook.ts`, `vite.config.ts`

#### API-GEN-004: Invalid JSON body
- **Status:** ✅ Implemented
- **Criterion:** IF the body is not valid JSON THEN 400 "The request body is not valid JSON."; an empty body is `{}`.
- **Source:** `server/workbook.ts`, `vite.config.ts`

#### API-GEN-005: Local-only, no auth
- **Status:** ✅ Implemented
- **Criterion:** THE API SHALL NOT require authentication and SHALL only be reachable from the local machine.
- **Source:** `server/workbook.ts`, `vite.config.ts`

### API-R2 — Reads

#### API-READ-001: Raw table reads
- **Status:** ✅ Implemented
- **Criterion:** `GET /table/:name` SHALL return raw rows, filtered by repeated `where=col:value` (exact string match) and sorted by `orderBy` (case-insensitive).
- **Source:** `server/workbook.ts`

#### API-READ-002: Use cases for a customer
- **Status:** ✅ Implemented
- **Criterion:** `GET /use-cases?parentId=` SHALL return live use cases of the customer joined with lookups, newest `last_modified` first then id desc.
- **Source:** `server/workbook.ts`

#### API-READ-003: Events for a customer
- **Status:** ✅ Implemented
- **Criterion:** `GET /events?parentId=` SHALL return live events whose subsidiary belongs to the customer, joined, newest `event_date` first.
- **Source:** `server/workbook.ts`

#### API-READ-004: parentId required
- **Status:** ✅ Implemented
- **Criterion:** IF `parentId` is missing or not numeric THEN 400 "parentId is required.".
- **Source:** `server/workbook.ts`

#### API-READ-005: Solution mappings
- **Status:** ✅ Implemented
- **Criterion:** `GET /solution-statuses` and `GET /solution-use-case-types` SHALL return the mapping rows with names joined.
- **Source:** `server/workbook.ts`

#### API-READ-006: Health check
- **Status:** ✅ Implemented
- **Criterion:** `GET /health` SHALL return the file path and sheet names.
- **Source:** `server/workbook.ts`

### API-R3 — Writes

#### API-WRITE-001: Insert or update use case
- **Status:** ✅ Implemented
- **Criterion:** `POST /use-cases` SHALL insert (no `id`) or update (`id`, 404 if missing) a use case; required `parent_id`, `subsidiary_id`, `solution_id`, `status_id` (400 "Missing: …").
- **Source:** `server/workbook.ts`

#### API-WRITE-002: Full-replace writes
- **Status:** ✅ Implemented
- **Criterion:** Writes SHALL be full-replace: every writable field is set from the body; omitted optional fields become null/false.
- **Source:** `server/workbook.ts`

#### API-WRITE-003: Write timestamps
- **Status:** ✅ Implemented
- **Criterion:** Writes SHALL set `last_modified = now`; inserts also `created = now` and the mirror id.
- **Source:** `server/workbook.ts`

#### API-WRITE-004: Replace link rows
- **Status:** ✅ Implemented
- **Criterion:** Writes SHALL replace the record's link rows from the comma id lists (de-duplicated, positive only).
- **Note:** Replaces only the saved record's own link rows (`relink` filters by that record's id); allowed by Constitution Article II.4 as amended in v1.1.1 (CR-20261120-1). Wording unchanged.
- **Source:** `server/workbook.ts`

#### API-WRITE-005: Append status history
- **Status:** ✅ Implemented
- **Criterion:** WHEN a use case's status changes (incl. insert) THE API SHALL append status history.
- **Source:** `server/workbook.ts`

#### API-WRITE-006: Insert or update event
- **Status:** ✅ Implemented
- **Criterion:** `POST /events` SHALL behave like API-WRITE-001..004 with PascalCase fields; required `SubsidiaryId`, `EventTypeId`, `EventDate`.
- **Source:** `server/workbook.ts`

#### API-WRITE-007: Id response
- **Status:** ✅ Implemented
- **Criterion:** Responses SHALL be `{ "id": number }`.
- **Source:** `server/workbook.ts`

#### API-WRITE-008: Validate references
- **Status:** ❌ Gap
- **Criterion:** THE API SHALL reject ids that do not exist in the referenced sheet and status/type values not allowed for the solution, with 400.
- **Source:** `server/workbook.ts`

### API-R4 — Delete

#### API-DEL-001: Soft delete endpoints
- **Status:** ✅ Implemented
- **Criterion:** `DELETE /use-cases/:id` and `/events/:id` SHALL set `deleted = true`, `last_modified = now` and return `{ "ok": true }`.
- **Source:** `server/workbook.ts`

#### API-DEL-002: Delete not found or already deleted
- **Status:** ✅ Implemented
- **Criterion:** IF not found THEN 404 "This use case/event could not be found."; IF already deleted THEN 409 "This use case/event was already deleted.".
- **Source:** `server/workbook.ts`

### API-R5 — Customer summary

#### API-SUMM-001: Save customer summary
- **Status:** ✅ Implemented
- **Criterion:** `POST /customers/:id/summary` with `{ executive_summary }` SHALL store the text (blank → null) and `summary_last_modified = now`, returning `{ id, summary_last_modified }`; 404 if the customer does not exist.
- **Source:** `server/workbook.ts`

#### API-SUMM-002: Reject a summary body without a string summary
- **Status:** ✅ Implemented (API-T14, owner decision D3, CR-20261120-1)
- **Criterion:** IF the body of `POST /customers/:id/summary` is not a JSON object, has no `executive_summary` field, or its value is not a string (including `null`), THEN THE API SHALL return 400 ("Missing: executive_summary" when absent, "executive_summary must be a string." otherwise) and SHALL leave the stored summary, its timestamp and the file unchanged; an explicit empty string SHALL still clear the summary (API-SUMM-001).
- **Source:** `server/workbook.ts`, `tests/integration/summary.test.ts`

## Scenarios
- POST use case without `status_id` → 400 `Missing: status_id`; file unchanged.
- New use case with `personnel_ids: "3,3,5"` → 2 link rows; 1 history row with `previous_status_id = null`.
- Event on subsidiary S with `S.parent_id = 10` → listed for parentId 10 only.
- Delete a use case → hidden from reads, row kept with `deleted = TRUE`; second delete → 409.
- Edit a use case from contributors 3, 5 to 5, 8 → same `id`; its `use_case_personnel` rows are now 5 and 8; other use cases' link rows unchanged (Article II.4).
- `POST /customers/7/summary` with `{}` → 400 `Missing: executive_summary`; with `{ "executive_summary": 5 }` → 400; with `{ "executive_summary": "" }` → 200, summary null (API-SUMM-002).
