# Design — Bulk Use Cases

## Overview
`UseCaseBulkForm` holds an array of row drafts, shared details and fill settings in local state, loads lookups per
distinct subsidiary/department with `useQueries`, and saves through `useSaveUseCases` (sequential).

## Components and files
| File | Role |
|---|---|
| `src/components/customers/UseCaseBulkForm.tsx` | Dialog, row model, fill, paste, checks, submit |
| `src/components/customers/UseCaseForm.tsx` | Shared helpers `num`, `idList`, `splitIds`, `plain` |
| `src/hooks/useParentActivity.ts` | `useSaveUseCases` → `{ failed: [{ index, message }] }` |
| `src/hooks/useLookups.ts`, `src/lib/lookups.ts` | Lookups, `LOOKUP_STALE`, fetchers for `qc.fetchQuery` |

## Row model
```ts
type Row = {
  key: number;                       // local id
  subsidiary, department, stakeholder, solution, useCaseType, status, launch: string;
  hint?: string;      // source department name, applied once per subsidiary (hintFor)
  hintFor?: string;
  resetStatus?: boolean;             // clone: pick Planned/first status when statuses load
  contentTypes: string[]; personnel: string[]; value: string; note: string;
  error?: string;                    // last save failure
};
```
`pending(r) = !r.subsidiary && !r.department`.

## Lookup loading
- Per-row departments: `useQueries` over distinct `subsidiary` values, key `["lookup","departments",n]` (shared cache).
- Per-row stakeholders: same over distinct `department` values.
- On-demand (every-department, paste): `qc.fetchQuery` with the same keys.

## Consistency effect
A `useEffect` without deps runs after each render and updates rows only when needed (apply department hint once
lists exist; reset status once statuses exist). It returns the same array when nothing changes, so it settles.

## Checks
```
missing   = [subsidiary, solution, status].filter(empty)
duplicate = existing.some(same) ? "A use case with the same … already exists"
          : earlier row same ? "Same as row j"
same      = subsidiary, department, solution, useCaseType all equal
```

## Submit
1. `touched = true`; abort and scroll to the first incomplete row if any.
2. Map rows to `UseCaseInput` (details from shared when `shared.on`, else per row).
3. `mutateAsync({ inputs, onProgress })`.
4. All ok → toast + close. Otherwise keep rows whose index failed, with `error`.

## Planned change — UCB-PASTE-004
`const cells = line.includes("\t") ? line.split("\t") : line.split(",")`.

## Scaling note
N rows = N full workbook writes (PERF-SPEED-006). A batch endpoint is out of scope until bulk sizes > ~50 are common.

## Constitution check
| Article | Compliance |
|---|---|
| II | Each row saved atomically; partial failure reported precisely. ✅ |
| IV | Same cascades and required checks as the single form. ✅ |
| V | Per-row status, progress, partial-failure handling. ✅ |
| XI | Lookup cache shared; sequential writes documented as a limit. ✅ |

**Exceptions:** none.
