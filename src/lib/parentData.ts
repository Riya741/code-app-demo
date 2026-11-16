import type { EventInput, EventRow, UseCaseInput, UseCaseRow } from "@/lib/types";
import { api, post, remove } from "@/lib/workbookApi";

export type { EventRow, UseCaseRow };

/** Events plus any problems loading their lookup columns (shown to the user instead of a silently blank column). */
export type EventsResult = { rows: EventRow[]; warnings: string[] };

/** Use cases of one customer: the `use_case` sheet joined with its lookup sheets, deleted rows left out. */
export function fetchUseCases(parentId: number): Promise<UseCaseRow[]> {
  return api<UseCaseRow[]>(`/use-cases?parentId=${parentId}`);
}

/** Events of one customer (through its subsidiaries), with contributors and solutions already joined, newest first. */
export async function fetchEvents(parentId: number): Promise<EventsResult> {
  const rows = await api<EventRow[]>(`/events?parentId=${parentId}`);
  return { rows, warnings: [] };
}

/* ---------------------------------- Deleting ---------------------------------- */

/** Soft delete: `deleted` becomes true on the row (the read queries then leave it out). */
export async function deleteUseCase(row: UseCaseRow): Promise<void> {
  if (row.id == null) throw new Error("This use case has no id.");
  await remove(`/use-cases/${row.id}`);
}

export async function deleteEvent(row: EventRow): Promise<void> {
  if (row.id == null) throw new Error("This event has no id.");
  await remove(`/events/${row.id}`);
}

/* ----------------------------------- Adding ----------------------------------- */

/** Adds a use case (no `id`) and links its content types and contributors. */
export async function saveUseCase(input: UseCaseInput): Promise<void> {
  await post("/use-cases", input);
}

/** Adds an event (no `Id`) and links its solutions and contributors. */
export async function saveEvent(input: EventInput): Promise<void> {
  await post("/events", input);
}
