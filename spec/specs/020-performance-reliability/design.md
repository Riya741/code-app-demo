# Design — Performance, Reliability, Compatibility, Dates

## Performance mechanisms
| Mechanism | Where |
|---|---|
| In-memory search index, `useDeferredValue`, 100-result cap | `SearchBox.tsx` |
| Lookup `staleTime` 10 min, shared keys | `useLookups.ts`, `UseCaseBulkForm.tsx` |
| `React.lazy` editor | `CustomerDetails.tsx`, `RichTextField.tsx` |
| mtime-based reload, per-request O(n) joins | `server/workbook.ts` |

## Thresholds and planned responses
| Limit | Threshold | Response |
|---|---|---|
| Full-file rewrite | ~50k rows or saves > 1s | New ADR: move storage to SQLite behind the same API |
| Sequential bulk save | bulks > ~50 rows | `POST /use-cases/batch` with one save |
| Unvirtualised grid | > ~2,000 rows per customer | `@tanstack/react-virtual` |

## Date helper (DT-TIME-003)
New `src/lib/dates.ts`:
```ts
export function formatDay(v?: string): string {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m || Number(m[1]) < 2000) return "";
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
```
Used by both panels and delete descriptions.

## Reliability notice (REL-SAFE-006)
Show a one-line hint in the 423 error text and in the README of the workbook: "Close the workbook in Excel while using the app."

## Constitution check
| Article | Compliance |
|---|---|
| II | Atomic, serialised; backups missing. ⚠️ |
| V | Clear lock error; retry. ✅ |
| XI | Budgets and thresholds documented. ✅ |
