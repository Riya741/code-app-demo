// @vitest-environment node
// Workbook HTTP API (spec 014-workbook-api), already implemented behaviour, run through the QA-T03 harness.
import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
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
