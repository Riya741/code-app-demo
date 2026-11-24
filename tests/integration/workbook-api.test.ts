// @vitest-environment node
// Workbook HTTP API (spec 014-workbook-api), already implemented behaviour, run through the QA-T03 harness.
import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { Store } from "../../server/workbook";
import { workbookApi } from "./harness";

type Row = Record<string, string | number | boolean | null>;

const api = workbookApi();
const sha = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const stamp = () => new Date().toISOString().slice(0, 19);
const rows = async (sheet: string, query = "") => (await api.request<Row[]>("GET", `/api/workbook/table/${sheet}${query}`)).body;

/** A valid new use case for the first customer, built from the fixture's own ids. */
async function newUseCase(extra: Row = {}) {
  const [customer] = await rows("customer");
  const [subsidiary] = await rows("subsidiary", `?where=parent_id:${customer.id}`);
  const [allowed] = await rows("solution_status");
  return {
    parent_id: customer.id,
    subsidiary_id: subsidiary.id,
    solution_id: allowed.solution_id,
    status_id: allowed.status_id,
    note: "Integration test use case",
    ...extra,
  };
}

/** Removes (solution, status) from `solution_status` and (solution, type) from `solution_use_case_type` in a temp copy. */
async function withoutPairs(file: string, solution: number, status: number, type: number) {
  const store = new Store(file);
  await store.fresh();
  for (const [sheet, col, value] of [["solution_status", "status_id", status], ["solution_use_case_type", "use_case_type_id", type]] as const) {
    const t = store.table(sheet);
    t.rows = t.rows.filter((r) => !(r.solution_id === solution && r[col] === value));
  }
  await store.save();
}

async function newEvent() {
  const [subsidiary] = await rows("subsidiary");
  const [type] = await rows("event_type");
  return { SubsidiaryId: subsidiary.id, EventTypeId: type.id, EventDate: "2026-12-01T10:00:00", MeetingNotes: "Integration test" };
}

describe("general contract", () => {
  it("API-GEN-001 answers a successful request with 200 and JSON", async () => {
    const { status, headers, body } = await api.request("GET", "/api/workbook/solution-statuses");
    expect(status).toBe(200);
    expect(headers["content-type"]).toBe("application/json");
    expect(Array.isArray(body)).toBe(true);
  });

  it("API-GEN-002 answers a failure with { error: message } and its status", async () => {
    const { status, headers, body } = await api.request("POST", "/api/workbook/use-cases", { id: 999999 });
    expect(status).toBe(400);
    expect(headers["content-type"]).toBe("application/json");
    expect(body).toEqual({ error: "Missing: parent_id, solution_id, status_id, subsidiary_id" });
  });

  it("API-GEN-002 returns 500 and logs it as [workbook] when the workbook is missing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      fs.rmSync(api.file);
      const { status, body } = await api.request("GET", "/api/workbook/health");
      expect(status).toBe(500);
      expect(body).toEqual({ error: `Workbook not found: ${api.file}` });
      expect(log).toHaveBeenCalledWith("[workbook]", expect.anything());
    } finally {
      log.mockRestore();
    }
  });

  it("API-GEN-003 answers an unknown route with 404 Unknown workbook request", async () => {
    const { status, body } = await api.request("GET", "/api/workbook/nothing-here");
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Unknown workbook request: GET /nothing-here" });
  });

  it("API-GEN-004 rejects a body that is not JSON with 400 and reads an empty body as {}", async () => {
    const bad = await api.request("POST", "/api/workbook/use-cases", "{not json");
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ error: "The request body is not valid JSON." });

    const empty = await api.request("POST", "/api/workbook/use-cases");
    expect(empty.status).toBe(400);
    expect(empty.body).toEqual({ error: "Missing: parent_id, solution_id, status_id, subsidiary_id" });
  });
});

describe("reads", () => {
  it("API-READ-004 requires a numeric parentId", async () => {
    for (const url of ["/api/workbook/use-cases", "/api/workbook/events?parentId=abc"]) {
      const { status, body } = await api.request("GET", url);
      expect(status).toBe(400);
      expect(body).toEqual({ error: "parentId is required." });
    }
  });
});

