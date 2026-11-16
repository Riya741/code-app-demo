import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ChevronDown, ClipboardPaste, Copy, Inbox, ListPlus, Plus } from "lucide-react";
import { Panel } from "@/components/customers/Panel";
import { DataGrid, type GridExport } from "@/components/customers/DataGrid";
import { ConfirmDelete } from "@/components/customers/ConfirmDelete";
import { UseCaseForm } from "@/components/customers/UseCaseForm";
import { UseCaseBulkForm } from "@/components/customers/UseCaseBulkForm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EventForm } from "@/components/customers/EventForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { htmlToText } from "@/lib/html";
import { exportFileName } from "@/lib/csv";
import { ExportButton } from "@/components/customers/ExportButton";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { RICH_TEXT_CLASS, looksLikeHtml, sanitizeHtml } from "@/lib/html";
import { useDeleteEvent, useDeleteUseCase, useEvents, useUseCases } from "@/hooks/useParentActivity";
import type { EventRow, UseCaseRow } from "@/lib/parentData";

/** Dates before 2000 are placeholder values (e.g. 1900-01-01) and are treated as empty. */
const validDate = (v?: string) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) || d.getFullYear() < 2000 ? null : d;
};
const fmtDate = (v?: string) =>
  validDate(v)?.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) ?? "";

function statusPill(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (/(complete|launch|live|done|adopt)/.test(s)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (/(progress|active|plan|pilot|develop|schedul)/.test(s)) return "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300";
  if (/block/.test(s)) return "bg-red-50 text-red-700 ring-red-600/30 dark:bg-red-500/15 dark:text-red-300";
  if (/(risk|hold|delay|cancel)/.test(s)) return "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300";
}

function Pill({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset", tone ?? "bg-muted text-muted-foreground ring-border")}>
      {children}
    </span>
  );
}

const Dash = () => <span className="text-muted-foreground/50">-</span>;

/** Full text for the expanded row; HTML is sanitised. */
function FullText({ label, value }: { label: string; value?: string }) {
  const dark = useTheme().resolvedTheme === "dark";
  const raw = (value ?? "").trim();
  if (!raw) return null;
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-title/80">{label}</p>
      {looksLikeHtml(raw) ? (
        <div className={cn(RICH_TEXT_CLASS, "prose-p:my-1")} dangerouslySetInnerHTML={{ __html: sanitizeHtml(raw, dark) }} />
      ) : (
        <p className="whitespace-pre-line text-xs leading-relaxed">{raw}</p>
      )}
    </div>
  );
}

function ListState({
  loading, error, empty, emptyText, onRetry, children,
}: {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded-md" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="max-w-md text-xs text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-1 p-8 text-center">
        <Inbox className="h-7 w-7 text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
}

/** yyyy-mm-dd for filtering/sorting; undefined when the date is missing or a placeholder. */
const isoDay = (v?: string) => (validDate(v) ? v!.slice(0, 10) : undefined);

/** Multi-value fields arrive as one delimited string; show them comma separated. */
const commaList = (v?: string) => v?.split(/\s*[;|]+\s*|\s*[\r\n]+\s*/).map((x) => x.trim()).filter(Boolean).join(", ") || undefined;

/** Rich text columns come back as HTML; exports get readable plain text. */
const text = (v?: string) => (v ? htmlToText(v) : "");

const TALLY_TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300",
};

/** Coloured tally next to a panel's total, e.g. "12 Live". */
function Tally({ n, label, tone = "green" }: { n: number; label: string; tone?: keyof typeof TALLY_TONES }) {
  return (
    <span
      title={`${n.toLocaleString()} ${label.toLowerCase()}`}
      className={cn("whitespace-nowrap rounded-full px-2 text-[10.5px] font-semibold leading-4 ring-1 ring-inset", TALLY_TONES[tone])}
    >
      {n.toLocaleString()} {label}
    </span>
  );
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="sm" variant="outline" disabled={disabled} onClick={onClick} className="h-6 gap-1 bg-background px-2 text-[11px] font-medium [&_svg]:size-3">
      <Plus /> {label}
    </Button>
  );
}

