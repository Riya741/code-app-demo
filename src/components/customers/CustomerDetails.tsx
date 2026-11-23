import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import { useSaveSummary } from "@/hooks/useCustomers";
import type { BriefController } from "@/hooks/useAiBrief";
import { cn } from "@/lib/utils";
import { exportFileName } from "@/lib/csv";
import { downloadWordDoc } from "@/lib/wordDoc";
import { ExportButton } from "@/components/customers/ExportButton";
import { Panel } from "@/components/customers/Panel";
import { AiDraftView, AiError, AiProgress } from "@/components/customers/AiDraftBanner";
import { RICH_TEXT_CLASS, looksLikeHtml, sanitizeHtml } from "@/lib/html";

type Row = Record<string, unknown>;

/** "Oct 16, 2026, 3:42 PM UTC". The database stores UTC, so a value with no zone designator is read as UTC. Placeholder dates (< 2000) are hidden. */
export function fmtUtc(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const iso = /(Z|[+-]\d{2}:?\d{2})$/i.test(v) || !/T|\d{2}:\d{2}/.test(v) ? v : `${v.trim().replace(" ", "T")}Z`;
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getUTCFullYear() < 2000) return null;
  return `${d.toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} UTC`;
}

const RichTextEditor = lazy(() => import("@/components/customers/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

/** What `CustomerDetails` tells its host: the editor is open, holds unsaved changes, or a save is running (LAY-DLG-007, -008). */
export type SummaryState = { editing: boolean; dirty: boolean; saving: boolean };

const SMALL = "h-6 gap-1 px-2 text-[11px] [&_svg]:size-3";
const BREAKER_TEXT = "AI is temporarily unavailable. Try again in a few minutes.";

/**
 * Shows only the executive summary. Name and ID live in the top bar; everything else stays internal. Click the text to edit it.
 * It is shown inside the summary dialog (SUM-VIEW-006). The host can follow `onStateChange` to decide whether closing needs
 * a confirmation or must wait, and `onSaved` to close after a successful save. Without them it works on its own.
 *
 * With `ai` (the page's AI brief, AIB-T07) it adds *Regenerate with AI*, run progress, the run error and the unsaved draft.
 * Without `ai`, or with AI off, it is the plain summary (AIB-GEN-019).
 */
export function CustomerDetails({
  row,
  className,
  titleId,
  onStateChange,
  onSaved,
  ai,
}: {
  row: Row;
  className?: string;
  /** `id` for the "Executive Summary" heading, so a dialog can reference it with `aria-labelledby`. */
  titleId?: string;
  /** Called with the current state when the component mounts and whenever `editing`, `dirty` or `saving` changes. */
  onStateChange?: (state: SummaryState) => void;
  /** Called once after a successful save, after the success toast. */
  onSaved?: () => void;
  /** The AI brief for this customer; owned by the page so it outlives the dialog (AIB-HUMAN-010). */
  ai?: BriefController;
}) {
  const summary = typeof row.executive_summary === "string" ? row.executive_summary.trim() : "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // The text the editor was opened with. The editor reports only real edits, so draft !== opened means unsaved changes.
  const [opened, setOpened] = useState("");
  // The editor was opened from an AI draft (AIB-HUMAN-006): it keeps the "not saved" label until Save or Cancel.
  const [aiEditing, setAiEditing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const saveSummary = useSaveSummary();
  const saving = saveSummary.isPending;
  const dirty = editing && draft !== opened;
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const modified = fmtUtc(row.summary_last_modified);

  const aiOn = !!ai?.ai.enabled;
  const running = aiOn && ai!.running;
  const draftShown = aiOn && ai!.draftReady && !editing;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.({ editing, dirty, saving });
  }, [editing, dirty, saving]);

  const startEdit = () => {
    // Writing your own summary stops the run, so a draft never replaces what the user types (AIB-GEN-015).
    if (running) ai!.cancel();
    saveSummary.reset();
    setDraft(summary);
    setOpened(summary);
    setAiEditing(false);
    setEditing(true);
  };
  const cancel = () => {
    saveSummary.reset();
    setAiEditing(false);
    setEditing(false);
  };
  // AIB-HUMAN-006: the editor opens with the draft; the stored text is the baseline, so closing asks before dropping it.
  const editDraft = () => {
    if (!ai?.draft) return;
    saveSummary.reset();
    setDraft(ai.draft.html);
    setOpened(summary);
    setAiEditing(true);
    setEditing(true);
    ai.discard();
  };
  const regenerate = () => {
    if (editing && dirty) {
      setConfirmReplace(true);
      return;
    }
    replaceAndStart();
  };
  const replaceAndStart = () => {
    setConfirmReplace(false);
    saveSummary.reset();
    setAiEditing(false);
    setEditing(false);
    void ai?.start();
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
  // The summary endpoint finds the customer by the `customer` sheet `id` (SUM-EDIT-001). The hook waits for the customer
  // list to refetch, so the panel shows the stored summary and new timestamp as soon as the editor closes.
  const persist = (html: string, after?: () => void) => {
    saveSummary.mutate(
      { id: Number(row.id), html },
      {
        onSuccess: () => {
          setEditing(false);
          setAiEditing(false);
          after?.();
          toast.success("Executive summary updated");
          onSaved?.();
        },
      },
    );
  };
  const save = () => persist(draft);
  // AIB-HUMAN-005: the draft as it is, through the same save as an edit.
  const saveDraft = () => ai?.draft && persist(ai.draft.html, () => ai.discard());

  // AIB-GEN-017, -018, -012: hidden while a draft is shown; disabled with a spinner while running, or with the
  // breaker tooltip while AI is unavailable.
  const regenerateButton =
    aiOn && !draftShown ? (
      <span title={!ai!.ai.available ? BREAKER_TEXT : undefined} className="inline-flex">
        <Button
          size="sm"
          variant="outline"
          className={cn(SMALL, "bg-background")}
          disabled={running || !ai!.ai.available || saving}
          onClick={regenerate}
        >
          {running ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} Regenerate with AI
        </Button>
      </span>
    ) : null;

  return (
    <Panel
      title="Executive Summary"
      headerRight={
        editing ? (
          <div className="flex items-center gap-1.5">
            {regenerateButton}
            <Button size="sm" variant="outline" className={cn(SMALL, "bg-background")} disabled={saving} onClick={cancel}>
              <X /> Cancel
            </Button>
            <Button size="sm" className={SMALL} disabled={saving} onClick={save}>
              {saving ? <Loader2 className="animate-spin" /> : <Check />} Save
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-x-2">
            {modified && <span className="whitespace-nowrap text-[11px] font-semibold text-teal-700 dark:text-teal-300">Last modified: {modified}</span>}
            {regenerateButton}
            <ExportButton disabled={!summary} onClick={exportSummary} title="Download the executive summary as a Word document" />
          </div>
        )
      }
      titleId={titleId}
      className={cn("border-stone-300/70 bg-stone-100 dark:border-stone-700/60 dark:bg-stone-900/50", className)}
      headerClassName="border-stone-300/70 bg-stone-200/70 dark:border-stone-700/60 dark:bg-stone-800/60"
    >
      {editing ? (
        <>
          {aiEditing && (
            <p className="m-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium ring-1 ring-amber-500/30">
              AI draft — not saved. Check it, then Save or Cancel.
            </p>
          )}
          {saveSummary.error && (
            <p role="alert" className="m-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              Could not save: {saveSummary.error.message}
            </p>
          )}
          <Suspense fallback={<p className="p-4 text-xs text-muted-foreground">Loading editor...</p>}>
            <RichTextEditor html={draft} onChange={setDraft} />
          </Suspense>
        </>
      ) : draftShown && ai!.draft ? (
        <AiDraftView
          draft={ai!.draft}
          dark={dark}
          saving={saving}
          saveError={saveSummary.error?.message}
          onSave={saveDraft}
          onEdit={editDraft}
          onDiscard={ai!.discard}
        />
      ) : (
        <>
          {running && <AiProgress step={ai!.step} noSummary={!summary} onCancel={ai!.cancel} />}
          {aiOn && ai!.phase === "failed" && (
            <AiError reason={ai!.error ?? ""} runId={ai!.runId} onRetry={regenerate} retryDisabled={!ai!.ai.available} />
          )}
          {!(running && !summary) && (
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
        </>
      )}

      <AlertDialog open={confirmReplace} onOpenChange={(o) => !o && setConfirmReplace(false)}>
        <AlertDialogContent className="max-w-sm" aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Replace your unsaved changes with an AI draft?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Keep editing</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs" onClick={replaceAndStart}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}
