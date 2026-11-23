/**
 * The AI brief's pieces inside the summary dialog (spec 022-ai-account-brief, task AIB-T07): run progress with *Cancel*,
 * the run error with *Try again*, and the unsaved draft with *Save* / *Edit* / *Discard* and the unverified banner. All
 * texts are in the messages catalog §5. The draft HTML is sanitised again before it is shown (Article III).
 */
import { AlertTriangle, Check, Loader2, Pencil, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RICH_TEXT_CLASS, sanitizeHtml } from "@/lib/html";
import { cn } from "@/lib/utils";
import { shortRunId, type BriefDraft, type StepName } from "@/lib/aiBrief";

const STEP_TEXT: Record<StepName, string> = {
  retrieve: "Reading records…",
  analyse: "Analysing…",
  write: "Writing…",
  guard: "Checking…",
};

const SMALL = "h-6 gap-1 px-2 text-[11px] [&_svg]:size-3";


/** AIB-GEN-018, AIB-GEN-021: step progress in a polite live region, with *Cancel*. */
export function AiProgress({ step, noSummary, onCancel }: { step?: StepName; noSummary: boolean; onCancel: () => void }) {
  return (
    <div className="m-2 flex items-center gap-2 rounded-md bg-primary/5 px-2.5 py-1.5 text-xs ring-1 ring-primary/15">
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="min-w-0 flex-1" aria-live="polite" role="status">
        {noSummary && <p>No executive summary yet. Drafting one with AI…</p>}
        <p className="text-muted-foreground">{STEP_TEXT[step ?? "retrieve"]}</p>
      </div>
      <Button size="sm" variant="outline" className={cn(SMALL, "bg-background")} onClick={onCancel}>
        <X /> Cancel
      </Button>
    </div>
  );
}

/** AIB-GEN-004: the run failure, inline, with *Try again*. */
export function AiError({ reason, runId, onRetry, retryDisabled }: { reason: string; runId?: string; onRetry: () => void; retryDisabled?: boolean }) {
  return (
    <div role="alert" className="m-2 flex items-center gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
      <p className="min-w-0 flex-1">
        Could not draft the summary: {reason}
        {runId ? ` (run ${shortRunId(runId)})` : ""}
      </p>
      <Button size="sm" variant="outline" className={cn(SMALL, "bg-background text-foreground")} disabled={retryDisabled} onClick={onRetry}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}

/** AIB-HUMAN-009, -012, -005..007, AIB-CITE-004: the unsaved draft, its banner and actions. */
export function AiDraftView({
  draft,
  dark,
  saving,
  saveError,
  onSave,
  onEdit,
  onDiscard,
}: {
  draft: BriefDraft;
  dark: boolean;
  saving: boolean;
  saveError?: string;
  onSave: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="m-2 flex flex-wrap items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs ring-1 ring-amber-500/30">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        <p className="min-w-0 flex-1 font-medium">AI draft — not saved. Check it, then Save, Edit or Discard.</p>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className={cn(SMALL, "bg-background")} disabled={saving} onClick={onDiscard}>
            <Trash2 /> Discard
          </Button>
          <Button size="sm" variant="outline" className={cn(SMALL, "bg-background")} disabled={saving} onClick={onEdit}>
            <Pencil /> Edit
          </Button>
          <Button size="sm" className={SMALL} disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Save
          </Button>
        </div>
      </div>
      {saveError && (
        <p role="alert" className="mx-2 mb-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          Could not save: {saveError}
        </p>
      )}
      {draft.status === "unverified" && (
        <div role="note" className="mx-2 mb-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Unverified draft: check the points below before saving
          </p>
          <ul className="mt-1 list-disc pl-6">
            {draft.issues.map((issue, i) => (
              <li key={i}>{issue.detail}</li>
            ))}
          </ul>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        title="Click to edit"
        onClick={(e) => !(e.target as HTMLElement).closest("a") && onEdit()}
        onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && (e.preventDefault(), onEdit())}
        className="cursor-text p-4 outline-none transition-colors hover:bg-stone-200/40 focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-stone-800/30"
      >
        <div className={cn(RICH_TEXT_CLASS, "prose-p:my-2")} dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.html, dark) }} />
      </div>
    </div>
  );
}