describe("use case writes", () => {
  it("API-WRITE-001 inserts a use case when no id is given", async () => {
    const input = await newUseCase();
    const before = await rows("use_case");
    const { status, body } = await api.request<{ id: number }>("POST", "/api/workbook/use-cases", input);
    expect(status).toBe(200);
    expect(before.some((r) => r.id === body.id)).toBe(false);

    // Supporting check only (the joined listing itself is API-READ-002).
    const listed = (await api.request<Row[]>("GET", `/api/workbook/use-cases?parentId=${input.parent_id}`)).body;
    expect(listed.find((r) => r.id === body.id)).toMatchObject({ note: input.note, solution_id: input.solution_id, status_id: input.status_id });

    // Persisted: a fresh plugin reading the file sees the new row.
    const reread = await api.reopen()<Row[]>("GET", `/api/workbook/table/use_case?where=id:${body.id}`);
    expect(reread.body).toHaveLength(1);
    expect(await rows("use_case")).toHaveLength(before.length + 1);
  });

  it("API-WRITE-001 updates the use case named by id", async () => {
    const created = (await api.request<{ id: number }>("POST", "/api/workbook/use-cases", await newUseCase())).body;
    const count = (await rows("use_case")).length;
    const { status, body } = await api.request<{ id: number }>("POST", "/api/workbook/use-cases", await newUseCase({ id: created.id, note: "Changed" }));
    expect(status).toBe(200);
    expect(body.id).toBe(created.id);
    expect(await rows("use_case")).toHaveLength(count);
    const reread = await api.reopen()<Row[]>("GET", `/api/workbook/table/use_case?where=id:${created.id}`);
    expect(reread.body[0].note).toBe("Changed");
  });

  it("API-WRITE-001 answers 404 when the id to update does not exist", async () => {
    const before = sha(api.file);
    const { status, body } = await api.request("POST", "/api/workbook/use-cases", await newUseCase({ id: 999999 }));
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Use case 999999 was not found." });
    expect(sha(api.file)).toBe(before);
  });

  it("API-WRITE-001 answers 400 Missing: status_id and leaves the file unchanged", async () => {
    const input: Row = await newUseCase();
    delete input.status_id;
    const before = sha(api.file);
    const { status, body } = await api.request("POST", "/api/workbook/use-cases", input);
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Missing: status_id" });
    expect(sha(api.file)).toBe(before);
  });

  it("API-WRITE-007 answers use case and event saves with exactly { id: number }", async () => {
    const inserted = await api.request("POST", "/api/workbook/use-cases", await newUseCase());
    expect(inserted.body).toEqual({ id: expect.any(Number) });
    const updated = await api.request("POST", "/api/workbook/use-cases", await newUseCase({ id: inserted.body.id as number }));
    expect(updated.body).toEqual({ id: inserted.body.id });
    const event = await api.request("POST", "/api/workbook/events", await newEvent());
    expect(event.status).toBe(200);
    expect(event.body).toEqual({ id: expect.any(Number) });
  });
});

describe("reference checks", () => {
  /** Posts a body that must be refused with 400 and the given message, and checks the file did not change. */
  async function refused(url: string, body: Record<string, unknown>, error: string) {
    const before = sha(api.file);
    const reply = await api.request("POST", url, body);
    expect(reply).toMatchObject({ status: 400, body: { error } });
    expect(sha(api.file)).toBe(before);
  }

  it("API-WRITE-008 rejects a use case whose single references name no row, with 400 and the field, file unchanged", async () => {
    const url = "/api/workbook/use-cases";
    for (const field of ["parent_id", "subsidiary_id", "department_id", "stakeholder_id", "solution_id", "status_id", "use_case_type_id"]) {
      await refused(url, await newUseCase({ [field]: 999999 }), `Unknown ${field}: 999999`);
    }
    await refused(url, await newUseCase({ solution_id: "abc" }), "Unknown solution_id: abc");
  });

  it("API-WRITE-008 rejects a use case whose personnel or content type lists hold an unknown id", async () => {
    const [person] = await rows("personnel");
    const [content] = await rows("content_type");
    await refused("/api/workbook/use-cases", await newUseCase({ personnel_ids: `${person.id},999999` }), "Unknown personnel_ids: 999999");
    await refused("/api/workbook/use-cases", await newUseCase({ content_type_ids: `999998,${content.id}` }), "Unknown content_type_ids: 999998");
  });

  it("API-WRITE-008 rejects a status or use case type not allowed for the solution, and accepts an allowed pair", async () => {
    const input = await newUseCase();
    const solution = input.solution_id as number;
    const [status] = (await rows("status")).filter((s) => s.id !== input.status_id);
    const [type] = await rows("use_case_type");
    const allowedType = (await rows("solution_use_case_type")).find((p) => p.solution_id === solution && p.use_case_type_id !== type.id);
    expect(status && type && allowedType).toBeTruthy();

    // The fixture may allow every pair (DATA-QUAL-003), so remove these two pairs from this test's copy.
    await withoutPairs(api.file, solution, status.id as number, type.id as number);
    const request = api.reopen();
    const url = "/api/workbook/use-cases";
    for (const [body, error] of [
      [{ ...input, status_id: status.id }, `Status ${status.id} is not allowed for solution ${solution}.`],
      [{ ...input, use_case_type_id: type.id }, `Use case type ${type.id} is not allowed for solution ${solution}.`],
    ] as const) {
      const before = sha(api.file);
      expect(await request("POST", url, body)).toMatchObject({ status: 400, body: { error } });
      expect(sha(api.file)).toBe(before);
    }
    expect((await request("POST", url, { ...input, use_case_type_id: allowedType?.use_case_type_id })).status).toBe(200);
  });

  it("API-WRITE-008 rejects an event whose subsidiary, event type, contributors or solutions name no row", async () => {
    const url = "/api/workbook/events";
    const [person] = await rows("personnel");
    await refused(url, { ...(await newEvent()), SubsidiaryId: 999999 }, "Unknown SubsidiaryId: 999999");
    await refused(url, { ...(await newEvent()), EventTypeId: 999999 }, "Unknown EventTypeId: 999999");
    await refused(url, { ...(await newEvent()), PersonnelIds: `${person.id},999999` }, "Unknown PersonnelIds: 999999");
    await refused(url, { ...(await newEvent()), SolutionIds: "999999" }, "Unknown SolutionIds: 999999");
  });

  it("API-WRITE-008 accepts saves whose references all exist, including optional ones left empty", async () => {
    const [person] = await rows("personnel");
    const [solution] = await rows("solution");
    const useCase = await api.request("POST", "/api/workbook/use-cases", await newUseCase({ personnel_ids: String(person.id), department_id: "" }));
    expect(useCase.status).toBe(200);
    const event = await api.request("POST", "/api/workbook/events", { ...(await newEvent()), PersonnelIds: String(person.id), SolutionIds: String(solution.id) });
    expect(event.status).toBe(200);
  });
});

