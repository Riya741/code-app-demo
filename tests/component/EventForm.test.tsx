// Add / Edit event dialog (spec 008-event-form EVF-EDIT-002). Task EVF-T06.
// Mocked at the network boundary only: `fetch` is stubbed and answers the lookup reads and the save. The form's own
// hooks, fetchers and the workbook client run for real.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { EventForm } from "@/components/customers/EventForm";
import type { EventRow } from "@/lib/parentData";

const PARENT_ID = 1;

/**
 * Lookup answers, keyed by request path (without the /api/workbook prefix and the query string). The subsidiary's `id`
 * and its alternate key `subsidiary_id` differ on purpose, so a test can tell which one the form posts.
 */
const LOOKUPS: Record<string, unknown> = {
  "/table/subsidiary": [
    { id: 11, subsidiary_id: 9011, subsidiary_name: "Contoso UK", parent_id: PARENT_ID },
    { id: 12, subsidiary_id: 9012, subsidiary_name: "Contoso DE", parent_id: PARENT_ID },
  ],
  "/table/solution": [
    { id: 21, solution_name: "Payments" },
    { id: 22, solution_name: "Lending" },
  ],
  "/table/event_type": [
    { id: 31, event_type: "Workshop" },
    { id: 32, event_type: "Office Hours" },
  ],
  "/table/personnel": [
    { id: 51, name: "Avery Lee", email: "avery@example.test" },
    { id: 52, name: "Blake Kim", email: "blake@example.test" },
  ],
};

/** An existing event, stored against the subsidiary's `id` (11). */
const ROW: EventRow = {
  id: 7,
  subsidiary_id: 11,
  subsidiary_name: "Contoso UK",
  event_type_id: 31,
  event_type: "Workshop",
  event_date: "2026-03-05T00:00:00",
  stage: "Completed",
  attendee_count: 12,
  attendee_names: "Ann Fox, Bo Lin",
  meeting_notes: "<p>Agreed next steps</p>",
  duration: 90,
  onsite: true,
  virtual: false,
  solution_ids: ["21", "22"],
  css_contributor_ids: ["51"],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let posts: { url: string; body: Record<string, unknown> }[];

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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const path = url.pathname.replace(/^\/api\/workbook/, "");
      if (init?.method === "POST") {
        posts.push({ url: path, body: JSON.parse(String(init.body)) });
        return json({ id: 7 });
      }
      if (path === "/events") return json([]);
      if (path in LOOKUPS) return json(LOOKUPS[path]);
      return json({ error: `Unexpected request ${path}` }, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(row?: EventRow) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <EventForm parentId={PARENT_ID} customerKeys={[PARENT_ID]} existing={row ? [row] : []} row={row} onClose={onClose} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { onClose, invalidate, user: userEvent.setup() };
}

/** Waits until the lookups have loaded and a combobox shows `label`. */
async function shows(label: string | RegExp) {
  expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
}

/** Opens a combobox (by its current text) and picks an option. */
async function pick(user: ReturnType<typeof userEvent.setup>, current: string | RegExp, option: string) {
  const triggers = await screen.findAllByRole("button", { name: current });
  await user.click(triggers[0]);
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("EventForm, edit", () => {
  it("EVF-EDIT-002 Save changes posts the full event with its Id, toasts Event updated, closes and refreshes the events", async () => {
    const { onClose, invalidate, user } = setup(ROW);
    expect(screen.getByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
    await shows("Contoso UK");
    await shows("Workshop");
    await shows(/^Payments, Lending/); // the trigger also shows the count badge "2"
    await shows("Avery Lee");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("/events");
    expect(posts[0].body).toEqual({
      Id: 7,
      SubsidiaryId: "11",
      EventTypeId: 31,
      EventDate: "2026-03-05",
      Stage: "Completed",
      AttendeeCount: 12,
      Duration: 90,
      Onsite: true,
      Virtual: false,
      AttendeeNames: "Ann Fox, Bo Lin",
      MeetingNotes: "<p>Agreed next steps</p>",
      SolutionIds: "21,22",
      PersonnelIds: "51",
      Deleted: false,
    });
    expect(await screen.findByText("Event updated")).toBeInTheDocument();
    expect(screen.queryByText("Event added")).not.toBeInTheDocument();
    expect(screen.queryByText("Editing isn't connected yet")).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", PARENT_ID] });
  });

  it("EVF-EDIT-002 posts the edited values, not the original ones", async () => {
    const { onClose, user } = setup(ROW);
    await shows("Workshop");

    await pick(user, "Workshop", "Office Hours");
    await pick(user, "Avery Lee", "Blake Kim");
    await user.keyboard("{Escape}");
    const stage = screen.getByPlaceholderText("e.g. Completed");
    await user.clear(stage);
    await user.type(stage, "Scheduled");
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: "2026-12-01" } });
    await user.click(screen.getByRole("checkbox", { name: "Virtual" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({
      Id: 7,
      SubsidiaryId: "11",
      EventTypeId: 32,
      EventDate: "2026-12-01",
      Stage: "Scheduled",
      Virtual: true,
      PersonnelIds: "51,52",
      SolutionIds: "21,22",
    });
  });

  it("EVF-EDIT-002 posts the subsidiary id the row is stored with when rows use the alternate subsidiary_id key", async () => {
    const row: EventRow = { ...ROW, subsidiary_id: 9011 };
    const { onClose, user } = setup(row);
    await shows("Contoso UK");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ Id: 7, SubsidiaryId: "9011" });
  });
});

// Regression check for the add path, which EVF-T06 must leave unchanged (evidence for an already-implemented criterion).
describe("EventForm, add", () => {
  it("EVF-ADD-003 still posts a new event without an Id, toasts Event added, closes and refreshes the events", async () => {
    const { onClose, invalidate, user } = setup();
    expect(screen.getByRole("dialog", { name: "Add event" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByRole("button", { name: "Loading..." })).toHaveLength(0));
    await pick(user, "Select...", "Contoso UK");
    await pick(user, "Select...", "Workshop");
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: "2026-12-01" } });
    await user.click(screen.getByRole("button", { name: "Add event" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("/events");
    expect(posts[0].body).toEqual({
      SubsidiaryId: "11",
      EventTypeId: 31,
      EventDate: "2026-12-01",
      Onsite: false,
      Virtual: false,
      Deleted: false,
    });
    expect(posts[0].body).not.toHaveProperty("Id");
    expect(await screen.findByText("Event added")).toBeInTheDocument();
    expect(screen.queryByText("Event updated")).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", PARENT_ID] });
  });
});
