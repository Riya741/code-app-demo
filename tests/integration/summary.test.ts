// @vitest-environment node
// Customer executive summary endpoint (spec 014-workbook-api, API-R5). Task API-T09 (also SUM-T07).
import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookApi } from "./harness";

type Customer = { id: number; executive_summary: string | null; summary_last_modified: string | null };

const api = workbookApi();
const sha = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const stamp = () => new Date().toISOString().slice(0, 19);
const customers = async () => (await api.request<Customer[]>("GET", "/api/workbook/table/customer")).body;
/** Reads one customer back through a brand-new plugin, i.e. from the saved file rather than from memory. */
const fromFile = async (id: number) =>
  (await api.reopen()<Customer[]>("GET", `/api/workbook/table/customer?where=id:${id}`)).body[0];
const save = (id: number, body: unknown) => api.request("POST",`/api/workbook/customers/${id}/summary`, body);

describe("POST /customers/:id/summary", () => {
  it("API-SUMM-001 stores the summary text in the workbook file", async () => {
    const [customer] = await customers();
    const html = "<p>Renewal <strong>on track</strong>: Müller rollout in Q1.</p>";
    const { status } = await save(customer.id, { executive_summary: html });
    expect(status).toBe(200);
    expect((await fromFile(customer.id)).executive_summary).toBe(html);
  });

  it("API-SUMM-001 sets summary_last_modified to now", async () => {
    const [customer] = await customers();
    const before = stamp();
    await save(customer.id, { executive_summary: "<p>Updated</p>" });
    const after = stamp();
    const saved = (await fromFile(customer.id)).summary_last_modified;
    expect(saved).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/);
    expect(saved >= before && saved <= after).toBe(true);
    expect(saved).not.toBe(customer.summary_last_modified);
  });

  it("API-SUMM-001 returns { id, summary_last_modified } matching what was saved", async () => {
    const [customer] = await customers();
    const { status, body } = await save(customer.id, { executive_summary: "<p>Shape</p>" });
    expect(status).toBe(200);
    expect(body).toEqual({ id: customer.id, summary_last_modified: expect.any(String) });
    expect(body.summary_last_modified).toBe((await fromFile(customer.id)).summary_last_modified);
  });

  it("API-SUMM-001 stores a blank summary as null and still stamps the time", async () => {
    const withSummary = (await customers()).filter((c) => c.executive_summary);
    expect(withSummary.length).toBeGreaterThanOrEqual(2);
    for (const [customer, blank] of [[withSummary[0], ""], [withSummary[1], "   \n "]] as const) {
      const before = stamp();
      const { status } = await save(customer.id, { executive_summary: blank });
      expect(status).toBe(200);
      const saved = await fromFile(customer.id);
      expect(saved.executive_summary).toBeNull();
      expect(saved.summary_last_modified >= before).toBe(true);
    }
  });

  it("API-SUMM-001 changes only the named customer", async () => {
    const [target, ...others] = await customers();
    await save(target.id, { executive_summary: "<p>Only me</p>" });
    const reread = (await api.reopen()<Customer[]>("GET", "/api/workbook/table/customer")).body;
    expect(reread.filter((c) => c.id !== target.id)).toEqual(others);
  });

  it("API-SUMM-001 answers 404 when the customer does not exist and leaves the file unchanged", async () => {
    const before = sha(api.file);
    const { status, body } = await save(999999, { executive_summary: "<p>Nobody</p>" });
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Customer 999999 was not found." });
    expect(sha(api.file)).toBe(before);
  });
});

describe("POST /customers/:id/summary body check (API-SUMM-002)", () => {
  /** Posts a rejected body and checks the status, the message, the file bytes and the re-read customer. */
  const expectRejected = async (body: unknown, error: string) => {
    const withSummary = (await customers()).find((c) => c.executive_summary && c.summary_last_modified);
    expect(withSummary).toBeDefined();
    const customer = withSummary as Customer;
    const before = sha(api.file);
    const res = await save(customer.id, body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error });
    expect(sha(api.file)).toBe(before);
    const reread = await fromFile(customer.id);
    expect(reread.executive_summary).toBe(customer.executive_summary);
    expect(reread.summary_last_modified).toBe(customer.summary_last_modified);
    // The same running server (not just the file) must still serve the old values.
    const live = (await customers()).find((c) => c.id === customer.id);
    expect(live?.executive_summary).toBe(customer.executive_summary);
    expect(live?.summary_last_modified).toBe(customer.summary_last_modified);
  };

  it("API-SUMM-002 rejects a body without executive_summary with 400 and changes nothing", async () => {
    await expectRejected({}, "Missing: executive_summary");
  });

  it("API-SUMM-002 rejects a body whose other fields are present but executive_summary is absent", async () => {
    await expectRejected({ summary: "<p>Wrong field name</p>" }, "Missing: executive_summary");
  });

  it("API-SUMM-002 rejects a JSON body that is not an object with 400 and changes nothing", async () => {
    await expectRejected(null, "Missing: executive_summary");
  });

  it("API-SUMM-002 rejects a numeric executive_summary with 400 and changes nothing", async () => {
    await expectRejected({ executive_summary: 5 }, "executive_summary must be a string.");
  });

  it("API-SUMM-002 rejects a null executive_summary with 400 and changes nothing", async () => {
    await expectRejected({ executive_summary: null }, "executive_summary must be a string.");
  });

  it("API-SUMM-002 rejects a boolean executive_summary with 400 and changes nothing", async () => {
    await expectRejected({ executive_summary: true }, "executive_summary must be a string.");
  });

  it("API-SUMM-002 rejects an object executive_summary with 400 and changes nothing", async () => {
    await expectRejected({ executive_summary: { html: "<p>x</p>" } }, "executive_summary must be a string.");
  });

  it("API-SUMM-002 still clears the summary for an explicit empty string (200, stored as null)", async () => {
    const customer = (await customers()).find((c) => c.executive_summary) as Customer;
    expect(customer).toBeDefined();
    const before = stamp();
    const { status } = await save(customer.id, { executive_summary: "" });
    expect(status).toBe(200);
    const saved = await fromFile(customer.id);
    expect(saved.executive_summary).toBeNull();
    expect(saved.summary_last_modified >= before).toBe(true);
  });

  it("API-SUMM-002 answers 400, not 404, for an unknown customer when the body fails the check", async () => {
    const before = sha(api.file);
    const missing = await save(999999, {});
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ error: "Missing: executive_summary" });
    const wrongType = await save(999999, { executive_summary: 5 });
    expect(wrongType.status).toBe(400);
    expect(wrongType.body).toEqual({ error: "executive_summary must be a string." });
    expect(sha(api.file)).toBe(before);
  });

  it("API-SUMM-002 keeps answering 404 for an unknown customer when the body is valid", async () => {
    const { status, body } = await save(999999, { executive_summary: "" });
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Customer 999999 was not found." });
  });
});