describe("soft delete", () => {
  it("API-DEL-001 soft-deletes a use case: deleted = true, last_modified = now, { ok: true }", async () => {
    const [target] = await rows("use_case", "?where=deleted:false");
    const before = stamp();
    const { status, body } = await api.request("DELETE", `/api/workbook/use-cases/${target.id}`);
    const after = stamp();
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });

    const [row] = (await api.reopen()<Row[]>("GET", `/api/workbook/table/use_case?where=id:${target.id}`)).body;
    expect(row.deleted).toBe(true);
    expect(String(row.last_modified) >= before && String(row.last_modified) <= after).toBe(true);
    // Supporting check only (the read filter itself is API-READ-002).
    const listed = (await api.request<Row[]>("GET", `/api/workbook/use-cases?parentId=${target.parent_id}`)).body;
    expect(listed.some((r) => r.id === target.id)).toBe(false);
  });

  it("API-DEL-001 soft-deletes an event: deleted = true, last_modified = now, { ok: true }", async () => {
    const [target] = await rows("event", "?where=deleted:false");
    const [subsidiary] = await rows("subsidiary", `?where=id:${target.subsidiary_id}`);
    const before = stamp();
    const { status, body } = await api.request("DELETE", `/api/workbook/events/${target.id}`);
    const after = stamp();
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });

    const [row] = (await api.reopen()<Row[]>("GET", `/api/workbook/table/event?where=id:${target.id}`)).body;
    expect(row.deleted).toBe(true);
    expect(String(row.last_modified) >= before && String(row.last_modified) <= after).toBe(true);
    // Supporting check only (the read filter itself is API-READ-003).
    const listed = (await api.request<Row[]>("GET", `/api/workbook/events?parentId=${subsidiary.parent_id}`)).body;
    expect(listed.some((r) => r.id === target.id)).toBe(false);
  });

  it("API-DEL-002 answers 404 for a use case or event that does not exist", async () => {
    const uc = await api.request("DELETE", "/api/workbook/use-cases/999999");
    expect(uc.status).toBe(404);
    expect(uc.body).toEqual({ error: "This use case could not be found." });
    const ev = await api.request("DELETE", "/api/workbook/events/999999");
    expect(ev.status).toBe(404);
    expect(ev.body).toEqual({ error: "This event could not be found." });
  });

  it("API-DEL-002 answers 409 when the use case or event was already deleted", async () => {
    const [uc] = await rows("use_case", "?where=deleted:false");
    const [ev] = await rows("event", "?where=deleted:false");
    for (const [route, id, label] of [["use-cases", uc.id, "use case"], ["events", ev.id, "event"]] as const) {
      expect((await api.request("DELETE", `/api/workbook/${route}/${id}`)).status).toBe(200);
      const again = await api.request("DELETE", `/api/workbook/${route}/${id}`);
      expect(again.status).toBe(409);
      expect(again.body).toEqual({ error: `This ${label} was already deleted.` });
    }
  });
});