/** "Add use case" with an arrow beside it for the ways of adding several at once. */
function AddUseCaseMenu({ disabled, onAdd, onAddMany, onPaste }: { disabled?: boolean; onAdd: () => void; onAddMany: () => void; onPaste: () => void }) {
  return (
    <div className="flex">
      <Button size="sm" variant="outline" disabled={disabled} onClick={onAdd} className="h-6 gap-1 rounded-r-none bg-background px-2 text-[11px] font-medium [&_svg]:size-3">
        <Plus /> Add use case
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={disabled} aria-label="More ways to add use cases" className="h-6 rounded-l-none border-l-0 bg-background px-1.5 [&_svg]:size-3">
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={onAddMany} className="items-start gap-2 text-xs">
            <ListPlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="block font-semibold">Add multiple use cases</span>
              <span className="block text-[11px] text-muted-foreground">One row per use case, shared details entered once</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onPaste} className="items-start gap-2 text-xs">
            <ClipboardPaste className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="block font-semibold">Paste from Excel</span>
              <span className="block text-[11px] text-muted-foreground">Subsidiary, department and stakeholder per line</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const dashed =({ getValue }: { getValue: () => unknown }) => (getValue() as string | undefined) || <Dash />;

const useCaseColumns: ColumnDef<UseCaseRow>[] = [
  {
    id: "subsidiary", header: "Subsidiary", accessorFn: (r) => r.subsidiary_name || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[130px]" },
  },
  {
    id: "departmentType", header: "Department Type", accessorFn: (r) => r.department_type || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[120px]" },
  },
  {
    id: "departmentName", header: "Department Name", accessorFn: (r) => r.department_name || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[130px]" },
  },
  {
    id: "stakeholder", header: "Stakeholder", accessorFn: (r) => r.stakeholder_name || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "text", className: "min-w-[130px]" },
  },
  {
    id: "solution", header: "Solution", accessorFn: (r) => r.solution_name?.trim() || "Untitled",
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    meta: { filter: "text", className: "min-w-[180px]" },
  },
  {
    id: "useCaseType", header: "Use Case Type", accessorFn: (r) => r.use_case_type || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[120px]" },
  },
  {
    id: "contentType", header: "Content Type", accessorFn: (r) => commaList(r.content_type_names), sortUndefined: "last",
    cell: dashed, meta: { filter: "text", className: "min-w-[140px]" },
  },
  {
    id: "cssContributor", header: "CSS Contributor", accessorFn: (r) => commaList(r.personnel_names), sortUndefined: "last",
    cell: dashed, meta: { filter: "text", className: "min-w-[150px]" },
  },
  {
    id: "launch", header: "Launch Date", accessorFn: (r) => isoDay(r.expected_launch_date), sortUndefined: "last",
    cell: ({ row }) => fmtDate(row.original.expected_launch_date) || <Dash />,
    meta: { filter: "date", className: "min-w-[100px] whitespace-nowrap" },
  },
  {
    id: "status", header: "Status", accessorFn: (r) => r.status || undefined, sortUndefined: "last",
    cell: ({ getValue }) => (getValue<string>() ? <Pill tone={statusPill(getValue<string>())}>{getValue<string>()}</Pill> : <Dash />),
    meta: { filter: "select", className: "min-w-[110px]" },
  },
];

const eventColumns: ColumnDef<EventRow>[] = [
  {
    id: "subsidiary", header: "Subsidiary", accessorFn: (r) => r.subsidiary_name || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[130px]" },
  },
  {
    id: "solution", header: "Solution", accessorFn: (r) => r.solution_names || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "text", className: "min-w-[170px]" },
  },
  {
    id: "eventType", header: "Event Type", accessorFn: (r) => r.event_type?.trim() || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[150px]" },
  },
  {
    id: "attendees", header: "# of Attendees", accessorFn: (r) => r.attendee_count ?? undefined, sortUndefined: "last",
    cell: ({ getValue }) => getValue<number>() ?? <Dash />,
    meta: { filter: "number", className: "min-w-[110px] tabular-nums" },
  },
  {
    id: "onsite", header: "Onsite", accessorFn: (r) => (r.onsite == null ? undefined : r.onsite ? "Yes" : "No"), sortUndefined: "last",
    cell: dashed, meta: { filter: "select", className: "min-w-[72px]" },
  },
  {
    id: "cssContributor", header: "CSS Contributor", accessorFn: (r) => r.css_contributors || undefined, sortUndefined: "last",
    cell: dashed, meta: { filter: "text", className: "min-w-[160px]" },
  },
  {
    id: "date", header: "Event Date", accessorFn: (r) => isoDay(r.event_date), sortUndefined: "last", sortDescFirst: true,
    cell: ({ row }) => fmtDate(row.original.event_date) || <Dash />,
    meta: { filter: "date", className: "min-w-[100px] whitespace-nowrap" },
  },
  {
    id: "stage", header: "Stage", accessorFn: (r) => r.stage || undefined, sortUndefined: "last",
    cell: ({ getValue }) => (getValue<string>() ? <Pill tone={statusPill(getValue<string>())}>{getValue<string>()}</Pill> : <Dash />),
    meta: { filter: "select", className: "min-w-[110px]" },
  },
];

