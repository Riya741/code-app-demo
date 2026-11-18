// Executive summary panel: save and cancel (spec 003-executive-summary SUM-EDIT-001, SUM-EDIT-004..006, SUM-VIEW-004).
// Task SUM-T11. The server side of SUM-EDIT-001 (POST /customers/:id/summary) is covered by
// tests/integration/summary.test.ts (API-T09); here `fetch` is stubbed at the network boundary, so the real
// component → useSaveSummary → saveSummary → workbookApi chain runs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomerDetails } from "@/components/customers/CustomerDetails";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The real editor is lazy-loaded Quill, which needs browser layout and selection APIs that jsdom does not provide.
// A plain textarea stands in for it; it keeps the same props (html, onChange).
vi.mock("@/components/customers/RichTextEditor", () => ({
  RichTextEditor: ({ html, onChange }: { html: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Summary editor" value={html} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// `id` (customer sheet id) differs from `parent_id` so the test proves which one is sent.
const ROW = {
  id: 7,
  parent_id: 1007,
  parent_name: "Northwind Demo",
  executive_summary: "<p>Old summary</p>",
  summary_last_modified: "2026-10-16T15:42:00",
};
const NEW_HTML = "<p>Renewal on track</p>";

/** The shape of a fetch Response that workbookApi reads: ok, status, content-type and a JSON body. */
const reply = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
    json: async () => body,
  }) as unknown as Response;

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  vi.mocked(toast.success).mockClear();
});

function setup(row: Record<string, unknown> = ROW) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const ui = (r: Record<string, unknown>) => (
    <QueryClientProvider client={client}>
      <CustomerDetails row={r} />
    </QueryClientProvider>
  );
  const { rerender } = render(ui(row));
  return { user: userEvent.setup(), invalidate, rerender: (r: Record<string, unknown>) => rerender(ui(r)) };
}

/** Opens the editor by clicking the summary, replaces the text and returns the editor. */
async function editTo(user: ReturnType<typeof userEvent.setup>, html: string) {
  await user.click(screen.getByTitle("Click to edit"));
  const editor = await screen.findByLabelText("Summary editor");
  await user.clear(editor);
  await user.type(editor, html);
  return editor;
}

const saveButton = () => screen.getByRole("button", { name: "Save" });
const cancelButton = () => screen.getByRole("button", { name: "Cancel" });

describe("CustomerDetails save and cancel", () => {
  it("SUM-EDIT-001 posts { executive_summary } for the customer's sheet id when Save is clicked", async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 7, summary_last_modified: "2026-11-17T09:30:00" }));
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/workbook/customers/7/summary");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ executive_summary: NEW_HTML });
  });

  it("SUM-EDIT-001 refreshes the customer data after a successful save", async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 7, summary_last_modified: "2026-11-17T09:30:00" }));
    const { user, invalidate } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customers"] }));
  });

  it("SUM-EDIT-001 shows the stored summary and new Last modified from the refreshed row, with no on-screen-only copy", async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 7, summary_last_modified: "2026-11-17T09:30:00" }));
    const { user, rerender } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());
    await waitFor(() => expect(screen.queryByLabelText("Summary editor")).toBeNull());

    // Until the refreshed row arrives the panel shows the row it was given: the draft is not kept on screen.
    expect(screen.getByText("Old summary")).toBeInTheDocument();
    expect(screen.queryByText(/on screen only/i)).toBeNull();

    rerender({ ...ROW, executive_summary: NEW_HTML, summary_last_modified: "2026-11-17T09:30:00" });
    expect(screen.getByText("Renewal on track")).toBeInTheDocument();
    expect(screen.getByText(/^Last modified: Nov 17, 2026, 9:30\sAM UTC$/)).toBeInTheDocument();
  });

  it("SUM-EDIT-005 shows the toast Executive summary updated and closes the editor when the save succeeds", async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 7, summary_last_modified: "2026-11-17T09:30:00" }));
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Executive summary updated"));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("SUM-EDIT-005 keeps the editor open with the draft and shows Could not save: <message> when the save fails", async () => {
    fetchMock.mockResolvedValue(reply(423, { error: "code-app-data.xlsx is open in Excel. Close it and try again." }));
    const { user, invalidate } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save: code-app-data.xlsx is open in Excel. Close it and try again.",
    );
    expect(screen.getByLabelText("Summary editor")).toHaveValue(NEW_HTML);
    expect(saveButton()).toBeEnabled();
    expect(cancelButton()).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("SUM-EDIT-005 shows Could not save: <message> when the workbook service cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save: Could not reach the workbook service. Start the app with `npm run dev`.",
    );
    expect(screen.getByLabelText("Summary editor")).toHaveValue(NEW_HTML);
  });

  it("SUM-EDIT-005 saves the kept draft on retry and clears the error message", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(423, { error: "code-app-data.xlsx is open in Excel. Close it and try again." }))
      .mockResolvedValueOnce(reply(200, { id: 7, summary_last_modified: "2026-11-17T09:30:00" }));
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await user.click(saveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Executive summary updated"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ executive_summary: NEW_HTML });
  });

  it("SUM-EDIT-005 does not show an old error when the editor is opened again after Cancel", async () => {
    fetchMock.mockResolvedValue(reply(423, { error: "code-app-data.xlsx is open in Excel. Close it and try again." }));
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await user.click(cancelButton());
    await user.click(screen.getByTitle("Click to edit"));

    expect(await screen.findByLabelText("Summary editor")).toHaveValue("<p>Old summary</p>");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("SUM-EDIT-006 disables Save and Cancel and shows a spinner while the save is in progress", async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(saveButton());

    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(cancelButton()).toBeDisabled();
    expect(saveButton().querySelector("svg.animate-spin")).not.toBeNull();

    // Clicking the disabled buttons while pending neither closes the editor nor sends a second request.
    await user.click(cancelButton());
    await user.click(saveButton());
    expect(screen.getByLabelText("Summary editor")).toHaveValue(NEW_HTML);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(reply(200, { id: 7, summary_last_modified: "2026-11-17T09:30:00" }));
    await waitFor(() => expect(screen.queryByLabelText("Summary editor")).toBeNull());
  });

  it("SUM-EDIT-006 leaves Save and Cancel enabled with no spinner when nothing is saving", async () => {
    const { user } = setup();

    await editTo(user, NEW_HTML);

    expect(saveButton()).toBeEnabled();
    expect(cancelButton()).toBeEnabled();
    expect(saveButton().querySelector("svg.animate-spin")).toBeNull();
  });

  it("SUM-EDIT-004 Cancel discards the draft and posts nothing", async () => {
    const { user } = setup();

    await editTo(user, NEW_HTML);
    await user.click(cancelButton());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    expect(screen.getByText("Old summary")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("SUM-VIEW-004 shows Last modified in UTC in the header, reading the zone-less value as UTC", () => {
    setup();

    expect(screen.getByText(/^Last modified: Oct 16, 2026, 3:42\sPM UTC$/)).toBeInTheDocument();
  });
});
