// ConfirmDelete dialog (spec 017-design-system DS-COMP-003; spec 004-use-cases-panel UCP-DEL-002). Task QA-T02.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDelete } from "@/components/customers/ConfirmDelete";

function setup(props: { pending?: boolean; error?: string } = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDelete
      open
      title="Delete this use case?"
      description="Payments (Contoso UK) will be removed from this customer. This cannot be undone from the app."
      pending={props.pending ?? false}
      error={props.error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  return { onCancel, onConfirm, user: userEvent.setup() };
}

describe("ConfirmDelete", () => {
  // `open` is controlled by the caller, so "stays open" means ConfirmDelete never asks the caller to close it
  // (onCancel is the only way it does). The dialog element is always present while open={true}.
  it("DS-COMP-003 asks in an alert dialog and does not ask to close when Yes, delete is clicked", async () => {
    const { onCancel, onConfirm, user } = setup();
    const dialog = screen.getByRole("alertdialog", { name: "Delete this use case?" });
    expect(dialog).toHaveTextContent("Payments (Contoso UK) will be removed from this customer.");

    await user.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("DS-COMP-003 closes on Escape when nothing is pending", async () => {
    const { onCancel, user } = setup();

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalled();
  });

  it("DS-COMP-003 stays open while the delete is pending, even when Escape is pressed", async () => {
    const { onCancel, user } = setup({ pending: true });

    await user.keyboard("{Escape}");

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("DS-COMP-003 closes through Cancel when nothing is pending", async () => {
    const { onCancel, onConfirm, user } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("UCP-DEL-002 disables both buttons and shows a spinner while deleting", () => {
    setup({ pending: true });

    const confirm = screen.getByRole("button", { name: "Yes, delete" });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(confirm.querySelector("svg")).not.toBeNull();
  });

  it("UCP-DEL-002 shows no spinner and enables the buttons when not deleting", () => {
    setup();

    const confirm = screen.getByRole("button", { name: "Yes, delete" });
    expect(confirm).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(confirm.querySelector("svg")).toBeNull();
  });

  it("UCP-DEL-002 shows Could not delete: <message> in the dialog when the delete fails", () => {
    setup({ error: "The workbook is locked" });

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Could not delete: The workbook is locked");
  });

  it("DS-COMP-003 stays open on error: reading the error, tabbing and retrying with Yes, delete do not ask to close", async () => {
    const { onCancel, onConfirm, user } = setup({ error: "The workbook is locked" });

    await user.click(screen.getByText("Could not delete: The workbook is locked"));
    await user.tab();
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Could not delete: The workbook is locked");
  });
});
