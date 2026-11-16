# Requirements — Client Data Layer

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| client-data-layer | CDL | ✅ Implemented · 1 inconsistency | V, IX, XI |

## Introduction
How the browser talks to the API: the HTTP client, typed fetchers, TanStack Query hooks, cache keys and invalidation.

---

### CDL-R1 — HTTP client

#### CDL-HTTP-001: API base path
- **Status:** ✅ Implemented
- **Criterion:** THE client SHALL prefix every path with `/api/workbook`.
- **Source:** `src/lib/workbookApi.ts`

#### CDL-HTTP-002: Network error message
- **Status:** ✅ Implemented
- **Criterion:** IF the network request fails THEN it SHALL throw "Could not reach the workbook service. Start the app with `npm run dev`.".
- **Source:** `src/lib/workbookApi.ts`

#### CDL-HTTP-003: Non-JSON response message
- **Status:** ✅ Implemented
- **Criterion:** IF the response is not JSON THEN it SHALL throw "The workbook service is not available here. It only runs with `npm run dev` / `npm run preview`.".
- **Source:** `src/lib/workbookApi.ts`

#### CDL-HTTP-004: Server error message
- **Status:** ✅ Implemented
- **Criterion:** IF the response is non-2xx THEN it SHALL throw the server's `error`, else "The workbook request failed (<status>).".
- **Source:** `src/lib/workbookApi.ts`

#### CDL-HTTP-005: Table query encoding
- **Status:** ✅ Implemented
- **Criterion:** `getTable` SHALL encode `where` as repeated `where=col:value` and `orderBy=col`.
- **Source:** `src/lib/workbookApi.ts`

### CDL-R2 — Fetchers

#### CDL-FETCH-001: Visible customers only
- **Status:** ✅ Implemented
- **Criterion:** `fetchCustomers` SHALL return only visible customers.
- **Source:** `src/lib/lookups.ts`, `src/lib/parentData.ts`, `src/lib/customerSource.ts`

#### CDL-FETCH-002: Subsidiaries by first matching key
- **Status:** ✅ Implemented
- **Criterion:** `fetchSubsidiaries(keys)` SHALL try each key (customer `id`, then `parent_id`) and return the first non-empty list, ordered by name.
- **Source:** `src/lib/lookups.ts`, `src/lib/parentData.ts`, `src/lib/customerSource.ts`

#### CDL-FETCH-003: Ordered lookup lists
- **Status:** ✅ Implemented
- **Criterion:** Department, stakeholder, solution, content type, personnel and event type fetchers SHALL return lists ordered by name.
- **Source:** `src/lib/lookups.ts`, `src/lib/parentData.ts`, `src/lib/customerSource.ts`

#### CDL-FETCH-004: Delete without id
- **Status:** ✅ Implemented
- **Criterion:** `deleteUseCase` / `deleteEvent` SHALL throw "This use case has no id." / "This event has no id." when the row has no id.
- **Source:** `src/lib/lookups.ts`, `src/lib/parentData.ts`, `src/lib/customerSource.ts`

### CDL-R3 — Queries, caching, invalidation

#### CDL-QUERY-001: No focus refetch, one retry
- **Status:** ✅ Implemented
- **Criterion:** Queries SHALL not refetch on window focus and SHALL retry once.
- **Source:** `src/hooks/useLookups.ts`, `src/hooks/useParentActivity.ts`, `src/hooks/useCustomers.ts`

#### CDL-QUERY-002: Ten-minute lookup cache
- **Status:** ✅ Implemented
- **Criterion:** Lookup queries SHALL be fresh for 10 minutes; the bulk form SHALL share their cache keys.
- **Source:** `src/hooks/useLookups.ts`, `src/hooks/useParentActivity.ts`, `src/hooks/useCustomers.ts`

#### CDL-QUERY-003: Write the server's join key
- **Status:** ⚠️ Partial — `detectKey` may choose the alternate key; server joins on `id`
- **Criterion:** Forms SHALL write subsidiary/department references using the same key column the server joins on.
- **Source:** `src/hooks/useLookups.ts`, `src/hooks/useParentActivity.ts`, `src/hooks/useCustomers.ts`

#### CDL-QUERY-004: Invalidate after writes
- **Status:** ✅ Implemented
- **Criterion:** WHEN a use case is saved/deleted THE `["useCases", parentId]` query SHALL be invalidated; events likewise `["events", parentId]`.
- **Source:** `src/hooks/useLookups.ts`, `src/hooks/useParentActivity.ts`, `src/hooks/useCustomers.ts`

#### CDL-QUERY-005: Sequential bulk save
- **Status:** ✅ Implemented
- **Criterion:** Bulk save SHALL post sequentially, continue on failure, report `{ failed: [{ index, message }] }`, report progress, and invalidate when settled.
- **Source:** `src/hooks/useLookups.ts`, `src/hooks/useParentActivity.ts`, `src/hooks/useCustomers.ts`

#### CDL-QUERY-006: Queries need a parent id
- **Status:** ✅ Implemented
- **Criterion:** Activity queries SHALL be enabled only when a parent id exists.
- **Source:** `src/hooks/useLookups.ts`, `src/hooks/useParentActivity.ts`, `src/hooks/useCustomers.ts`
