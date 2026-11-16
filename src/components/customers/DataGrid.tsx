import { Fragment, useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type FilterFnOption,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronRight, Copy, Filter, FilterX, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { exportCsv } from "@/lib/csv";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Kind of filter offered in the column header. Omit for a non-filterable column. */
    filter?: "text" | "select" | "number" | "date";
    /** Classes applied to the header and body cells (width, alignment, wrapping). */
    className?: string;
  }
}

/** Exports the rows currently shown (filters and sort applied) to a CSV download; returns how many rows were written. */
export type GridExport = (filename: string) => number;

type Bound = [string | undefined, string | undefined];

/** Multi-select filter. Blank values are stored as "". */
function selectFilter<T>(): FilterFn<T> {
  const fn: FilterFn<T> = (row, id, value: string[]) => value.includes(String(row.getValue(id) ?? ""));
  fn.autoRemove = (v: string[] | undefined) => !v?.length;
  return fn;
}

/** Inclusive min/max filter. Rows with no value are excluded once a bound is set. */
function numberRangeFilter<T>(): FilterFn<T> {
  const fn: FilterFn<T> = (row, id, [min, max]: Bound) => {
    const v = row.getValue<number | undefined>(id);
    if (v == null) return false;
    return (min === undefined || v >= Number(min)) && (max === undefined || v <= Number(max));
  };
  fn.autoRemove = (v: Bound | undefined) => !v || (v[0] === undefined && v[1] === undefined);
  return fn;
}

/** Inclusive from/to filter on yyyy-mm-dd strings. */
function dateRangeFilter<T>(): FilterFn<T> {
  const fn: FilterFn<T> = (row, id, [from, to]: Bound) => {
    const v = row.getValue<string | undefined>(id);
    if (!v) return false;
    return (from === undefined || v >= from) && (to === undefined || v <= to);
  };
  fn.autoRemove = (v: Bound | undefined) => !v || (v[0] === undefined && v[1] === undefined);
  return fn;
}

/** Default filterFn for a column, chosen from its meta.filter. */
function filterFnFor<T>(kind: "text" | "select" | "number" | "date"): FilterFnOption<T> {
  return kind === "select" ? selectFilter<T>() : kind === "number" ? numberRangeFilter<T>() : kind === "date" ? dateRangeFilter<T>() : "includesString";
}

const inputCls =
  "h-7 w-full rounded border border-input bg-background px-2 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-1 focus:ring-primary/30";

function SelectFilter<T>({ column }: { column: Column<T, unknown> }) {
  const [search, setSearch] = useState("");
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];
  const facets = column.getFacetedUniqueValues();

  // Offer every value in the (otherwise filtered) rows plus anything already ticked, so a selection can always be undone.
  const counts = new Map<string, number>();
  facets.forEach((n, v) => counts.set(String(v ?? ""), (counts.get(String(v ?? "")) ?? 0) + n));
  selected.forEach((v) => counts.has(v) || counts.set(v, 0));
  const options = [...counts.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .filter(([v]) => (v || "(blank)").toLowerCase().includes(search.trim().toLowerCase()));

  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    column.setFilterValue(next.length ? next : undefined);
  };

  return (
    <div className="space-y-2">
      {counts.size > 8 && (
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search values..." className={inputCls} />
      )}
      <ul className="max-h-56 space-y-0.5 overflow-auto">
        {options.map(([v, n]) => (
          <li key={v}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent">
              <Checkbox className="h-3.5 w-3.5" checked={selected.includes(v)} onCheckedChange={() => toggle(v)} />
              <span className={cn("min-w-0 flex-1 truncate", !v && "italic text-muted-foreground")}>{v || "(blank)"}</span>
              <span className="text-[10.5px] tabular-nums text-muted-foreground">{n}</span>
            </label>
          </li>
        ))}
        {options.length === 0 && <li className="px-1.5 py-1 text-xs text-muted-foreground">No values</li>}
      </ul>
    </div>
  );
}

