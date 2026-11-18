// Add / Edit use case dialog (spec 005-use-case-form UCF-EDIT-002, UCF-EDIT-004). Tasks UCF-T07, UCF-T08.
// Mocked at the network boundary only: `fetch` is stubbed and answers the lookup reads and the save. The form's own
// hooks, fetchers and the workbook client run for real.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { UseCaseForm } from "@/components/customers/UseCaseForm";
import type { UseCaseRow } from "@/lib/parentData";

const PARENT_ID = 1;

/** Lookup answers, keyed by request path (without the /api/workbook prefix and the query string). */
const LOOKUPS: Record<string, unknown> = {
  "/table/subsidiary": [{ id: 11, subsidiary_id: 9011, subsidiary_name: "Contoso UK", parent_id: PARENT_ID }],
  "/table/department": [],
  "/table/stakeholder": [],
  "/table/solution": [{ id: 21, solution_name: "Payments", premium_credit: true }],
  "/table/content_type": [{ id: 41, content_type: "Video" }],
  "/table/personnel": [{ id: 51, name: "Avery Lee", email: "avery@example.test" }],
  "/solution-use-case-types": [],
  "/solution-statuses": [{ solution_id: 21, status_id: 31, status: "Live", sort_order: 1 }],
};

/** An existing use case with target values the form does not show. */
const ROW: UseCaseRow = {
  id: 7,
  parent_id: PARENT_ID,
  subsidiary_id: 11,
  subsidiary_name: "Contoso UK",
  solution_id: 21,
  solution_name: "Payments",
  status_id: 31,
  status: "Live",
  content_type_ids: "41",
  personnel_ids: "51",
  expected_launch_date: "2026-12-01",
  value_snippet: "Faster checkout",
  note: "<p>Kick-off done</p>",
  target_users: 250,
  target_credits_consumed: 1200,
  target_api_calls: 50000,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let posts: { url: string; body: Record<string, unknown> }[];
/** When set, answers `GET /table/solution` instead of LOOKUPS (to hold it pending or make it fail). */
let solutionsAnswer: (() => Promise<Response>) | undefined;

beforeAll(() => {
  // cmdk (inside Combobox) needs these browser APIs, which jsdom does not provide.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  posts = [];
  solutionsAnswer = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const path = url.pathname.replace(/^\/api\/workbook/, "");
      if (init?.method === "POST") {
        posts.push({ url: path, body: JSON.parse(String(init.body)) });
        return json({ id: 7 });
      }
      if (path === "/use-cases") return json([]);
      if (path === "/table/solution" && solutionsAnswer) return solutionsAnswer();
      if (path in LOOKUPS) return json(LOOKUPS[path]);
      return json({ error: `Unexpected request ${path}` }, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(row?: UseCaseRow) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <UseCaseForm parentId={PARENT_ID} customerKeys={[PARENT_ID]} existing={row ? [row] : []} row={row} onClose={onClose} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { onClose, invalidate, user: userEvent.setup() };
}

/** Waits until the lookups have loaded and the given combobox shows `label`. */
async function shows(label: string) {
  expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
}

/** Opens the combobox of the field labelled `label` and picks an option. Field labels have no `for`, so go through the DOM. */
async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  const text = (t: string) => t === label || t === `${label}*`;
  const field = screen.getByText(text, { selector: "label" }).parentElement as HTMLElement;
  await user.click(within(field).getByRole("button"));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("UseCaseForm, edit", () => {
  it("UCF-EDIT-002 Save changes posts the full use case with its id, toasts Use case updated, closes and refreshes the use cases", async () => {
    const { onClose, invalidate, user } = setup(ROW);
    expect(screen.getByRole("dialog", { name: "Edit use case" })).toBeInTheDocument();
    await shows("Payments");
    await shows("Live");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("/use-cases");
    expect(posts[0].body).toEqual({
      id: 7,
      parent_id: PARENT_ID,
      subsidiary_id: 11,
      solution_id: 21,
      status_id: 31,
      expected_launch_date: "2026-12-01",
      content_type_ids: "41",
      personnel_ids: "51",
      value_snippet: "Faster checkout",
      note: "<p>Kick-off done</p>",
      premium_credit: true,
      deleted: false,
      target_users: 250,
      target_credits_consumed: 1200,
      target_api_calls: 50000,
    });
    expect(await screen.findByText("Use case updated")).toBeInTheDocument();
    expect(screen.queryByText("Use case added")).not.toBeInTheDocument();
    expect(screen.queryByText("Editing isn't connected yet")).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["useCases", PARENT_ID] });
  });

  it("UCF-EDIT-002 posts the edited values, not the original ones", async () => {
    const { onClose, user } = setup(ROW);
    await shows("Live");

    const value = screen.getByPlaceholderText("Short value statement");
    await user.clear(value);
    await user.type(value, "Checkout in one click");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ id: 7, value_snippet: "Checkout in one click" });
  });

  it("UCF-EDIT-004 sends the row's current target_users, target_credits_consumed and target_api_calls when saving an edit", async () => {
    const { onClose, user } = setup(ROW);
    await shows("Live");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ target_users: 250, target_credits_consumed: 1200, target_api_calls: 50000 });
  });

  // Solution and Status are pre-filled on edit, so Save changes works before the solutions lookup has answered. The
  // premium flag normally comes from the solution; without it the edit must keep the stored flag, not write false.
  it("UCF-EDIT-002 keeps the stored premium_credit when Save changes is clicked before the solutions lookup has loaded", async () => {
    let answer: (r: Response) => void = () => {};
    solutionsAnswer = () => new Promise<Response>((resolve) => (answer = resolve));
    const { onClose, user } = setup({ ...ROW, premium_credit: true });
    await shows("Live");
    expect(screen.getByText("Solution", { selector: "label" }).parentElement).toHaveTextContent("Loading...");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ id: 7, premium_credit: true });
    answer(json(LOOKUPS["/table/solution"]));
  });

  it("UCF-EDIT-002 takes premium_credit from the solution once it is known, over the row's stored flag", async () => {
    // LOOKUPS: solution 21 "Payments" has premium_credit: true.
    const { onClose, user } = setup({ ...ROW, premium_credit: false });
    await shows("Payments");
    await shows("Live");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ id: 7, premium_credit: true });
  });

  it("UCF-EDIT-002 keeps the stored premium_credit when the solutions lookup has failed", async () => {
    solutionsAnswer = async () => json({ error: "The workbook is locked" }, 500);
    const { onClose, user } = setup({ ...ROW, premium_credit: true });
    expect(await screen.findByText("The workbook is locked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ id: 7, premium_credit: true });
  });
});

