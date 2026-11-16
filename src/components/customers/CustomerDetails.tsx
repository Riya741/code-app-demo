import { Suspense, lazy, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { exportFileName } from "@/lib/csv";
import { downloadWordDoc } from "@/lib/wordDoc";
import { ExportButton } from "@/components/customers/ExportButton";
import { Panel } from "@/components/customers/Panel";
import { RICH_TEXT_CLASS, looksLikeHtml, sanitizeHtml } from "@/lib/html";

type Row = Record<string, unknown>;

/** "Oct 16, 2026, 3:42 PM UTC". The database stores UTC, so a value with no zone designator is read as UTC. Placeholder dates (< 2000) are hidden. */
function fmtUtc(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const iso = /(Z|[+-]\d{2}:?\d{2})$/i.test(v) || !/T|\d{2}:\d{2}/.test(v) ? v : `${v.trim().replace(" ", "T")}Z`;
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getUTCFullYear() < 2000) return null;
  return `${d.toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} UTC`;
}

/** Summaries edited in this browser session, by customer. UI only: nothing is written to the database and a reload clears them. */
const editedSummaries = new Map<string, string>();

const RichTextEditor = lazy(() => import("@/components/customers/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

/** Shows only the executive summary. Name and ID live in the top bar; everything else stays internal. Click the text to edit it. */
export function CustomerDetails({ row, className }: { row: Row; className?: string }) {
  const customerKey = String(row.id ?? row.parent_id);
  const original = typeof row.executive_summary === "string" ? row.executive_summary.trim() : "";
  const [edited, setEdited] = useState<string | undefined>(() => editedSummaries.get(customerKey));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const summary = edited ?? original;
  const modified = fmtUtc(row.summary_last_modified);

  const startEdit = () => {
    setDraft(summary);
    setEditing(true);
  };
  const exportSummary = () => {
    const customer = String(row.parent_name ?? "");
    downloadWordDoc(
      exportFileName(customer, "executive-summary", "doc"),
      customer ? `${customer} - Executive Summary` : "Executive Summary",
      modified ? `Last modified: ${modified}` : "",
      summary,
    );
    toast.success("Executive summary exported");
  };
  const save = () => {
    editedSummaries.set(customerKey, draft);
    setEdited(draft);
    setEditing(false);
    toast.success("Executive summary updated", { description: "Shown on screen only; it is not written to the database." });
  };

  return (
    <Panel
      title="Executive Summary"
      headerRight={
        editing ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-6 gap-1 bg-background px-2 text-[11px] [&_svg]:size-3" onClick={() => setEditing(false)}>
              <X /> Cancel
            </Button>
            <Button size="sm" className="h-6 gap-1 px-2 text-[11px] [&_svg]:size-3" onClick={save}>
              <Check /> Save
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-x-2">
            {edited !== undefined && <span className="whitespace-nowrap text-[11px] font-medium text-amber-700 dark:text-amber-400">Edited (on screen only)</span>}
            {modified && <span className="whitespace-nowrap text-[11px] font-semibold text-teal-700 dark:text-teal-300">Last modified: {modified}</span>}
            <ExportButton disabled={!summary} onClick={exportSummary} title="Download the executive summary as a Word document" />
          </div>
        )
      }
      className={cn("border-stone-300/70 bg-stone-100 dark:border-stone-700/60 dark:bg-stone-900/50", className)}
      headerClassName="border-stone-300/70 bg-stone-200/70 dark:border-stone-700/60 dark:bg-stone-800/60"
    >
      {editing ? (
        <Suspense fallback={<p className="p-4 text-xs text-muted-foreground">Loading editor...</p>}>
          <RichTextEditor html={draft} onChange={setDraft} />
        </Suspense>
      ) : (
        <div
          role="button"
          tabIndex={0}
          title="Click to edit"
          onClick={(e) => !(e.target as HTMLElement).closest("a") && startEdit()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), startEdit())}
          className="group relative min-h-full cursor-text p-4 outline-none transition-colors hover:bg-stone-200/40 focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-stone-800/30"
        >
          <span className="pointer-events-none absolute right-3 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Pencil className="h-3 w-3" /> Click to edit
          </span>
          {summary ? (
            looksLikeHtml(summary) ? (
              <div
                className={cn(RICH_TEXT_CLASS, "prose-p:my-2")}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary, dark) }}
              />
            ) : (
              <p className="whitespace-pre-line text-xs leading-relaxed">{summary}</p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">No executive summary yet. Click to add one.</p>
          )}
        </div>
      )}
    </Panel>
  );
}