function TextFilter<T>({ column }: { column: Column<T, unknown> }) {
  return (
    <input
      autoFocus
      value={(column.getFilterValue() as string | undefined) ?? ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder="Contains..."
      className={inputCls}
    />
  );
}

function RangeFilter<T>({ column, type }: { column: Column<T, unknown>; type: "number" | "date" }) {
  const [lo, hi] = (column.getFilterValue() as Bound | undefined) ?? [undefined, undefined];
  const set = (next: Bound) => column.setFilterValue(next[0] === undefined && next[1] === undefined ? undefined : next);
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
      <span className="text-muted-foreground">{type === "date" ? "From" : "Min"}</span>
      <input type={type} value={lo ?? ""} onChange={(e) => set([e.target.value || undefined, hi])} className={inputCls} />
      <span className="text-muted-foreground">{type === "date" ? "To" : "Max"}</span>
      <input type={type} value={hi ?? ""} onChange={(e) => set([lo, e.target.value || undefined])} className={inputCls} />
    </div>
  );
}

function HeaderFilter<T>({ column }: { column: Column<T, unknown> }) {
  const kind = column.columnDef.meta?.filter;
  if (!kind) return null;
  const active = column.getIsFiltered();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={`Filter ${String(column.columnDef.header)}`}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground",
            active && "bg-primary/10 text-primary",
          )}
        >
          <Filter className="h-3 w-3" fill={active ? "currentColor" : "none"} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-title">Filter: {String(column.columnDef.header)}</span>
          {active && (
            <button onClick={() => column.setFilterValue(undefined)} className="text-[11px] font-medium text-primary hover:underline">
              Clear
            </button>
          )}
        </div>
        {kind === "select" && <SelectFilter column={column} />}
        {kind === "text" && <TextFilter column={column} />}
        {(kind === "number" || kind === "date") && <RangeFilter column={column} type={kind} />}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Sortable, filterable data grid. Each column header sorts on click and opens a per-column filter from its funnel icon
 * (value picker, text search, or min/max / date range). Rows with extra detail expand inline.
 */
