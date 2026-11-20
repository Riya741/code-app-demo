// The Executive Summary dialog (spec 002-workspace-layout LAY-DLG-003..009; tasks LAY-T11, LAY-T12, CR-20261120-2).
// The dialog, the real CustomerDetails and the Radix dialogs run for real; `fetch` is stubbed at the network boundary,
// the rich text editor is a textarea (Quill needs browser layout) and the toaster is a spy. Size, centring, the sheet and
// both themes are layout and are the manual G5 check; jsdom has no layout engine.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { SummaryDialog } from "@/components/customers/SummaryDialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/wordDoc", () => ({ downloadWordDoc: vi.fn() }));
vi.mock("@/components/customers/RichTextEditor", () => ({
  RichTextEditor: ({ html, onChange }: { html: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Summary editor" value={html} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ROW = {
  id: 7,
  parent_id: 1007,
  parent_name: "Northwind Demo",
  executive_summary: "<p>Old summary</p>",
  summary_last_modified: "2026-10-16T15:42:00",
};
const NEW_HTML = "<p>Renewal on track</p>";
const SAVED = { id: 7, summary_last_modified: "2026-11-17T09:30:00" };
const LOCKED = { error: "code-app-data.xlsx is open in Excel. Close it and try again." };

const reply = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
    json: async () => body,
  }) as unknown as Response;

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
/** Every value `onOpenChange` was called with, in order, with the `toast.success` call count at that moment. */
let openChanges: { open: boolean; toasts: number }[];

beforeEach(() => {
  openChanges = [];
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  vi.mocked(toast.success).mockClear();
});

/** What Customers.tsx does around the dialog: it owns `open` and the reopen button, whose ref the dialog returns focus to. */
function Host({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const reopen = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={reopen} type="button" onClick={() => setOpen(true)}>
        Executive summary
      </button>
      <SummaryDialog
        row={ROW}
        open={open}
        onOpenChange={(o) => {
          openChanges.push({ open: o, toasts: vi.mocked(toast.success).mock.calls.length });
          setOpen(o);
        }}
        returnFocusRef={reopen}
      />
    </>
  );
}

function setup(initialOpen = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Host initialOpen={initialOpen} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
}

type User = ReturnType<typeof userEvent.setup>;
const dialog = () => screen.getByRole("dialog", { name: "Executive Summary" });
/** While the confirmation is open the dialog behind it is hidden from assistive technology (and so is its name). */
const dialogBehind = () => screen.getByRole("dialog", { hidden: true });
const gone = () => expect(screen.queryByRole("dialog")).toBeNull();
const overlay = () => document.querySelector('div[data-state="open"][class*="bg-black"]') as HTMLElement;
const closeButton = () => screen.getByRole("button", { name: "Close" });
const reopenButton = () => screen.getByRole("button", { name: "Executive summary" });
const confirm = () => screen.getByRole("alertdialog", { name: "Discard your unsaved summary changes?" });

/** Opens the editor by clicking the summary text and replaces the text; returns the editor. */
async function editTo(user: User, html: string) {
  await user.click(screen.getByTitle("Click to edit"));
  const editor = await screen.findByLabelText("Summary editor");
  await user.clear(editor);
  await user.type(editor, html);
  return editor;
}

describe("SummaryDialog as a modal dialog", () => {
  it("LAY-DLG-003 is a modal dialog named Executive Summary by its single visible title, with the page behind it hidden", () => {
    setup();

    const d = dialog();
    const headings = screen.getAllByRole("heading", { name: "Executive Summary" });
    expect(headings).toHaveLength(1);
    expect(d).toHaveAttribute("aria-labelledby", headings[0].id);
    expect(headings[0].id).not.toBe("");
    expect(d).toContainElement(headings[0]);
    expect(headings[0]).toBeVisible();
    expect(overlay()).toBeInTheDocument();
    // Modal: everything outside the dialog is hidden from assistive technology (the reopen button is outside it).
    expect(screen.queryByRole("button", { name: "Executive summary" })).toBeNull();
    expect(screen.getByRole("button", { name: "Executive summary", hidden: true })).toBeInTheDocument();
  });

  it("LAY-DLG-003 logs no Radix title or description warning", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setup();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    error.mockRestore();
    warn.mockRestore();
  });

  it("LAY-DLG-003 mounts its content only while open and shows the summary, Last modified and Export", async () => {
    const { user } = setup(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Old summary")).toBeNull();

    await user.click(reopenButton());

    expect(dialog()).toBeInTheDocument();
    expect(screen.getByText("Old summary")).toBeInTheDocument();
    expect(screen.getByText(/^Last modified: /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument();
  });

  it("LAY-DLG-004 puts the focus on the dialog itself, not in the editor, and Enter does not start editing", async () => {
    const { user } = setup();

    expect(dialog()).toHaveFocus();
    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    expect(document.activeElement?.tagName).not.toBe("TEXTAREA");

    await user.keyboard("{Enter}");

    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    expect(screen.getByText("Old summary")).toBeInTheDocument();
  });

  it("LAY-DLG-004 keeps Tab and Shift+Tab inside the dialog", async () => {
    const { user } = setup();
    const outside = screen.getByRole("button", { name: "Executive summary", hidden: true });

    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog().contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(outside);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog().contains(document.activeElement)).toBe(true);
    }
  });

  it("LAY-DLG-005 closes on Esc, and the content is gone", async () => {
    const { user } = setup();

    await user.keyboard("{Escape}");

    gone();
    expect(screen.queryByText("Old summary")).toBeNull();
    expect(reopenButton()).toBeEnabled();
  });

  it("LAY-DLG-005 closes with the Close button", async () => {
    const { user } = setup();

    await user.click(closeButton());

    gone();
  });

  it("LAY-DLG-005 closes when the overlay is clicked", async () => {
    const { user } = setup();

    await user.click(overlay());

    gone();
  });

  it("LAY-DLG-005 does not close when a click lands inside the dialog", async () => {
    const { user } = setup();

    await user.click(screen.getByText("Old summary"));
    await screen.findByLabelText("Summary editor");
    await user.click(dialog());

    expect(dialog()).toBeInTheDocument();
  });

  it("LAY-DLG-006 moves the focus to the reopen button after Esc, although the dialog was opened automatically", async () => {
    const { user } = setup();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });

  it("LAY-DLG-006 moves the focus to the reopen button after the Close button", async () => {
    const { user } = setup();

    await user.click(closeButton());

    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });

  it("LAY-DLG-006 moves the focus to the reopen button after a click on the overlay", async () => {
    const { user } = setup();

    await user.click(overlay());

    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });

  it("LAY-DLG-006 reopens from the button and returns the focus to it again", async () => {
    const { user } = setup();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(reopenButton()).toHaveFocus());

    await user.click(reopenButton());
    expect(dialog()).toHaveFocus();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });
});

// jsdom has no layout engine: these only pin the classes the sizes are made of. The real size, the centring, the sheet and
// both themes are the manual G5 check (spec/handoffs/LAY-T11.md).
describe("SummaryDialog size and themes (class checks)", () => {
  it("LAY-DLG-011 is centred, 80vw wide and at most 85vh tall from 1024px up, with a fixed title bar over a scrolling body", () => {
    setup();

    const d = dialog();
    expect(d).toHaveClass("lg:left-1/2", "lg:top-1/2", "lg:-translate-x-1/2", "lg:-translate-y-1/2", "lg:w-[80vw]", "lg:max-h-[85vh]", "lg:h-auto");
    expect(d).toHaveClass("max-w-none", "p-0", "gap-0", "overflow-hidden");
    // The shared defaults the design says to override are gone.
    expect(d).not.toHaveClass("max-w-lg");
    expect(d).not.toHaveClass("p-6");
    const section = screen.getByRole("heading", { level: 2, name: "Executive Summary" }).closest("section") as HTMLElement;
    const header = section.querySelector("header") as HTMLElement;
    expect(header).toHaveClass("shrink-0");
    expect(header.nextElementSibling).toHaveClass("min-h-0", "flex-1", "overflow-auto");
    expect(section).toHaveClass("min-h-0", "flex-1");
  });

  it("LAY-DLG-012 fills the viewport as a sheet below 1024px, with the title bar and Close button in view", () => {
    setup();

    expect(dialog()).toHaveClass("left-0", "top-0", "h-dvh", "w-screen", "max-w-none", "translate-x-0", "translate-y-0", "rounded-none");
    expect(closeButton()).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Executive Summary" })).toBeVisible();
  });

  it("LAY-DLG-013 takes the dialog colours from tokens, keeps the stone summary scheme, and drops the panel's own card chrome", () => {
    setup();

    expect(dialog()).toHaveClass("bg-background");
    const section = screen.getByRole("heading", { level: 2, name: "Executive Summary" }).closest("section") as HTMLElement;
    expect(section).toHaveClass("bg-stone-100", "dark:bg-stone-900/50");
    expect(section).toHaveClass("rounded-none", "border-0", "shadow-none");
    expect(overlay()).toHaveClass("bg-black/80");
  });
});

describe("SummaryDialog close rules", () => {
  it("LAY-DLG-007 asks before closing with unsaved changes, with Discard and Keep editing, focus on Keep editing", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);

    await user.keyboard("{Escape}");

    const c = confirm();
    expect(c).toHaveTextContent("Your changes to the executive summary have not been saved.");
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep editing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    expect(dialogBehind()).toBeInTheDocument();
  });

  it("LAY-DLG-007 Keep editing returns to the dialog with the editor and its text intact, and a later close asks again", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(dialog()).toBeInTheDocument();
    expect(screen.getByLabelText("Summary editor")).toHaveValue(NEW_HTML);

    await user.click(closeButton());

    expect(confirm()).toBeInTheDocument();
  });

  it("LAY-DLG-007 Discard closes the dialog, posts nothing and hands the focus to the reopen button", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Discard" }));

    gone();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });

  it("LAY-DLG-007 drops the discarded text: the dialog opens again on the stored summary, not in the editor", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(reopenButton()).toHaveFocus());

    await user.click(reopenButton());

    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    expect(screen.getByText("Old summary")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    gone();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("LAY-DLG-007 asks also when the Close button is used", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);

    await user.click(closeButton());

    expect(confirm()).toBeInTheDocument();
    expect(dialogBehind()).toBeInTheDocument();
  });

  it("LAY-DLG-007 asks also when the overlay is clicked", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);

    await user.click(overlay());

    expect(confirm()).toBeInTheDocument();
    expect(dialogBehind()).toBeInTheDocument();
  });

  it("LAY-DLG-007 closes without asking when the editor is open but nothing was changed", async () => {
    const { user } = setup();
    await user.click(screen.getByTitle("Click to edit"));
    await screen.findByLabelText("Summary editor");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).toBeNull();
    gone();
  });

  it("LAY-DLG-007 closes without asking after Cancel has returned to the view, and Cancel does not close the dialog", async () => {
    const { user } = setup();
    await editTo(user, NEW_HTML);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(dialog()).toBeInTheDocument();
    expect(screen.queryByLabelText("Summary editor")).toBeNull();
    await user.click(closeButton());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    gone();
  });

  it("LAY-DLG-008 ignores Esc, the Close button and the overlay while a save is pending", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const { user } = setup();
    await editTo(user, NEW_HTML);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());
    openChanges.length = 0;

    await user.keyboard("{Escape}");
    await user.click(closeButton());
    await user.click(overlay());

    expect(dialog()).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByLabelText("Summary editor")).toHaveValue(NEW_HTML);
    expect(openChanges).toEqual([]);
  });

  it("LAY-DLG-008 can be closed again once the save has failed, with the confirmation", async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const { user } = setup();
    await editTo(user, NEW_HTML);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());
    await user.keyboard("{Escape}");
    expect(dialog()).toBeInTheDocument();

    finish(reply(423, LOCKED));
    await screen.findByRole("alert");
    await user.keyboard("{Escape}");

    expect(confirm()).toBeInTheDocument();
  });

  it("LAY-DLG-009 shows the toast, then closes the dialog after a successful save, and the focus goes to the reopen button", async () => {
    fetchMock.mockResolvedValue(reply(200, SAVED));
    const { user } = setup();
    await editTo(user, NEW_HTML);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Executive summary updated"));
    await waitFor(() => gone());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    // One close request, made by the dialog itself after the toast: no discard question for a saved summary.
    expect(openChanges).toEqual([{ open: false, toasts: 1 }]);
    await waitFor(() => expect(reopenButton()).toHaveFocus());
  });

  it("LAY-DLG-009 stays open with the editor, the draft and the error after a failed save, and a later close still asks", async () => {
    fetchMock.mockResolvedValue(reply(423, LOCKED));
    const { user } = setup();
    await editTo(user, NEW_HTML);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save: code-app-data.xlsx is open in Excel. Close it and try again.",
    );
    expect(dialog()).toBeInTheDocument();
    expect(screen.getByLabelText("Summary editor")).toHaveValue(NEW_HTML);
    expect(toast.success).not.toHaveBeenCalled();
    expect(openChanges).toEqual([]);

    await user.keyboard("{Escape}");

    expect(confirm()).toBeInTheDocument();
    expect(dialogBehind()).toBeInTheDocument();
  });
});
