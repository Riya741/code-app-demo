// Shared panel shell (spec 002-workspace-layout LAY-SHELL-001). Task QA-T02.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Panel } from "@/components/customers/Panel";

/** The header bar is a <header> inside the panel's <section>, so it has no landmark role to query by. */
function headerOf(heading: HTMLElement) {
  const header = heading.closest("header");
  expect(header).not.toBeNull();
  return header as HTMLElement;
}

describe("Panel", () => {
  it("LAY-SHELL-001 shows a header bar with the title, count, tally badges and actions, followed by the body", () => {
    render(
      <Panel title="Use Cases" count={12} badges={<span>Live 4</span>} headerRight={<button type="button">Export</button>}>
        <p>Grid goes here</p>
      </Panel>,
    );

    const header = headerOf(screen.getByRole("heading", { level: 2, name: "Use Cases" }));
    expect(within(header).getByText("12")).toBeInTheDocument();
    expect(within(header).getByText("Live 4")).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Export" })).toBeInTheDocument();
    const body = screen.getByText("Grid goes here");
    expect(header).not.toContainElement(body);
    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("LAY-SHELL-001 leaves out the count badge when no count is given", () => {
    render(
      <Panel title="Executive Summary">
        <p>Summary text</p>
      </Panel>,
    );

    const header = headerOf(screen.getByRole("heading", { level: 2, name: "Executive Summary" }));
    expect(header).toHaveTextContent(/^Executive Summary$/);
  });
});
