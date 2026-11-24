// Launch and event dates on the stored calendar day in a time zone west of UTC (spec 004-use-cases-panel UCP-GRID-004,
// spec 007-events-panel EVP-GRID-003, spec 020 DT-TIME-003). Tasks UCP-T08, EVP-T07, PERF-T03.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EventsPanel, UseCasesPanel } from "@/components/customers/ParentActivity";

const { USE_CASES, EVENTS, query, mutation } = vi.hoisted(() => ({
  USE_CASES: [
    { id: 1, use_case_id: 1, solution_name: "Sketchwell", status: "Live", expected_launch_date: "2026-11-11" },
    { id: 2, use_case_id: 2, solution_name: "Sketchwell", status: "Pilot", expected_launch_date: "2027-01-01T00:00:00.000Z" },
    { id: 3, use_case_id: 3, solution_name: "Sketchwell", status: "Pilot", expected_launch_date: "1900-01-01" },
  ],
  EVENTS: [{ id: 7, event_id: 7, event_type: "Workshop", event_date: "2026-03-01", subsidiary_name: "Tidewell Networks" }],
  query: (data: unknown[]) => ({ data, isLoading: false, error: null, refetch: () => undefined }),
  mutation: () => ({ reset: () => undefined, mutate: () => undefined, isPending: false, error: null }),
}));
vi.mock("@/hooks/useParentActivity", () => ({
  useUseCases: () => query(USE_CASES),
  useEvents: () => ({ ...query([]), data: { rows: EVENTS, warnings: [] } }),
  useDeleteUseCase: mutation,
  useDeleteEvent: mutation,
  useSaveUseCase: mutation,
  useSaveUseCases: mutation,
  useSaveEvent: mutation,
}));

const previousTz = process.env.TZ;
beforeAll(() => {
  // West of UTC: `new Date("2026-11-11")` is Nov 10 here, which was the defect.
  process.env.TZ = "America/Los_Angeles";
});
afterAll(() => {
  if (previousTz === undefined) delete process.env.TZ;
  else process.env.TZ = previousTz;
});

const day = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
  .toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

function renderPanel(panel: React.ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{panel}</QueryClientProvider>);
}

describe("dates on the stored calendar day (America/Los_Angeles)", () => {
  it("UCP-GRID-004 shows Launch Date as a short date on the stored day; a pre-2000 placeholder is empty", () => {
    renderPanel(<UseCasesPanel parentId={1} />);
    expect(screen.getByText(day("2026-11-11"))).toBeInTheDocument();
    expect(screen.getByText(day("2027-01-01"))).toBeInTheDocument();
    expect(screen.queryByText(day("2026-11-10"))).not.toBeInTheDocument();
    expect(screen.queryByText(day("2026-12-31"))).not.toBeInTheDocument();
    expect(screen.queryByText(/1900|1899/)).not.toBeInTheDocument();
  });

  it("EVP-GRID-003 shows Event Date on the stored day, in the grid and in the delete confirmation", () => {
    renderPanel(<EventsPanel parentId={1} />);
    expect(screen.getByText(day("2026-03-01"))).toBeInTheDocument();
    expect(screen.queryByText(day("2026-02-28"))).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete row" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(new RegExp(`on ${day("2026-03-01")}`))).toBeInTheDocument();
  });
});
