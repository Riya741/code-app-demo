# Design — Data Grid

## Overview
`DataGrid<T>` wraps TanStack Table v8 with core, filtered, sorted and faceted row models. Column filters are chosen
from `columnDef.meta.filter`.

## Interface
```ts
DataGrid<T>({
  data: T[];
  columns: ColumnDef<T, any>[];        // meta: { filter?: "text"|"select"|"number"|"date"; className?: string }
  rowKey: (row: T, i: number) => string | number;
  detail?: (row: T) => ReactNode | null;
  onEdit?, onDelete?, onClone?: (row: T) => void;
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void };
  exportRef?: MutableRefObject<GridExport | null>;   // GridExport = (filename) => number
  exportExtras?: { header: string; value: (row: T) => string | number | undefined }[];
})
```

## Filter functions
| Kind | Function | autoRemove |
|---|---|---|
| select | `value.includes(String(cell ?? ""))` | empty array |
| text | built-in `includesString` | — |
| number | `[min,max]` inclusive, null cell → false | both bounds undefined |
| date | string compare on `YYYY-MM-DD`, empty → false | both bounds undefined |

`filterFnFor(kind)` is applied to columns that set `meta.filter` and no explicit `filterFn`.

## Rendering
- Header row(s) sticky; offset by 28px when the "Clear filters" strip is shown.
- Extra leading columns: selection checkbox (optional), chevron.
- Trailing actions column when any action handler is set.
- `open` state holds the single expanded row id.

## Export
`exportRef.current` is reassigned on every render (so it sees current filters/sort) and cleared on unmount; it calls
`exportCsv` from `src/lib/csv.ts`.

## Planned change — GRID-ROW-006
Render the chevron cell as a `<button aria-expanded aria-controls>`; Enter/Space toggles; keep row-click for mouse.

## Constitution check
| Article | Compliance |
|---|---|
| V | Empty-filter state with one-click clear. ✅ |
| VI | Token classes, dark-aware. ✅ |
| VII | `aria-sort`, labelled buttons; keyboard expansion missing. ⚠️ |
| VIII | One shared grid for both panels. ✅ |