// Regression checks for the add path, which UCF-T07 must leave unchanged (evidence for already-implemented criteria).
describe("UseCaseForm, add", () => {
  /** Fills the three required fields and submits. */
  async function addOne() {
    const ctx = setup();
    expect(screen.getByRole("dialog", { name: "Add use case" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByRole("button", { name: "Loading..." })).toHaveLength(0));
    await pick(ctx.user, "Subsidiary", "Contoso UK");
    await pick(ctx.user, "Solution", "Payments");
    await pick(ctx.user, "Status", "Live");
    await ctx.user.click(screen.getByRole("button", { name: "Add use case" }));
    await waitFor(() => expect(ctx.onClose).toHaveBeenCalledTimes(1));
    return ctx;
  }

  it("UCF-ADD-002 still posts a new use case without an id or target fields (required fields only)", async () => {
    await addOne();

    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("/use-cases");
    expect(posts[0].body).toEqual({
      parent_id: PARENT_ID,
      subsidiary_id: 11,
      solution_id: 21,
      status_id: 31,
      premium_credit: true,
      deleted: false,
    });
    expect(posts[0].body).not.toHaveProperty("id");
  });

  it("UCF-ADD-004 still toasts Use case added, closes and refreshes the use cases", async () => {
    const { invalidate } = await addOne();

    expect(await screen.findByText("Use case added")).toBeInTheDocument();
    expect(screen.queryByText("Use case updated")).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["useCases", PARENT_ID] });
  });
});
