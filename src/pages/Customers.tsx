import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/customers/TopBar";
import { SearchBox } from "@/components/customers/SearchBox";
import { SummaryDialog } from "@/components/customers/SummaryDialog";
import { EventsPanel, UseCasesPanel } from "@/components/customers/ParentActivity";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useCustomers } from "@/hooks/useCustomers";
import { useAutoBrief } from "@/hooks/useAiBrief";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Wider hit area around the 1px divider, with a grip that brightens on hover/drag.
const handleCls =
  "bg-transparent transition-colors hover:bg-primary/10 data-[resize-handle-active]:bg-primary/15 w-3 data-[panel-group-direction=vertical]:h-3 data-[panel-group-direction=vertical]:w-full [&>div]:bg-card [&>div]:text-muted-foreground hover:[&>div]:text-primary";

const Customers = () => {
  const { data, isLoading, isFetching, error, refetch } = useCustomers();
  const [picked, setSelected] = useState<Record<string, unknown> | null>(null);

  // Full customer list is loaded in the background and never rendered as a list.
  const rows = useMemo(() => data?.rows ?? [], [data]);
  // `picked` is the row snapshot taken when the customer was chosen. After the customers query refetches (for example
  // once the executive summary is saved, SUM-EDIT-001) the same customer is re-picked by `id`, so the panels show the
  // stored values and the new "Last modified" time. Falls back to the snapshot if the row is no longer in the list.
  const selected = useMemo(
    () => (picked && picked.id != null ? rows.find((r) => r.id === picked.id) ?? picked : picked),
    [picked, rows],
  );
  // The Executive Summary dialog (LAY-DLG-001). It opens because the user selects a customer, never because `selected`
  // changed: the selection handlers below set it, no effect watches `selected`. The re-pick of the row after a refetch
  // (a summary save, Refresh) builds a new `selected` object but calls no handler, so it cannot reopen or reset the
  // dialog (LAY-DLG-002). Not stored anywhere (Article II).
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);
  const select = (row: Record<string, unknown>) => {
    setSelected(row);
    setSummaryOpen(true);
  };
  const clear = () => {
    setSelected(null);
    setSummaryOpen(false);
  };
  // The AI brief belongs to the selected customer, not to the dialog: closing the dialog keeps the run and the draft
  // (AIB-HUMAN-010); a customer change or a cleared selection cancels the run (AIB-GEN-008). AIB-T10.
  const customerId = selected?.id == null ? null : Number(selected.id);
  const summaryEmpty = !(typeof selected?.executive_summary === "string" && selected.executive_summary.trim());
  const brief = useAutoBrief(customerId, { summaryEmpty, open: summaryOpen });
  // AIB-HUMAN-011: one polite announcement when a draft becomes ready while the dialog is closed; the focus never moves.
  const [announcement, setAnnouncement] = useState("");
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && brief.draftReady && !summaryOpen) setAnnouncement("AI draft ready — not saved");
    if (summaryOpen || customerId == null) setAnnouncement("");
    wasRunning.current = brief.running;
  }, [brief.running, brief.draftReady, summaryOpen, customerId]);
  const indicatorId = useId();
  const indicator = brief.running ? "AI is drafting the summary…" : brief.draftReady ? "AI draft ready — not saved" : "";
  const desktop = useMediaQuery("(min-width: 1024px)");
  const errorMessage = error ? (error as Error).message : undefined;

  return (
    // With a customer selected on desktop the page is exactly one viewport tall (top bar + flexible main),
    // so Use Cases and Events are always on screen and scroll internally instead of the page.
    <div className={`relative overflow-hidden ${selected && desktop ? "flex h-screen flex-col" : "min-h-screen"}`}>
      {/* Ambient backdrop: muted navy/steel glow + fine grid, fades out toward the bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-slate-500/15 blur-3xl dark:bg-slate-400/10" />
        <div className="absolute -right-32 top-20 h-[26rem] w-[26rem] rounded-full bg-sky-700/10 blur-3xl dark:bg-sky-400/10" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 75%)",
          }}
        />
      </div>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <TopBar
        selectedLabel={
          selected
            ? { name: String(selected.parent_name ?? ""), id: selected.parent_id == null ? undefined : String(selected.parent_id) }
            : undefined
        }
        onClear={clear}
        onRefresh={() => refetch()}
        refreshing={isFetching}
        summaryButton={
          selected ? (
            // Reopens the summary dialog (LAY-DLG-010). The label shows from 640px; the name is always "Executive summary".
            <Button
              ref={summaryButtonRef}
              variant="ghost"
              size="sm"
              aria-label="Executive summary"
              aria-describedby={indicator ? indicatorId : undefined}
              title={indicator || undefined}
              className="relative h-7 shrink-0 gap-1.5 px-2 text-xs"
              onClick={() => setSummaryOpen(true)}
            >
              {brief.running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="hidden sm:inline">Executive summary</span>
              {brief.draftReady && (
                <span aria-hidden data-testid="ai-draft-badge" className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
              )}
              {indicator && (
                <span id={indicatorId} className="sr-only">
                  {indicator}
                </span>
              )}
            </Button>
          ) : undefined
        }
      >
        {selected && (
          <SearchBox
            variant="bar"
            rows={rows}
            loading={isLoading}
            error={errorMessage}
            onRetry={() => refetch()}
            onSelect={select}
          />
        )}
      </TopBar>

      <main
        className={`mx-auto w-full px-4 transition-[padding,max-width] duration-500 ease-out sm:px-6 ${
          selected ? "max-w-[1920px] pb-4 pt-4 lg:min-h-0 lg:flex-1" : "max-w-2xl pt-[14vh]"
        }`}
      >
        {selected ? (
          // Use Cases over Events, both full width. On desktop the divider between them is draggable and its size is
          // remembered (`autoSaveId`, LAY-PANEL-004); on small screens they simply stack and the page scrolls. The
          // Executive Summary is not part of the workspace: it opens as a dialog over it (LAY-DLG-001).
          // The use case / event procs take the parent record's `id`.
          (() => {
            const parentId = selected.id == null ? null : Number(selected.id);
            const key = String(selected.id ?? selected.parent_id);
            // How the subsidiary table refers to this customer: by `id` (as the activity procedures do), else by `parent_id`.
            const customerKeys = [selected.id, selected.parent_id].filter((v) => v != null).map(Number);
            // Keyed by customer like the workspace, so a customer change drops the dialog's editor state (LAY-DLG-014).
            const summary = (
              <SummaryDialog
                key={`summary-${key}`}
                row={selected}
                open={summaryOpen}
                onOpenChange={setSummaryOpen}
                returnFocusRef={summaryButtonRef}
                ai={brief}
              />
            );
            if (!desktop) {
              return (
                <>
                  <div key={key} className="flex flex-col gap-4">
                    <UseCasesPanel parentId={parentId} customerKeys={customerKeys} customerName={String(selected.parent_name ?? '')} className="max-h-[60vh]" />
                    <EventsPanel parentId={parentId} customerKeys={customerKeys} customerName={String(selected.parent_name ?? '')} className="max-h-[60vh]" />
                  </div>
                  {summary}
                </>
              );
            }
            return (
              <>
                <div key={key} className="flex h-full flex-col">
                  {/* The group is absolutely positioned inside a flex-1 wrapper: it needs a sized, positioned parent to get a height. */}
                  <div className="relative min-h-0 flex-1">
                    <ResizablePanelGroup direction="vertical" autoSaveId="terra-split-v-v1" className="absolute inset-0">
                      <ResizablePanel id="usecases" order={1} defaultSize={60} minSize={20} className="relative">
                        <UseCasesPanel parentId={parentId} customerKeys={customerKeys} customerName={String(selected.parent_name ?? '')} className="absolute inset-0" />
                      </ResizablePanel>
                      <ResizableHandle withHandle className={handleCls} />
                      <ResizablePanel id="events" order={2} defaultSize={40} minSize={20} className="relative">
                        <EventsPanel parentId={parentId} customerKeys={customerKeys} customerName={String(selected.parent_name ?? '')} className="absolute inset-0" />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>
                </div>
                {summary}
              </>
            );
          })()
        ) : (
          <>
            <SearchBox
              variant="hero"
              rows={rows}
              loading={isLoading}
              error={errorMessage}
              onRetry={() => refetch()}
              onSelect={select}
              autoFocus
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Customers;
