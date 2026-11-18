// @vitest-environment node
// Saving an event edit end to end through the workbook API (spec 008-event-form EVF-EDIT-002). Task EVF-T06.
// The request bodies are built the way EventForm builds them (design.md "Payload mapping"): ids as the form holds
// them (subsidiary as a string), the date as YYYY-MM-DD, lists as comma separated ids, Deleted: false.
import { describe, expect, it } from "vitest";
import { workbookApi } from "./harness";

type Row = Record<string, string | number | boolean | null>;
/** An event as GET /events returns it to the app (EventRow). */
type EventRow = Row & { id: number; css_contributor_ids: string[]; solution_ids: string[] };

const api = workbookApi();
const rows = async (sheet: string, query = "") => (await api.request<Row[]>("GET", `/api/workbook/table/${sheet}${query}`)).body;
const post = (body: unknown) => api.request<{ id: number }>("POST", "/api/workbook/events", body);

/** Ids from the fixture: a customer with a subsidiary, two event types, three solutions and three people. */
async function fixtureIds() {
  const customers = await rows("customer");
  for (const customer of customers) {
    const [subsidiary] = await rows("subsidiary", `?where=parent_id:${customer.id}`);
    if (!subsidiary) continue;
    const types = (await rows("event_type")).map((t) => t.id as number);
    const solutions = (await rows("solution")).map((s) => s.id as number);
    const people = (await rows("personnel")).map((p) => p.id as number);
    return { parentId: customer.id as number, subsidiaryId: subsidiary.id as number, types, solutions, people };
  }
  throw new Error("The fixture has no customer with a subsidiary");
}

/** Adds an event the way the Add event dialog does and returns it as the app reads it. */
async function addEvent(ids: Awaited<ReturnType<typeof fixtureIds>>) {
  const { status, body } = await post({
    SubsidiaryId: String(ids.subsidiaryId),
    EventTypeId: ids.types[0],
    EventDate: "2026-03-05",
    Stage: "Scheduled",
    AttendeeCount: 12,
    Duration: 60,
    Onsite: true,
    Virtual: false,
    AttendeeNames: "Ann Fox, Bo Lin",
    MeetingNotes: "<p>Agenda agreed</p>",
    SolutionIds: `${ids.solutions[0]},${ids.solutions[1]}`,
    PersonnelIds: String(ids.people[0]),
    Deleted: false,
  });
  expect(status).toBe(200);
  return read(ids.parentId, body.id);
}

async function read(parentId: number, id: number, request = api.request) {
  const events = (await request<EventRow[]>("GET", `/api/workbook/events?parentId=${parentId}`)).body;
  const row = events.find((e) => e.id === id);
  expect(row).toBeDefined();
  return row as EventRow;
}

/** The body EventForm posts on "Save changes": the row's Id and subsidiary, plus the form's (edited) values. */
function editBody(row: EventRow, edits: Record<string, unknown>) {
  return {
    Id: row.id,
    SubsidiaryId: String(row.subsidiary_id),
    EventTypeId: row.event_type_id,
    EventDate: String(row.event_date).slice(0, 10),
    Stage: row.stage ?? undefined,
    AttendeeCount: row.attendee_count ?? undefined,
    Duration: row.duration ?? undefined,
    Onsite: !!row.onsite,
    Virtual: !!row.virtual,
    AttendeeNames: row.attendee_names ?? undefined,
    MeetingNotes: row.meeting_notes ?? undefined,
    SolutionIds: row.solution_ids.join(",") || undefined,
    PersonnelIds: row.css_contributor_ids.join(",") || undefined,
    Deleted: false,
    ...edits,
  };
}

describe("POST /events with Id (Save changes)", () => {
  it("EVF-EDIT-002 round trip: an edit posted as the form builds it updates the event in the file, keeps its Id and replaces its links", async () => {
    const ids = await fixtureIds();
    const before = await addEvent(ids);
    const eventCount = (await rows("event")).length;
    const [stored] = await rows("event", `?where=id:${before.id}`);

    const { status, body } = await post(
      editBody(before, {
        EventTypeId: ids.types[1],
        EventDate: "2026-12-01",
        Stage: "Completed",
        AttendeeCount: 20,
        Duration: 90,
        Onsite: false,
        Virtual: true,
        AttendeeNames: "Ann Fox, Bo Lin, Cy Park",
        MeetingNotes: "<p>Agreed <strong>next steps</strong></p>",
        SolutionIds: `${ids.solutions[1]},${ids.solutions[2]}`,
        PersonnelIds: `${ids.people[1]},${ids.people[2]}`,
      }),
    );
    expect(status).toBe(200);
    expect(body).toEqual({ id: before.id });

    // Read back through a brand-new plugin, i.e. from the saved file.
    const after = await read(ids.parentId, before.id, api.reopen());
    expect(after).toMatchObject({
      id: before.id,
      event_id: before.event_id,
      subsidiary_id: ids.subsidiaryId,
      event_type_id: ids.types[1],
      event_date: "2026-12-01",
      stage: "Completed",
      attendee_count: 20,
      duration: 90,
      onsite: false,
      virtual: true,
      attendee_names: "Ann Fox, Bo Lin, Cy Park",
      meeting_notes: "<p>Agreed <strong>next steps</strong></p>",
      deleted: false,
      created: stored.created,
    });
    expect([...after.solution_ids].sort()).toEqual([String(ids.solutions[1]), String(ids.solutions[2])].sort());
    expect([...after.css_contributor_ids].sort()).toEqual([String(ids.people[1]), String(ids.people[2])].sort());

    // Updated in place: no new event row, and the old links are gone rather than added to.
    expect(await rows("event")).toHaveLength(eventCount);
    const solutionLinks = await rows("event_solution", `?where=event_id:${before.id}`);
    expect(solutionLinks.map((l) => l.solution_id).sort()).toEqual([ids.solutions[1], ids.solutions[2]].sort());
    const personnelLinks = await rows("event_personnel", `?where=event_id:${before.id}`);
    expect(personnelLinks.map((l) => l.personnel_id).sort()).toEqual([ids.people[1], ids.people[2]].sort());
  });

  it("EVF-EDIT-002 an unchanged Save changes keeps every stored value of the event (the full replace loses nothing)", async () => {
    const ids = await fixtureIds();
    const before = await addEvent(ids);
    const [stored] = await rows("event", `?where=id:${before.id}`);

    const { status } = await post(editBody(before, {}));
    expect(status).toBe(200);

    const [saved] = await api.reopen()<Row[]>("GET", `/api/workbook/table/event?where=id:${before.id}`).then((r) => r.body);
    // Only the server's own timestamp moves; every other column of the event sheet is what it was.
    expect({ ...saved, last_modified: null }).toEqual({ ...stored, last_modified: null });
    const after = await read(ids.parentId, before.id, api.reopen());
    expect(after.solution_ids).toEqual(before.solution_ids);
    expect(after.css_contributor_ids).toEqual(before.css_contributor_ids);
  });
});
