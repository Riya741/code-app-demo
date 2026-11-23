// Workspace layout and the summary dialog on the page (spec 002-workspace-layout LAY-PANEL-004, -007, -008 and LAY-DLG-001,
// -002, -006, -010, -014). Tasks LAY-T08, LAY-T09, LAY-T11 (CR-20261120-2). jsdom has no layout engine, so the layout tests
// check the structure the layout is built from (order, nesting, which element is a panel group) and the dialog tests check
// behaviour; pixel sizes, centring, the sheet and both themes are the manual G5 check recorded in spec/handoffs/LAY-T11.md
// and LAY-T09.md. The dialog's own rules (focus, close, discard, save) are in SummaryDialog.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Customers from "@/pages/Customers";

// Records the props every resizable group is rendered with; the real group still renders.
const groupProps: { direction?: string; autoSaveId?: string | null }[] = [];
vi.mock("@/components/ui/resizable", async (importActual) => {
  const actual = await importActual<typeof import("@/components/ui/resizable")>();
  return {
    ...actual,
    ResizablePanelGroup: (props: React.ComponentProps<typeof actual.ResizablePanelGroup>) => {
      groupProps.push({ direction: props.direction, autoSaveId: props.autoSaveId });
      return <actual.ResizablePanelGroup {...props} />;
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/wordDoc", () => ({ downloadWordDoc: vi.fn() }));
// The real editor is lazy-loaded Quill, which needs browser layout; a textarea with the same props stands in.
vi.mock("@/components/customers/RichTextEditor", () => ({
  RichTextEditor: ({ html, onChange }: { html: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Summary editor" value={html} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// The search box and the two grids have their own tests and need their own data; stand-ins keep this test on the layout.
// Both variants of the search box (the hero on the landing page, the bar in the top bar) get a wrapper to tell them apart.
vi.mock("@/components/customers/SearchBox", () => ({
  SearchBox: ({
    rows,
    onSelect,
    variant,
  }: {
    rows: Record<string, unknown>[];
    onSelect: (row: Record<string, unknown>) => void;
    variant: string;
  }) => (
    <div data-testid={`search-${variant}`}>
      {rows.map((r) => (
        <button key={String(r.id)} type="button" onClick={() => onSelect(r)}>
          Pick {String(r.parent_name)}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("@/components/customers/ParentActivity", () => ({
  UseCasesPanel: ({ className }: { className?: string }) => (
    <section aria-label="Use Cases panel" className={className}>
      <h2>Use Cases</h2>
    </section>
  ),
  EventsPanel: ({ className }: { className?: string }) => (
    <section aria-label="Events panel" className={className}>
      <h2>Events</h2>
    </section>
  ),
}));

const ROWS = [
  { id: 7, parent_id: 1007, parent_name: "Northwind Demo", executive_summary: "<p>Northwind summary</p>", summary_last_modified: "2026-10-16T15:42:00", visible: true },
  { id: 8, parent_id: 1008, parent_name: "Contoso Demo", executive_summary: "<p>Contoso summary</p>", summary_last_modified: "2026-10-17T10:00:00", visible: true },
];
/** The same customers after Northwind's summary was changed elsewhere (a refetch brings back a new row object). */
const CHANGED_ROWS = [
  { ...ROWS[0], executive_summary: "<p>Northwind updated</p>", summary_last_modified: "2026-11-18T08:00:00" },
  ROWS[1],
];

const reply = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
    json: async () => body,
  }) as unknown as Response;

/** What the workbook API answers: the customer table (`serverRows`) and the summary save. */
const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
let serverRows: Record<string, unknown>[];

/** `window.matchMedia` for the page's single query, "(min-width: 1024px)". */
function stubViewport(desktop: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
}

/** Renders the page with the customer list already in the query cache (never stale, so nothing is fetched) and opens one. */
async function openCustomer(name = "Northwind Demo") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(["customers"], { rows: ROWS });
  render(
    <QueryClientProvider client={client}>
      <Customers />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `Pick ${name}` }));
  return { user, client };
}

// The dialog hides the page behind it from assistive technology, so the workspace is queried with `hidden: true`.
const useCases = () => screen.getByRole("region", { name: "Use Cases panel", hidden: true });
const events = () => screen.getByRole("region", { name: "Events panel", hidden: true });
const summaryDialog = () => screen.getByRole("dialog", { name: "Executive Summary" });
const noDialog = () => expect(screen.queryByRole("dialog")).toBeNull();
const reopenButton = () => screen.getByRole("button", { name: "Executive summary" });
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

/**
 * Types at the end of the editor without clicking it. The panel library hit-tests pointer events by coordinates and jsdom
 * reports every box at (0, 0), so on the desktop layout it takes a click for a grab of the divider and swallows it
 * (a browser knows the dialog is above the divider and ignores it); the text would never reach the editor.
 */
async function typeAtEnd(user: ReturnType<typeof userEvent.setup>, editor: HTMLElement, text: string) {
  const area = editor as HTMLTextAreaElement;
  area.focus();
  area.setSelectionRange(area.value.length, area.value.length);
  await user.type(area, text, { skipClick: true });
}

/** Puts new rows in the query cache, as a refetch does, and lets react-query's batched notification reach the page. */
async function refetchWith(client: QueryClient, rows: Record<string, unknown>[]) {
  await act(async () => {
    client.setQueryData(["customers"], { rows });
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

async function closeSummary(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard("{Escape}");
  await waitFor(noDialog);
}

beforeEach(() => {
  localStorage.clear();
  serverRows = CHANGED_ROWS;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (input, init) => {
    if (init?.method === "POST") return reply(200, { id: 7, summary_last_modified: "2026-11-18T08:00:00" });
    if (String(input).includes("/table/customer")) return reply(200, serverRows);
    return reply(404, { error: `unexpected request ${input}` });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("Customers page at 1024px and wider", () => {
  beforeEach(() => stubViewport(true));

  it("LAY-PANEL-007 shows only Use Cases over Events: no band, no summary panel, no horizontal split, no collapse control", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    expect(follows(useCases(), events())).toBe(true);
    expect(document.querySelectorAll('[data-panel-group-direction="horizontal"]')).toHaveLength(0);
    const groups = document.querySelectorAll("[data-panel-group]");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveAttribute("data-panel-group-direction", "vertical");
    // The old layout put the summary in a resizable "summary" panel beside the grids; the band put it above them.
    expect(document.querySelector('[data-panel-id="summary"]')).toBeNull();
    expect(document.querySelector('[data-panel-id="left"]')).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Executive Summary" })).toBeNull();
    expect(screen.queryByText("Northwind summary")).toBeNull();
    expect(screen.queryByRole("button", { name: /(Collapse|Expand) executive summary/ })).toBeNull();
    // Nothing but the two panels is in the workspace.
    expect(document.querySelectorAll("main section")).toHaveLength(2);
  });

  it("LAY-PANEL-007 splits Use Cases over Events in one vertical group of two panels at 60% and 40%", async () => {
    await openCustomer();

    const group = document.querySelector("[data-panel-group]") as HTMLElement;
    const panels = Array.from(group.querySelectorAll("[data-panel]"));
    expect(panels.map((p) => p.getAttribute("data-panel-id"))).toEqual(["usecases", "events"]);
    expect(panels[0]).toContainElement(useCases());
    expect(panels[1]).toContainElement(events());
    expect(panels[0].getAttribute("data-panel-size")).toBe("60.0");
    expect(panels[1].getAttribute("data-panel-size")).toBe("40.0");
    expect(group.querySelectorAll("[data-resize-handle]")).toHaveLength(1);
  });

  // In jsdom react-resizable-panels loads its server build, which never computes or saves a layout, so a saved size
  // cannot be read back here. What the page controls is the autoSaveId it hands to each group; saving on drag and the
  // restore after a reload are the library's and are checked by hand (G5).
  it("LAY-PANEL-004 gives the vertical Use Cases / Events group the autoSaveId terra-split-v-v1 and renders no other group", async () => {
    groupProps.length = 0;

    await openCustomer();

    expect(groupProps.length).toBeGreaterThan(0);
    expect(new Set(groupProps.map((p) => `${p.direction}:${p.autoSaveId}`))).toEqual(new Set(["vertical:terra-split-v-v1"]));
  });
});

describe("Customers page below 1024px", () => {
  beforeEach(() => stubViewport(false));

  it("LAY-PANEL-008 stacks Use Cases, then Events, with no resizable group and no summary in the stack", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    const stack = useCases().parentElement as HTMLElement;
    expect(Array.from(stack.children)).toEqual([useCases(), events()]);
    expect(document.querySelectorAll("[data-panel-group]")).toHaveLength(0);
    expect(within(stack).queryByRole("heading", { level: 2, name: "Executive Summary" })).toBeNull();
    expect(screen.queryByText("Northwind summary")).toBeNull();
  });

  it("LAY-PANEL-008 limits each stacked panel to 60vh", async () => {
    await openCustomer();

    expect(useCases()).toHaveClass("max-h-[60vh]");
    expect(events()).toHaveClass("max-h-[60vh]");
  });

  it("LAY-DLG-001 opens the summary dialog on selection when the screen is narrow too", async () => {
    await openCustomer();

    expect(summaryDialog()).toBeInTheDocument();
    expect(within(summaryDialog()).getByText("Northwind summary")).toBeInTheDocument();
  });
});

describe("Executive Summary dialog on the page", () => {
  beforeEach(() => stubViewport(true));

  it("LAY-DLG-001 opens the summary dialog when a customer is chosen, with AI off, and shows no dialog on the landing page", async () => {
    render(
      <QueryClientProvider client={(() => {
        const c = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
        c.setQueryData(["customers"], { rows: ROWS });
        return c;
      })()}>
        <Customers />
      </QueryClientProvider>,
    );
    noDialog();

    await userEvent.setup().click(within(screen.getByTestId("search-hero")).getByRole("button", { name: "Pick Northwind Demo" }));

    expect(summaryDialog()).toBeInTheDocument();
    expect(within(summaryDialog()).getByText("Northwind summary")).toBeInTheDocument();
    expect(within(summaryDialog()).getByText(/^Last modified: Oct 16, 2026, 3:42\sPM UTC$/)).toBeInTheDocument();
  });

  it("LAY-DLG-001 opens the dialog again when a customer is chosen in the top-bar search box", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    await user.click(within(screen.getByTestId("search-bar")).getByRole("button", { name: "Pick Contoso Demo" }));

    expect(within(summaryDialog()).getByText("Contoso summary")).toBeInTheDocument();
  });

  it("LAY-DLG-002 does not reopen a closed dialog when the customer list is refetched with a changed row", async () => {
    const { user, client } = await openCustomer();
    await closeSummary(user);

    await refetchWith(client, CHANGED_ROWS);

    noDialog();
    // The page did take the new row: reopening shows the new text.
    await user.click(reopenButton());
    expect(within(summaryDialog()).getByText("Northwind updated")).toBeInTheDocument();
  });

  it("LAY-DLG-002 neither closes nor resets the open dialog, or its editor and draft, when the row is refetched", async () => {
    const { user, client } = await openCustomer();
    const before = summaryDialog();
    await user.click(within(before).getByText("Northwind summary"));
    const editor = await screen.findByLabelText("Summary editor");
    await typeAtEnd(user, editor, " draft");
    expect(editor).toHaveValue("<p>Northwind summary</p> draft");

    await refetchWith(client, CHANGED_ROWS);

    expect(summaryDialog()).toBe(before);
    expect(screen.getByLabelText("Summary editor")).toBe(editor);
    expect(editor).toHaveValue("<p>Northwind summary</p> draft");
  });

  it("LAY-DLG-002 does not reopen a closed dialog after Refresh brings back a changed row", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    await user.click(screen.getByRole("button", { name: "Refresh data" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector("svg.animate-spin")).toBeNull());

    noDialog();
    await user.click(reopenButton());
    expect(within(summaryDialog()).getByText("Northwind updated")).toBeInTheDocument();
  });

  it("LAY-DLG-002 closes after a save, shows the stored summary when reopened, and does not pop open again when the data arrives", async () => {
    const { user, client } = await openCustomer();
    await user.click(within(summaryDialog()).getByText("Northwind summary"));
    const editor = await screen.findByLabelText("Summary editor");
    await user.clear(editor);
    await user.type(editor, "<p>Northwind updated</p>");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(noDialog);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    noDialog();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post?.[0]).toBe("/api/workbook/customers/7/summary");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ executive_summary: "<p>Northwind updated</p>" });
    await user.click(reopenButton());
    expect(within(summaryDialog()).getByText("Northwind updated")).toBeInTheDocument();
    expect(within(summaryDialog()).getByText(/^Last modified: Nov 18, 2026, 8:00\sAM UTC$/)).toBeInTheDocument();
  });

  it("LAY-DLG-014 opens the dialog for the new customer when another customer is chosen after closing it", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    await user.click(within(screen.getByTestId("search-bar")).getByRole("button", { name: "Pick Contoso Demo" }));

    const d = summaryDialog();
    expect(within(d).getByText("Contoso summary")).toBeInTheDocument();
    expect(within(d).queryByText("Northwind summary")).toBeNull();
  });

  it("LAY-DLG-014 drops the editor and its draft without a confirmation when the customer changes while the dialog is open", async () => {
    const { user } = await openCustomer();
    await user.click(within(summaryDialog()).getByText("Northwind summary"));
    const editor = await screen.findByLabelText("Summary editor");
    await typeAtEnd(user, editor, " unsaved");
    expect(editor).toHaveValue("<p>Northwind summary</p> unsaved");

    // The page behind the dialog is inert for a person, so the change is made without a pointer.
    fireEvent.click(screen.getByRole("button", { name: "Pick Contoso Demo", hidden: true }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    const d = summaryDialog();
    expect(within(d).getByText("Contoso summary")).toBeInTheDocument();
    expect(within(d).getByTitle("Click to edit")).toBeInTheDocument();
  });

  it("LAY-DLG-014 closes the dialog and shows the landing page when the selection is cleared", async () => {
    await openCustomer();

    // Not a pointer click: the top bar is inert while the dialog is open.
    fireEvent.click(screen.getByRole("button", { name: "Clear selected customer", hidden: true }));

    noDialog();
    expect(screen.getByTestId("search-hero")).toBeInTheDocument();
    expect(screen.queryByText("Northwind summary")).toBeNull();
  });

  it("LAY-DLG-014 opens the dialog again when the same customer is chosen again after being cleared", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);
    await user.click(screen.getByRole("button", { name: "Clear selected customer" }));

    await user.click(within(screen.getByTestId("search-hero")).getByRole("button", { name: "Pick Northwind Demo" }));

    expect(within(summaryDialog()).getByText("Northwind summary")).toBeInTheDocument();
  });
});

describe("Executive summary button in the top bar", () => {
  beforeEach(() => stubViewport(true));

  it("LAY-DLG-010 shows the button only while a customer is selected", async () => {
    render(
      <QueryClientProvider client={(() => {
        const c = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
        c.setQueryData(["customers"], { rows: ROWS });
        return c;
      })()}>
        <Customers />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Executive summary" })).toBeNull();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Pick Northwind Demo" }));
    await closeSummary(user);
    expect(reopenButton()).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear selected customer" }));
    expect(screen.queryByRole("button", { name: "Executive summary" })).toBeNull();
  });

  it("LAY-DLG-010 names the button Executive summary at every width and shows its label only from 640px", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    const button = reopenButton();
    expect(button).toHaveAttribute("aria-label", "Executive summary");
    const label = within(button).getByText("Executive summary");
    expect(label).toHaveClass("hidden", "sm:inline");
    const icon = button.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).not.toHaveClass("hidden");
  });

  it("LAY-DLG-010 reopens the dialog on click, and Enter and Space also operate it", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    await user.click(reopenButton());
    expect(summaryDialog()).toBeInTheDocument();
    await closeSummary(user);

    reopenButton().focus();
    await user.keyboard("{Enter}");
    expect(summaryDialog()).toBeInTheDocument();
    await closeSummary(user);

    reopenButton().focus();
    await user.keyboard(" ");
    expect(summaryDialog()).toBeInTheDocument();
  });

  it("LAY-DLG-006 returns the focus to the top-bar button when the automatically opened dialog is closed", async () => {
    const { user } = await openCustomer();
    expect(summaryDialog()).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });

  it("LAY-DLG-010 puts the button next to the customer chip in the top bar", async () => {
    const { user } = await openCustomer();
    await closeSummary(user);

    const header = reopenButton().closest("header") as HTMLElement;
    expect(header).toContainElement(screen.getByText("Northwind Demo"));
    expect(follows(screen.getByText("Northwind Demo"), reopenButton())).toBe(true);
    expect(follows(reopenButton(), screen.getByTestId("search-bar"))).toBe(true);
  });
});

/* ------------------------------------------------------------------------------------------- AI brief on the page */
// Spec 022-ai-account-brief AIB-HUMAN-011, AIB-GEN-020, AIB-HUMAN-010 (tasks AIB-T07, AIB-T10, AIB-T09). The AI routes are
// answered by `fetch`, the progress stream by a stand-in EventSource.
describe("AI brief on the page", () => {
  const streams: { onmessage: ((e: { data: string }) => void) | null; closed: boolean }[] = [];
  const DRAFT = { run_id: "run_page00000001", customer_id: 7, status: "verified", html: "<p>Drafted text [CU-7]</p>", citations: ["CU-7"], issues: [], word_count: 2 };

  beforeEach(() => {
    stubViewport(true);
    streams.length = 0;
    vi.stubGlobal(
      "EventSource",
      class {
        onmessage: ((e: { data: string }) => void) | null = null;
        onerror: (() => void) | null = null;
        closed = false;
        constructor() {
          streams.push(this);
        }
        close() {
          this.closed = true;
        }
      },
    );
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/ai/status") return reply(200, { enabled: true, available: true, auto_draft: true });
      if (url === "/api/ai/brief") return reply(202, { runId: "run_page00000001" });
      if (url.startsWith("/api/ai/runs/")) return reply(200, { runId: "run_page00000001", status: "succeeded", draft: DRAFT });
      if (init?.method === "POST") return reply(200, { id: 7, summary_last_modified: "2026-11-18T08:00:00" });
      if (url.includes("/table/customer")) return reply(200, serverRows);
      return reply(404, { error: `unexpected request ${url}` });
    });
  });

  it("AIB-HUMAN-011 the reopen button shows the run and then the waiting draft, announced politely, without moving the focus", async () => {
    const { user } = await openCustomer();
    await user.click(await within(summaryDialog()).findByRole("button", { name: /Regenerate with AI/ }));
    await waitFor(() => expect(streams).toHaveLength(1));
    await closeSummary(user);

    expect(reopenButton()).toHaveAttribute("title", "AI is drafting the summary…");
    expect(reopenButton()).toHaveAccessibleDescription("AI is drafting the summary…");
    const focused = document.activeElement;
    act(() => streams[0].onmessage?.({ data: JSON.stringify({ status: "succeeded" }) }));

    await waitFor(() => expect(reopenButton()).toHaveAccessibleDescription("AI draft ready — not saved"));
    expect(screen.getByTestId("ai-draft-badge")).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("AI draft ready — not saved");
    expect(document.activeElement).toBe(focused);
  });

  it("AIB-GEN-020 a run that finishes while the dialog is closed does not reopen it; the grids stay usable", async () => {
    const { user } = await openCustomer();
    await user.click(await within(summaryDialog()).findByRole("button", { name: /Regenerate with AI/ }));
    await waitFor(() => expect(streams).toHaveLength(1));
    await closeSummary(user);
    expect(screen.getByRole("region", { name: "Use Cases panel" })).toBeInTheDocument();
    act(() => streams[0].onmessage?.({ data: JSON.stringify({ status: "succeeded" }) }));
    await waitFor(() => expect(screen.getByTestId("ai-draft-badge")).toBeInTheDocument());
    noDialog();
    expect(screen.getByRole("region", { name: "Events panel" })).toBeInTheDocument();
  });

  it("AIB-HUMAN-010 reopening the dialog after closing it mid-run shows the waiting draft", async () => {
    const { user } = await openCustomer();
    await user.click(await within(summaryDialog()).findByRole("button", { name: /Regenerate with AI/ }));
    await waitFor(() => expect(streams).toHaveLength(1));
    await closeSummary(user);
    expect(streams[0].closed).toBe(false);
    act(() => streams[0].onmessage?.({ data: JSON.stringify({ status: "succeeded" }) }));
    await waitFor(() => expect(screen.getByTestId("ai-draft-badge")).toBeInTheDocument());
    await user.click(reopenButton());
    expect(within(summaryDialog()).getByText("Drafted text [CU-7]")).toBeInTheDocument();
    expect(within(summaryDialog()).getByText("AI draft — not saved. Check it, then Save, Edit or Discard.")).toBeInTheDocument();
  });
});
