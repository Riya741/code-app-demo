# Design — Client Data Layer

## Layering (Article IX)
```
component ──► hook (src/hooks) ──► fetcher (src/lib) ──► api()/getTable()/post()/remove() ──► /api/workbook
```

## Files
| File | Exports |
|---|---|
| `src/lib/workbookApi.ts` | `api`, `getTable`, `post`, `remove` |
| `src/lib/customerSource.ts` | `fetchCustomers` |
| `src/lib/lookups.ts` | `fetchSubsidiaries`, `fetchDepartments`, `fetchStakeholders`, `fetchSolutions`, `fetchContentTypes`, `fetchPersonnel`, `fetchEventTypes`, `fetchSolutionUseCaseTypes`, `fetchSolutionStatuses`, `detectKey`, `Option` |
| `src/lib/parentData.ts` | `fetchUseCases`, `fetchEvents`, `saveUseCase`, `saveEvent`, `deleteUseCase`, `deleteEvent`, `EventsResult` |
| `src/lib/types.ts` | Row, input and lookup types |
| `src/hooks/useCustomers.ts` | `useCustomers` |
| `src/hooks/useLookups.ts` | lookup hooks, `LOOKUP_STALE` |
| `src/hooks/useParentActivity.ts` | `useUseCases`, `useEvents`, `useSaveUseCase`, `useSaveUseCases`, `useSaveEvent`, `useDeleteUseCase`, `useDeleteEvent` |

## Query keys
| Key | staleTime | Enabled |
|---|---|---|
| `["customers"]` | 0 | always |
| `["useCases", parentId]` | 0 | parentId ≠ null |
| `["events", parentId]` | 0 | parentId ≠ null |
| `["lookup","subsidiaries",...keys]` | 10 min | flag |
| `["lookup","departments",subKey]` | 10 min | subKey ≠ null |
| `["lookup","stakeholders",deptKey]` | 10 min | deptKey ≠ null |
| `["lookup","solutions" \| "contentTypes" \| "personnel" \| "eventTypes" \| "solutionUseCaseTypes" \| "solutionStatuses"]` | 10 min | flag |

## `detectKey(samples, lookup)`
Counts, for on-screen rows, whether the saved key matches the same-named lookup row's `id` or `alt`; returns `"alt"`
only when alt wins. Planned removal once DATA-T04 confirms all data uses `id`.

## Constitution check
| Article | Compliance |
|---|---|
| V | Clear error messages for service-down and HTTP failures. ✅ |
| IX | Strict layering; no fetch in components. ✅ |
| XI | Lookup caching, shared keys. ✅ |
