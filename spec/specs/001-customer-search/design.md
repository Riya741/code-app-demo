# Design — Customer Search

## Overview
Client-side search over an in-memory index (ADR-0004). One component, `SearchBox`, rendered in two variants by
`pages/Customers.tsx`.

## Components and files
| File | Role |
|---|---|
| `src/lib/customerSource.ts` | `fetchCustomers()` → `GET /table/customer`, filters `visible` |
| `src/hooks/useCustomers.ts` | `useQuery(["customers"])` |
| `src/components/customers/SearchBox.tsx` | Input, scoring, results list, keyboard handling, `Highlight` |
| `src/pages/Customers.tsx` | Chooses hero vs bar, passes `rows`, `loading`, `error`, `onRetry`, `onSelect` |

## Interface
```ts
SearchBox(props: {
  rows: Record<string, unknown>[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onSelect: (row) => void;
  variant: "hero" | "bar";
  autoFocus?: boolean;
})
```

## Data flow
```
useCustomers ─► rows ─► useMemo index [{row, name, id}]
input ─► useDeferredValue(query) ─► q, tokens ─► score() each ─► sort ─► slice(0,100)
```

## Algorithm — `score(name, id, query, tokens)`
```
n = name.toLowerCase()
if not every token ⊂ n:  return id contains query ? 4 : null
if n == query or id == query: return 0
if n.startsWith(query):       return 1
if every token is prefix of some word of n (split /[\s\-_/.,()&]+/): return 2
return 3
```
Sort: score ascending, then `name.localeCompare`.

## State
`query`, `open`, `active` (index). Outside-click listener on `mousedown` closes the panel. Active item is scrolled
into view on change.

## Error handling
Load errors come from `useCustomers().error` (messages defined in the client-data-layer spec); the input is disabled
and a retry link calls `refetch()`.

## Testing approach
- Unit: `score` ranking table (SRCH-RANK-002, SRCH-RANK-003).
- Component: keyboard flow, empty state, highlight, 100-cap header.

## Constitution check
| Article | Compliance |
|---|---|
| IV Valid by construction | Only existing visible customers can be selected. ✅ |
| V Clear feedback | Loading, error+retry, empty states present. ✅ |
| VII Accessible | Combobox roles present; `aria-activedescendant` missing → task SRCH-T06. ⚠️ |
| IX Layered | Data via hook + lib fetcher. ✅ |
| XI Performance | In-memory, deferred input, capped list. ✅ |

**Exceptions:** none.