/* ---------------------------------- Use cases --------------------------------- */

export function UseCasesPanel({
  parentId,
  customerKeys = [],
  customerName = "",
  className,
}: {
  parentId: number | null;
  /** Used in the export file name. */
  customerName?: string;
  /** Keys that identify the customer in the subsidiary table (its `id`, then `parent_id`). */
  customerKeys?: number[];
  className?: string;
}) {
  const q = useUseCases(parentId);
  const exportRef = useRef<GridExport | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UseCaseRow | null>(null);
  /** Set while the bulk dialog is open: the use cases being cloned (empty to add new ones) and whether to open with the paste box. */
  const [bulk, setBulk] = useState<{ sources: UseCaseRow[]; paste?: boolean } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const del = useDeleteUseCase(parentId);
  const [target, setTarget] = useState<UseCaseRow | null>(null);
  const ask = (row: UseCaseRow) => {
    del.reset();
    setTarget(row);
  };
  // Ticked rows that still exist (a refresh can remove some), in grid order.
  const pickedRows = (q.data ?? []).filter((r, i) => picked.has(String(r.id ?? i)));

  return (
    <Panel
      title="Use Cases"
      count={q.data?.length}
      badges={q.data ? <Tally n={q.data.filter((r) => /\blive\b/i.test(r.status ?? "")).length} label="Live" /> : undefined}
      className={className}
      bodyClassName="overflow-auto"
      headerRight={
        <>
          {pickedRows.length > 0 && (
            <>
              <span className="text-[11px] font-medium text-muted-foreground">{pickedRows.length} selected</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulk({ sources: pickedRows })}
                className="h-6 gap-1 bg-background px-2 text-[11px] font-medium [&_svg]:size-3"
                title="Copy the selected use cases to other subsidiaries or departments"
              >
                <Copy /> Clone to...
              </Button>
              <button onClick={() => setPicked(new Set())} className="text-[11px] font-medium text-primary hover:underline">
                Clear
              </button>
            </>
          )}
          <AddUseCaseMenu
            disabled={parentId == null}
            onAdd={() => setAdding(true)}
            onAddMany={() => setBulk({ sources: [] })}
            onPaste={() => setBulk({ sources: [], paste: true })}
          />
          <ExportButton
            disabled={!q.data?.length}
            onClick={() => {
              const n = exportRef.current?.(exportFileName(customerName, "use-cases"));
              if (n != null) toast.success(`Exported ${n} use ${n === 1 ? "case" : "cases"}`);
            }}
          />
        </>
      }
    >
      <ListState
        loading={q.isLoading}
        error={q.error ? (q.error as Error).message : undefined}
        empty={!q.data?.length}
        emptyText="No use cases recorded for this customer."
        onRetry={() => q.refetch()}
      >
        <DataGrid<UseCaseRow>
          data={q.data ?? []}
          rowKey={(r, i) => r.id ?? i}
          columns={useCaseColumns}
          exportRef={exportRef}
          exportExtras={[
            { header: "Stakeholder Title", value: (r) => r.stakeholder_title },
            { header: "Value", value: (r) => text(r.value_snippet) },
            { header: "Notes", value: (r) => text(r.note) },
          ]}
          onEdit={setEditing}
          onDelete={ask}
          onClone={(r) => setBulk({ sources: [r] })}
          selection={{ selected: picked, onChange: setPicked }}
          detail={(r) =>
            r.value_snippet?.trim() || r.note?.trim() ? (
              <>
                <FullText label="Value" value={r.value_snippet} />
                <FullText label="Notes" value={r.note} />
              </>
            ) : null
          }
        />
      </ListState>
      {adding && parentId != null && (
        <UseCaseForm parentId={parentId} customerKeys={customerKeys} existing={q.data ?? []} onClose={() => setAdding(false)} />
      )}
      {bulk && parentId != null && (
        <UseCaseBulkForm
          parentId={parentId}
          customerKeys={customerKeys}
          existing={q.data ?? []}
          sources={bulk.sources}
          startWithPaste={bulk.paste}
          onClose={() => {
            setBulk(null);
            setPicked(new Set());
          }}
        />
      )}
      {editing && parentId != null && (
        <UseCaseForm
          key={editing.id}
          parentId={parentId}
          customerKeys={customerKeys}
          existing={q.data ?? []}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDelete
        open={!!target}
        title="Delete this use case?"
        description={
          <>
            <span className="font-medium text-foreground">{target?.solution_name || "Untitled"}</span>
            {target?.subsidiary_name && <> ({target.subsidiary_name})</>} will be removed from this customer. This cannot be undone from the app.
          </>
        }
        pending={del.isPending}
        error={del.error?.message}
        onCancel={() => setTarget(null)}
        onConfirm={() =>
          target &&
          del.mutate(target, {
            onSuccess: () => {
              toast.success("Use case deleted");
              setTarget(null);
            },
          })
        }
      />
    </Panel>
  );
}

/* ----------------------------------- Events ----------------------------------- */

export function EventsPanel({
  parentId,
  customerKeys = [],
  customerName = "",
  className,
}: {
  parentId: number | null;
  /** Used in the export file name. */
  customerName?: string;
  /** Keys that identify the customer in the subsidiary table (its `id`, then `parent_id`). */
  customerKeys?: number[];
  className?: string;
}) {
  const q = useEvents(parentId);
  const exportRef = useRef<GridExport | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const del = useDeleteEvent(parentId);
  const [target, setTarget] = useState<EventRow | null>(null);
  const ask = (row: EventRow) => {
    del.reset();
    setTarget(row);
  };

  return (
    <Panel
      title="Events"
      count={q.data?.rows.length}
      badges={
        q.data ? (
          <>
            <Tally n={q.data.rows.filter((r) => /complete/i.test(r.stage ?? "")).length} label="Completed" />
            <Tally n={q.data.rows.reduce((sum, r) => sum + (r.attendee_count ?? 0), 0)} label="Attendees" tone="blue" />
          </>
        ) : undefined
      }
      className={className}
      bodyClassName="overflow-auto"
      headerRight={
        <>
          <AddButton label="Add event" disabled={parentId == null} onClick={() => setAdding(true)} />
          <ExportButton
            disabled={!q.data?.rows.length}
            onClick={() => {
              const n = exportRef.current?.(exportFileName(customerName, "events"));
              if (n != null) toast.success(`Exported ${n} ${n === 1 ? "event" : "events"}`);
            }}
          />
        </>
      }
    >
      <ListState
        loading={q.isLoading}
        error={q.error ? (q.error as Error).message : undefined}
        empty={!q.data?.rows.length}
        emptyText="No events recorded for this customer."
        onRetry={() => q.refetch()}
      >
        {q.data?.warnings.map((w) => (
          <p key={w} className="flex items-start gap-1.5 border-b bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> {w}
          </p>
        ))}
        <DataGrid<EventRow>
          data={q.data?.rows ?? []}
          rowKey={(r, i) => r.id ?? i}
          columns={eventColumns}
          exportRef={exportRef}
          exportExtras={[
            { header: "Duration (min)", value: (r) => r.duration },
            { header: "Virtual", value: (r) => (r.virtual == null ? undefined : r.virtual ? "Yes" : "No") },
            { header: "Attendee Names", value: (r) => text(r.attendee_names) },
            { header: "Meeting Notes", value: (r) => text(r.meeting_notes) },
          ]}
          onEdit={setEditing}
          onDelete={ask}
          detail={(r) =>
            r.meeting_notes?.trim() || r.attendee_names?.trim() ? (
              <>
                <FullText label="Attendees" value={r.attendee_names} />
                <FullText label="Meeting notes" value={r.meeting_notes} />
              </>
            ) : null
          }
        />
      </ListState>
      {adding && parentId != null && (
        <EventForm parentId={parentId} customerKeys={customerKeys} existing={q.data?.rows ?? []} onClose={() => setAdding(false)} />
      )}
      {editing && parentId != null && (
        <EventForm
          key={editing.id}
          parentId={parentId}
          customerKeys={customerKeys}
          existing={q.data?.rows ?? []}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDelete
        open={!!target}
        title="Delete this event?"
        description={
          <>
            <span className="font-medium text-foreground">{target?.event_type || "Event"}</span>
            {fmtDate(target?.event_date) && <> on {fmtDate(target?.event_date)}</>}
            {target?.subsidiary_name && <> ({target.subsidiary_name})</>} will be removed from this customer. This cannot be undone from the app.
          </>
        }
        pending={del.isPending}
        error={del.error?.message}
        onCancel={() => setTarget(null)}
        onConfirm={() =>
          target &&
          del.mutate(target, {
            onSuccess: () => {
              toast.success("Event deleted");
              setTarget(null);
            },
          })
        }
      />
    </Panel>
  );
}
