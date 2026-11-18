// @vitest-environment node
// Server integration harness (spec 021-quality). Task QA-T03.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ROOT, workbookApi } from "./harness";

const sha = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const inside = (dir: string, file: string) => !path.relative(path.resolve(dir), path.resolve(file)).startsWith("..");

const originalPath = process.env.WORKBOOK_PATH;
const api = workbookApi();

// WORKBOOK_PATH is put back after every test (checked once all tests and their afterEach hooks have run).
afterAll(() => expect(process.env.WORKBOOK_PATH).toBe(originalPath));

describe("fixture copy per test", () => {
  it("QA-TEST-003 serves a temp copy of the generated fixture through WORKBOOK_PATH", async () => {
    expect(process.env.WORKBOOK_PATH).toBe(api.file);
    expect(api.file).not.toBe(api.fixture);
    expect(inside(os.tmpdir(), api.file)).toBe(true);
    expect(inside(path.join(ROOT, "..", "data"), api.file)).toBe(false);
    expect(sha(api.file)).toBe(sha(api.fixture));

    const { status, body } = await api.request<{ file: string; tables: string[] }>("GET", "/api/workbook/health");
    expect(status).toBe(200);
    expect(body.file).toBe(path.resolve(api.file));
    expect(body.tables).toEqual(expect.arrayContaining(["customer", "use_case", "event", "subsidiary"]));
  });

  it("QA-TEST-003 uses the fixture generated with --customers 8", async () => {
    const { body } = await api.request<{ id: number }[]>("GET", "/api/workbook/table/customer");
    expect(body).toHaveLength(8);
  });

  it("QA-TEST-003 writes land in the test's copy, never in the fixture", async () => {
    const fixtureBefore = sha(api.fixture);
    const copyBefore = sha(api.file);
    const { body: live } = await api.request<{ id: number }[]>("GET", "/api/workbook/table/use_case?where=deleted:false");

    const del = await api.request("DELETE", `/api/workbook/use-cases/${live[0].id}`);
    expect(del.status).toBe(200);
    expect(sha(api.fixture)).toBe(fixtureBefore);
    expect(sha(api.file)).not.toBe(copyBefore);
  });
});

describe("isolation between tests (the two tests below run in order)", () => {
  let firstFile = "";
  let deletedId = 0;

  it("QA-TEST-003 isolation, part 1: a test deletes a use case in its copy", async () => {
    firstFile = api.file;
    const { body: live } = await api.request<{ id: number }[]>("GET", "/api/workbook/table/use_case?where=deleted:false");
    deletedId = live[0].id;
    expect((await api.request("DELETE", `/api/workbook/use-cases/${deletedId}`)).status).toBe(200);
  });

  it("QA-TEST-003 isolation, part 2: the next test gets a new copy where that use case is still live", async () => {
    expect(deletedId).toBeGreaterThan(0);
    expect(api.file).not.toBe(firstFile);
    expect(fs.existsSync(firstFile)).toBe(false); // the previous copy was cleaned up
    const { body } = await api.request<{ id: number; deleted: boolean }[]>("GET", `/api/workbook/table/use_case?where=id:${deletedId}`);
    expect(body).toHaveLength(1);
    expect(body[0].deleted).toBe(false);
  });
});
