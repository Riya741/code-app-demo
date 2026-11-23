// AI brief in the summary dialog (spec 022-ai-account-brief). Tasks AIB-T06 (fetchers, hooks), AIB-T10 (useAutoBrief),
// AIB-T07 (dialog states) and AIB-T09 (these tests). The dialog states render `CustomerDetails` with a controller object
// (the hook's shape); the hooks run against `fetch` and `EventSource` stubs at the network boundary. No model, no server.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { CustomerDetails } from "@/components/customers/CustomerDetails";
import { useAutoBrief, type BriefController } from "@/hooks/useAiBrief";
import { AI_OFF, getAiStatus, type AiStatus, type BriefDraft } from "@/lib/aiBrief";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/wordDoc", () => ({ downloadWordDoc: vi.fn() }));
vi.mock("@/components/customers/RichTextEditor", () => ({
  RichTextEditor: ({ html, onChange }: { html: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Summary editor" value={html} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ROW = { id: 7, parent_id: 1007, parent_name: "Northwind Demo", executive_summary: "<p>Stored summary</p>" };
const EMPTY_ROW = { ...ROW, executive_summary: "" };
const ON: AiStatus = { enabled: true, available: true, auto_draft: true };
const DRAFT: BriefDraft = {
  run_id: "run_abcdef123456",
  customer_id: 7,
  status: "verified",
  html: "<p><strong>Overview</strong></p><p>Two live projects. [UC-1]</p>",
  citations: ["UC-1"],
  issues: [],
  word_count: 3,
};

const reply = (status: number, body?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" && body !== undefined ? "application/json" : null) },
    json: async () => body,
  }) as unknown as Response;

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

/** A stand-in for the browser's EventSource: tests push events with `emit`. */
class FakeEventSource {
  static all: FakeEventSource[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeEventSource.all.push(this);
  }
  close() {
    this.closed = true;
  }
  emit(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("EventSource", FakeEventSource);
  FakeEventSource.all = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

/** A controller in the shape `useAutoBrief` returns. */
function controller(fields: Partial<BriefController> = {}): BriefController {
  const phase = fields.phase ?? "idle";
  return {
    phase,
    ai: ON,
    running: phase === "running",
    draftReady: phase === "succeeded" || phase === "unverified",
    start: vi.fn(async () => undefined),
    cancel: vi.fn(),
    discard: vi.fn(),
    ...fields,
  };
}

function renderDetails(ai: BriefController | undefined, row: Record<string, unknown> = ROW, onSaved = vi.fn()) {
  render(
    <QueryClientProvider client={newClient()}>
      <CustomerDetails row={row} ai={ai} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onSaved };
}

const regenerate = () => screen.queryByRole("button", { name: /Regenerate with AI/ });

/* ------------------------------------------------------------------------------------------- dialog states (AIB-T07) */

describe("summary dialog with AI", () => {
  it("AIB-GEN-019 without AI, or with AI off, shows no AI action, progress or label", () => {
    renderDetails(undefined);
    expect(regenerate()).toBeNull();
    renderDetails(controller({ ai: AI_OFF, phase: "running", running: false }));
    expect(regenerate()).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/AI draft/)).toBeNull();
  });

  it("AIB-GEN-017 shows Regenerate with AI when AI is on, and a click starts a run", async () => {
    const ai = controller();
    const { user } = renderDetails(ai);
    await user.click(regenerate()!);
    expect(ai.start).toHaveBeenCalledTimes(1);
  });

  it("AIB-GEN-018 while running shows the step in a live region with Cancel and disables Regenerate; Cancel stops the run", async () => {
    const ai = controller({ phase: "running", step: "analyse" });
    const { user } = renderDetails(ai);
    expect(screen.getByRole("status")).toHaveTextContent("Analysing…");
    expect(regenerate()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(ai.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Stored summary")).toBeInTheDocument();
  });

  it("AIB-GEN-021 the automatic run on an empty summary says it is drafting one", () => {
    renderDetails(controller({ phase: "running", step: "retrieve" }), EMPTY_ROW);
    expect(screen.getByRole("status")).toHaveTextContent("No executive summary yet. Drafting one with AI…");
    expect(screen.getByRole("status")).toHaveTextContent("Reading records…");
  });

  it("AIB-GEN-012 while the breaker is open Regenerate is disabled with the unavailable tooltip", () => {
    renderDetails(controller({ ai: { enabled: true, available: false, reason: "breaker_open", auto_draft: true } }));
    expect(regenerate()).toBeDisabled();
    expect(regenerate()!.parentElement).toHaveAttribute("title", "AI is temporarily unavailable. Try again in a few minutes.");
  });

  it("AIB-GEN-004 a failed run shows the reason and short run ID with Try again; the stored summary stays", async () => {
    const ai = controller({ phase: "failed", runId: "run_abcdef123456", error: "Something went wrong while drafting" });
    const { user } = renderDetails(ai);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not draft the summary: Something went wrong while drafting (run abcdef)");
    expect(screen.getByText("Stored summary")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(ai.start).toHaveBeenCalledTimes(1);
  });

  it("AIB-HUMAN-009 a finished run shows the sanitised draft with its markers, the label and Save, Edit, Discard; no Regenerate", () => {
    renderDetails(controller({ phase: "succeeded", draft: { ...DRAFT, html: DRAFT.html + '<img src=x onerror="alert(1)">' } }));
    expect(screen.getByText("AI draft — not saved. Check it, then Save, Edit or Discard.")).toBeInTheDocument();
    expect(screen.getByText("Two live projects. [UC-1]")).toBeInTheDocument();
    expect(document.querySelector("img[onerror]")).toBeNull();
    for (const name of ["Save", "Edit", "Discard"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(regenerate()).toBeNull();
    expect(screen.queryByText("Stored summary")).toBeNull();
  });

  it("AIB-CITE-004 the citation markers are plain text in the draft and stay in the editor, where they can be deleted", async () => {
    const { user } = renderDetails(controller({ phase: "succeeded", draft: DRAFT }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const editor = screen.getByLabelText("Summary editor") as HTMLTextAreaElement;
    expect(editor.value).toContain("[UC-1]");
    await user.clear(editor);
    await user.type(editor, "Own text");
    expect(editor.value).not.toContain("[UC-1]");
  });

  it("AIB-HUMAN-012 an unverified draft shows the banner listing each failed check", () => {
    const issues = [{ type: "uncited", detail: "Wins, sentence 2: a factual statement has no citation." }];
    renderDetails(controller({ phase: "unverified", draft: { ...DRAFT, status: "unverified", issues } }));
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Unverified draft: check the points below before saving");
    expect(within(note).getByText(issues[0].detail)).toBeInTheDocument();
  });

  it("AIB-HUMAN-005 Save stores the draft HTML through the summary endpoint and drops the draft", async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 7, summary_last_modified: "2026-11-23T10:00:00" }));
    const ai = controller({ phase: "succeeded", draft: DRAFT });
    const { user, onSaved } = renderDetails(ai);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/workbook/customers/7/summary");
    expect(JSON.parse(String(init?.body))).toEqual({ executive_summary: DRAFT.html });
    expect(ai.discard).toHaveBeenCalled();
  });

  it("AIB-HUMAN-006 Edit, or Enter on the draft text, opens the editor with the draft under the AI label", async () => {
    const { user } = renderDetails(controller({ phase: "succeeded", draft: DRAFT }));
    screen.getByTitle("Click to edit").focus();
    await user.keyboard("{Enter}");
    expect((screen.getByLabelText("Summary editor") as HTMLTextAreaElement).value).toBe(DRAFT.html);
    expect(screen.getByText("AI draft — not saved. Check it, then Save or Cancel.")).toBeInTheDocument();
  });

  it("AIB-HUMAN-003 Cancel on the edited draft returns to the stored summary and writes nothing", async () => {
    // A controller that drops the draft on discard, as the hook does.
    function Stateful() {
      const [phase, setPhase] = useState<BriefController["phase"]>("succeeded");
      return <CustomerDetails row={ROW} ai={controller({ phase, draft: phase === "idle" ? undefined : DRAFT, discard: () => setPhase("idle") })} />;
    }
    render(
      <QueryClientProvider client={newClient()}>
        <Stateful />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Stored summary")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AIB-HUMAN-007 Discard drops the draft and writes nothing", async () => {
    const ai = controller({ phase: "succeeded", draft: DRAFT });
    const { user } = renderDetails(ai);
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(ai.discard).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AIB-GEN-015 opening the editor while a run is in progress cancels the run", async () => {
    const ai = controller({ phase: "running", step: "write" });
    const { user } = renderDetails(ai);
    await user.click(screen.getByText("Stored summary"));
    expect(ai.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Summary editor")).toBeInTheDocument();
  });

  it("AIB-GEN-011 Regenerate with unsaved edits asks first; Keep editing keeps them, Replace starts the run", async () => {
    const ai = controller();
    const { user } = renderDetails(ai);
    await user.click(screen.getByText("Stored summary"));
    await user.type(screen.getByLabelText("Summary editor"), " more");
    await user.click(regenerate()!);
    expect(screen.getByRole("alertdialog", { name: "Replace your unsaved changes with an AI draft?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(ai.start).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Summary editor")).toHaveValue("<p>Stored summary</p> more");
    await user.click(regenerate()!);
    await user.click(screen.getByRole("button", { name: "Replace" }));
    expect(ai.start).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------------------------------- hooks (AIB-T06, AIB-T10) */

type Props = { customerId: number | null; summaryEmpty: boolean; open: boolean };

/** The AI server as the hooks see it: status, start, run body, cancel. */
function aiServer(status: AiStatus = ON) {
  let n = 0;
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url === "/api/ai/status") return reply(200, status);
    if (url === "/api/ai/brief") return reply(202, { runId: `run_test${String(++n).padStart(8, "0")}` });
    if (url.endsWith("/cancel")) return reply(204);
    if (url.startsWith("/api/ai/runs/")) return reply(200, { runId: url.split("/")[4], status: "succeeded", step: "guard", draft: DRAFT });
    return reply(404, { error: `unexpected ${url} ${init?.method ?? "GET"}` });
  });
  const posts = (path: string) => fetchMock.mock.calls.filter(([u, i]) => String(u).endsWith(path) && i?.method === "POST");
  return { posts };
}

function renderAuto(initial: Props) {
  const client = newClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook((p: Props) => useAutoBrief(p.customerId, { summaryEmpty: p.summaryEmpty, open: p.open }), { initialProps: initial, wrapper });
}

describe("useAutoBrief", () => {
  it("AIB-API-004 the status fetcher treats any failure as AI off", async () => {
    fetchMock.mockResolvedValue(reply(404, { error: "x" }));
    expect(await getAiStatus()).toEqual(AI_OFF);
    fetchMock.mockRejectedValue(new TypeError("offline"));
    expect(await getAiStatus()).toEqual(AI_OFF);
  });

  it("AIB-GEN-021 starts one run when the dialog opens on a customer without a summary; reopening or discarding starts none", async () => {
    const { posts } = aiServer();
    const { result, rerender } = renderAuto({ customerId: 7, summaryEmpty: true, open: true });
    await waitFor(() => expect(posts("/api/ai/brief")).toHaveLength(1));
    await waitFor(() => expect(FakeEventSource.all).toHaveLength(1));
    act(() => FakeEventSource.all[0].emit({ step: "write", revision: 0, status: "running" }));
    expect(result.current).toMatchObject({ phase: "running", step: "write", running: true });
    act(() => FakeEventSource.all[0].emit({ status: "succeeded" }));
    await waitFor(() => expect(result.current.draftReady).toBe(true));
    expect(result.current.draft).toEqual(DRAFT);

    rerender({ customerId: 7, summaryEmpty: true, open: false });
    rerender({ customerId: 7, summaryEmpty: true, open: true });
    act(() => result.current.discard());
    rerender({ customerId: 7, summaryEmpty: true, open: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(posts("/api/ai/brief")).toHaveLength(1);
  });

  it("AIB-GEN-021 no automatic run for a customer with a saved summary", async () => {
    const { posts } = aiServer();
    const { result } = renderAuto({ customerId: 7, summaryEmpty: false, open: true });
    await waitFor(() => expect(result.current.ai.enabled).toBe(true));
    expect(posts("/api/ai/brief")).toHaveLength(0);
  });

  it("AIB-GEN-022 with auto_draft false no automatic run starts, but start() still does", async () => {
    const { posts } = aiServer({ ...ON, auto_draft: false });
    const { result } = renderAuto({ customerId: 7, summaryEmpty: true, open: true });
    await waitFor(() => expect(result.current.ai.enabled).toBe(true));
    await new Promise((r) => setTimeout(r, 20));
    expect(posts("/api/ai/brief")).toHaveLength(0);
    await act(() => result.current.start());
    expect(posts("/api/ai/brief")).toHaveLength(1);
  });

  it("AIB-HUMAN-010 closing the dialog keeps the run: no cancel, the stream stays open", async () => {
    const { posts } = aiServer();
    const { result, rerender } = renderAuto({ customerId: 7, summaryEmpty: true, open: true });
    await waitFor(() => expect(FakeEventSource.all).toHaveLength(1));
    rerender({ customerId: 7, summaryEmpty: true, open: false });
    expect(FakeEventSource.all[0].closed).toBe(false);
    expect(posts("/cancel")).toHaveLength(0);
    expect(result.current.running).toBe(true);
  });

  it("AIB-GEN-008 a customer change or a cleared selection cancels the unfinished run and shows nothing of it", async () => {
    const { posts } = aiServer();
    const { result, rerender } = renderAuto({ customerId: 7, summaryEmpty: false, open: true });
    await waitFor(() => expect(result.current.ai.enabled).toBe(true));
    await act(() => result.current.start());
    await waitFor(() => expect(FakeEventSource.all).toHaveLength(1));
    rerender({ customerId: 8, summaryEmpty: false, open: true });
    expect(result.current.phase).toBe("idle");
    expect(FakeEventSource.all[0].closed).toBe(true);
    await waitFor(() => expect(posts("/cancel")).toHaveLength(1));
    expect(String(posts("/cancel")[0][0])).toContain("run_test00000001");

    await act(() => result.current.start());
    await waitFor(() => expect(FakeEventSource.all).toHaveLength(2));
    rerender({ customerId: null, summaryEmpty: true, open: false });
    await waitFor(() => expect(posts("/cancel")).toHaveLength(2));
  });

  it("AIB-GEN-004 a run that fails comes back with the server's catalog reason", async () => {
    aiServer();
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) =>
      String(input).startsWith("/api/ai/runs/") && !String(input).endsWith("/cancel")
        ? reply(200, { runId: "run_test00000001", status: "failed", error: "AI is unavailable right now" })
        : base(input, init),
    );
    const { result } = renderAuto({ customerId: 7, summaryEmpty: true, open: true });
    await waitFor(() => expect(FakeEventSource.all).toHaveLength(1));
    act(() => FakeEventSource.all[0].emit({ status: "failed" }));
    await waitFor(() => expect(result.current.phase).toBe("failed"));
    expect(result.current).toMatchObject({ error: "AI is unavailable right now", runId: "run_test00000001" });
  });
});