export function DataGrid<T>({
  data,
  columns,
  rowKey,
  detail,
  onEdit,
  onDelete,
  onClone,
  selection,
  exportRef,
  exportExtras,
}: {
  data: T[];
  columns: ColumnDef<T, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  rowKey: (row: T, i: number) => string | number;
  /** Extra content shown when the row is expanded; return null if the row has nothing more to show. */
  detail?: (row: T) => ReactNode | null;
  /** When set, each row gets an edit (pencil) icon that calls this. */
  onEdit?: (row: T) => void;
  /** When set, each row gets a delete icon that calls this (the caller is expected to confirm first). */
  onDelete?: (row: T) => void;
  /** When set, each row gets a clone (copy) icon that calls this. */
  onClone?: (row: T) => void;
  /** When set, rows get a checkbox. `selected` holds row ids (as String(rowKey(...))); there is no select-all box. */
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void };
  /** Filled in with this grid's export function so a button outside the grid (the panel header) can trigger it. */
  exportRef?: MutableRefObject<GridExport | null>;
  /** Extra columns appended to the export only (long text that isn't a grid column). */
  exportExtras?: { header: string; value: (row: T) => string | number | undefined }[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [open, setOpen] = useState<string | null>(null);

  // Columns pick their filter function from meta.filter unless they set one explicitly.
  const cols = useMemo(
    () => columns.map((c) => (c.filterFn || !c.meta?.filter ? c : { ...c, filterFn: filterFnFor<T>(c.meta.filter) })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: cols,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getRowId: (row, i) => String(rowKey(row, i)),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const rows = table.getRowModel().rows;

  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = (filename) => {
      const cols = table.getVisibleLeafColumns().map((c) => ({ id: c.id, header: String(c.columnDef.header ?? c.id) }));
      const extras = (exportExtras ?? []).map((x, i) => ({ id: `extra${i}`, header: x.header }));
      const out = table.getRowModel().rows.map((r) => {
        const rec: Record<string, unknown> = {};
        cols.forEach((c) => (rec[c.id] = r.getValue(c.id)));
        (exportExtras ?? []).forEach((x, i) => (rec[`extra${i}`] = x.value(r.original)));
        return rec;
      });
      exportCsv(filename, [...cols, ...extras], out);
      return out.length;
    };
    return () => {
      exportRef.current = null;
    };
  });
  const hasActions = !!(onEdit || onDelete || onClone);
  const colCount = table.getVisibleLeafColumns().length + 1 + (selection ? 1 : 0) + (hasActions ? 1 : 0);
  const filtered = columnFilters.length > 0;

  const toggleOne = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (!next.delete(id)) next.add(id);
    selection.onChange(next);
  };

  return (
    <table className="w-full border-separate border-spacing-0 text-xs">
      <thead>
        {/* Only while filters are active: a pinned strip to clear them in one click */}
        {filtered && (
          <tr>
            <th colSpan={colCount} className="sticky top-0 z-20 h-7 border-b bg-card px-3 text-right text-[11px] font-normal">
              <button onClick={() => table.resetColumnFilters()} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <FilterX className="h-3 w-3" /> Clear filters
              </button>
            </th>
          </tr>
        )}
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {selection && (
              <th className={cn("sticky z-10 w-8 border-b bg-muted/70 pl-2.5 pr-0 backdrop-blur", filtered ? "top-7" : "top-0")} />
            )}
            <th className={cn("sticky z-10 w-7 border-b bg-muted/70 backdrop-blur", filtered ? "top-7" : "top-0")} />
            {hg.headers.map((h) => {
              const col = h.column;
              const sorted = col.getIsSorted();
              return (
                <th
                  key={h.id}
                  aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                  className={cn("sticky z-10 border-b bg-muted/70 px-3 py-1 text-left align-middle backdrop-blur", filtered ? "top-7" : "top-0", col.columnDef.meta?.className)}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={col.getToggleSortingHandler()}
                      disabled={!col.getCanSort()}
                      className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-title hover:text-primary disabled:cursor-default"
                    >
                      <span className="truncate">{flexRender(col.columnDef.header, h.getContext())}</span>
                      {sorted === "asc" && <ArrowUp className="h-3 w-3 shrink-0 text-primary" />}
                      {sorted === "desc" && <ArrowDown className="h-3 w-3 shrink-0 text-primary" />}
                    </button>
                    <HeaderFilter column={col} />
                  </div>
                </th>
              );
            })}
            {hasActions && <th className={cn("sticky z-10 border-b bg-muted/70 backdrop-blur", onClone ? "w-24" : "w-16", filtered ? "top-7" : "top-0")} />}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.map((row) => {
          const extra = detail?.(row.original) ?? null;
          const isOpen = open === row.id && !!extra;
          return (
            <Fragment key={row.id}>
              <tr
                onClick={() => extra && setOpen(isOpen ? null : row.id)}
                className={cn("align-top transition-colors hover:bg-accent/50", extra && "cursor-pointer", (isOpen || selection?.selected.has(row.id)) && "bg-accent/40")}
              >
                {selection && (
                  <td className="border-b py-1.5 pl-2.5 pr-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      className="h-3.5 w-3.5"
                      aria-label="Select row"
                      checked={selection.selected.has(row.id)}
                      onCheckedChange={() => toggleOne(row.id)}
                    />
                  </td>
                )}
                <td className="border-b py-1.5 pl-2.5 pr-0 text-muted-foreground">
                  {extra && <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />}
                </td>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn("border-b px-3 py-1.5", cell.column.columnDef.meta?.className)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {hasActions && (
                  <td className="whitespace-nowrap border-b py-1 pr-2 text-right">
                    {onClone && (
                      <button
                        aria-label="Clone row"
                        title="Clone"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClone(row.original);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-primary transition-colors hover:bg-primary/15 dark:text-sky-300"
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        aria-label="Edit row"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation(); // don't toggle the row's expansion
                          onEdit(row.original);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-primary transition-colors hover:bg-primary/15 dark:text-sky-300"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        aria-label="Delete row"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(row.original);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-600/10 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
              {isOpen && (
                <tr className="bg-muted/30">
                  <td className="border-b" />
                  <td colSpan={colCount - 1} className="space-y-3 border-b px-3 py-3">
                    {extra}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={colCount} className="px-3 py-8 text-center text-xs text-muted-foreground">
              No rows match the current filters.{" "}
              <button onClick={() => table.resetColumnFilters()} className="font-medium text-primary hover:underline">
                Clear filters
              </button>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
