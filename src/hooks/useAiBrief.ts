/**
 * AI brief hooks (spec 022-ai-account-brief, tasks AIB-T06 and AIB-T10). Components use these; only the fetchers in
 * `src/lib/aiBrief.ts` call the AI routes (Article IX). No AI data goes into the customers query cache.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AI_FAILED,
  AI_OFF,
  AiRequestError,
  cancelRun,
  getAiStatus,
  getRun,
  startBrief,
  subscribeRun,
  type AiStatus,
  type BriefDraft,
  type StepName,
} from "@/lib/aiBrief";

/** AIB-API-004: whether AI is on, available, and may draft automatically. Never calls the model. */
export function useAiStatus() {
  return useQuery({ queryKey: ["ai-status"], queryFn: getAiStatus, staleTime: 30_000, retry: false });
}

export function useStartBrief() {
  return useMutation({ mutationFn: (customerId: number) => startBrief(customerId) });
}

export type BriefPhase = "idle" | "running" | "succeeded" | "unverified" | "failed";

export type BriefRun = {
  phase: BriefPhase;
  runId?: string;
  step?: StepName;
  revision?: number;
  draft?: BriefDraft;
  /** A messages-catalog reason, for "Could not draft the summary: <reason> (run <id>)". */
  error?: string;
};

const IDLE: BriefRun = { phase: "idle" };

type Live = { customerId: number; runId?: string; finished: boolean; close?: () => void };

/**
 * One brief run for one customer. The state belongs to `customerId`: a change of customer (or `null`) shows `idle` at
 * once, and the unfinished run of the previous customer is cancelled and its stream closed (AIB-GEN-008). Nothing here
 * writes to the workbook.
 */
export function useBriefRun(customerId: number | null) {
  const [state, setState] = useState<BriefRun & { customerId: number | null }>({ ...IDLE, customerId: null });
  const live = useRef<Live>();
  const startMutation = useStartBrief();
  const startAsync = startMutation.mutateAsync;

  /** Closes the stream; cancels the run on the server if it has not finished. */
  const stop = useCallback(() => {
    const l = live.current;
    live.current = undefined;
    if (!l) return;
    l.close?.();
    if (!l.finished && l.runId) void cancelRun(l.runId).catch(() => undefined);
  }, []);

  // Customer change, cleared selection or unmount (AIB-GEN-008). Closing the dialog does not reach this (AIB-HUMAN-010).
  useEffect(() => stop, [customerId, stop]);

  const start = useCallback(async () => {
    if (customerId == null) return;
    stop();
    const token: Live = { customerId, finished: false };
    live.current = token;
    const set = (next: BriefRun) => live.current === token && setState({ ...next, customerId });
    set({ phase: "running" });
    let runId: string;
    try {
      runId = (await startAsync(customerId)).runId;
    } catch (e) {
      token.finished = true;
      set({ phase: "failed", error: e instanceof AiRequestError ? e.message : AI_FAILED });
      return;
    }
    if (live.current !== token) {
      void cancelRun(runId).catch(() => undefined);
      return;
    }
    token.runId = runId;
    set({ phase: "running", runId });
    token.close = subscribeRun(
      runId,
      (event) => {
        if (event.status === "running") set({ phase: "running", runId, step: event.step, revision: event.revision });
      },
      async () => {
        try {
          const run = await getRun(runId);
          token.finished = run.status !== "running";
          if (run.status === "cancelled") set(IDLE);
          else if ((run.status === "succeeded" || run.status === "unverified") && run.draft) set({ phase: run.status, runId, draft: run.draft });
          else set({ phase: "failed", runId, error: run.error ?? AI_FAILED });
        } catch (e) {
          set({ phase: "failed", runId, error: e instanceof AiRequestError ? e.message : AI_FAILED });
        }
      },
    );
  }, [customerId, stop, startAsync]);

  /** Stops a running run (AIB-GEN-018 *Cancel*, AIB-GEN-015 editor opened). */
  const cancel = useCallback(() => {
    stop();
    setState({ ...IDLE, customerId });
  }, [customerId, stop]);

  /** Drops a finished draft or error (AIB-HUMAN-007, after a save). Writes nothing. */
  const discard = useCallback(() => {
    stop();
    setState({ ...IDLE, customerId });
  }, [customerId, stop]);

  const run: BriefRun = state.customerId === customerId ? state : IDLE;
  return { ...run, start, cancel, discard };
}

export type BriefController = ReturnType<typeof useBriefRun> & {
  ai: AiStatus;
  running: boolean;
  draftReady: boolean;
};

/**
 * AIB-T10: the page's AI brief for the selected customer. Starts one automatic run per selection when the customer has
 * no saved summary, the dialog is open and AI is available with `auto_draft` (AIB-GEN-021, AIB-GEN-022). Closing and
 * reopening the dialog, a refetch and discarding the draft start nothing new.
 */
export function useAutoBrief(customerId: number | null, { summaryEmpty, open }: { summaryEmpty: boolean; open: boolean }): BriefController {
  const status = useAiStatus();
  const ai = status.data ?? AI_OFF;
  const run = useBriefRun(customerId);
  const startedFor = useRef<number | null>(null);
  const { start } = run;

  useEffect(() => {
    if (customerId == null) {
      startedFor.current = null;
      return;
    }
    if (startedFor.current === customerId || !open || !summaryEmpty) return;
    if (!ai.enabled || !ai.available || !ai.auto_draft) return;
    startedFor.current = customerId;
    void start();
  }, [customerId, open, summaryEmpty, ai.enabled, ai.available, ai.auto_draft, start]);

  return {
    ...run,
    ai,
    running: ai.enabled && run.phase === "running",
    draftReady: ai.enabled && (run.phase === "succeeded" || run.phase === "unverified"),
  };
}
