// Top bar slot for the "Executive summary" reopen button (spec 002-workspace-layout LAY-DLG-010; task LAY-T11). The button
// itself (icon, label classes, ref, click) is built by the page and tested in Customers.test.tsx; here only the slot.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar } from "@/components/customers/TopBar";

const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const noop = () => {};

describe("TopBar summary button slot", () => {
  it("LAY-DLG-010 shows the summary button right of the customer chip and before the search slot", () => {
    render(
      <TopBar
        selectedLabel={{ name: "Northwind Demo", id: "1007" }}
        onClear={noop}
        onRefresh={noop}
        refreshing={false}
        summaryButton={<button type="button">Executive summary</button>}
      >
        <input aria-label="Search customers" />
      </TopBar>,
    );

    const chipText = screen.getByText("Northwind Demo");
    const button = screen.getByRole("button", { name: "Executive summary" });
    expect(follows(chipText, button)).toBe(true);
    expect(follows(screen.getByRole("button", { name: "Clear selected customer" }), button)).toBe(true);
    expect(follows(button, screen.getByLabelText("Search customers"))).toBe(true);
    expect(follows(button, screen.getByRole("button", { name: "Refresh data" }))).toBe(true);
  });

  it("LAY-DLG-010 shows no summary button when no customer is selected", () => {
    render(
      <TopBar
        onClear={noop}
        onRefresh={noop}
        refreshing={false}
        summaryButton={<button type="button">Executive summary</button>}
      />,
    );

    expect(screen.queryByRole("button", { name: "Executive summary" })).toBeNull();
  });

  it("LAY-DLG-010 renders the bar as before when no summary button is given", () => {
    render(<TopBar selectedLabel={{ name: "Northwind Demo" }} onClear={noop} onRefresh={noop} refreshing={false} />);

    expect(screen.getByText("Northwind Demo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Executive summary" })).toBeNull();
    expect(screen.getByRole("button", { name: "Refresh data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
  });
});
