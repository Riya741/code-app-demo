// @vitest-environment node
// Read-only agent tools and the tool allow-list (spec 024-agent-ops, AOPS-R1). Task AOPS-T02.
//
// Runs against the generated 8-customer fixture (harness.ts): each test gets its own temp copy of it. Where a test needs
// data the fixture may not have (a long note, an email in a note, a deleted row, more than 50 use cases), it changes the
// rows of its own in-memory Store only; nothing is ever saved, and the byte-identical test proves the tools never write.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { describe, expect, it } from "vitest";
// Aliased: the React hooks lint rule treats any `use…` call in a loop as a hook.
import { Store, eventsByParent, useCasesByParent as liveUseCases } from "../../server/workbook";
import {
  AGENT_TOOL_ALLOWLIST,
  LIST_TEXT_MAX,
  PAGE_SIZE_MAX,
  RESULT_CHARS_MAX,
  RedactionTally,
  SNIPPET_MAX,
  STAGE_MAX,
  TEXT_MAX,
  TOOLS,
  TOOL_NAMES,
  buildToolSet,
  callTool,
  modelToolDefinitions,
  redact,
  runTool,
  type ToolContext,
  type ToolResult,
} from "../../server/ai/tools";
import { ROOT, workbookApi } from "./harness";

type Row = Record<string, unknown>;

const api = workbookApi();
const sha = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function open(): Promise<Store> {
  const store = new Store(api.file);
  await store.fresh();
  return store;
}

const rows = (store: Store, sheet: string) => store.table(sheet).rows as Row[];

/** Two customers that each have live use cases and live events, so scope can be tested across them. */
function customersWithActivity(store: Store): number[] {
  return rows(store, "customer")
    .map((c) => c.id as number)
    .filter((id) => liveUseCases(store, id).length > 0 && eventsByParent(store, id).length > 0);
}

function ok(result: ToolResult) {
  if (result.outcome !== "ok") throw new Error(`expected ok, got ${result.outcome}: ${result.is_error ? result.message : ""}`);
  return result.content as Row;
}

/** A store stand-in that fails on any read: proves a refused call never reached the workbook. */
const untouchable = { fresh: () => Promise.reject(new Error("read")), table: () => { throw new Error("read"); } } as unknown as Store;

// fact-sheet.v1 is the contract the Analyst already reads; single-record tools return the same item shapes.
const factSheet = JSON.parse(fs.readFileSync(path.join(ROOT, "spec", "contracts", "fact-sheet.v1.schema.json"), "utf8"));
const UC_KEYS = Object.keys(factSheet.properties.use_cases.items.properties).sort();
const EV_KEYS = Object.keys(factSheet.properties.events.items.properties).sort();

describe("tool allow-list", () => {
  it("AOPS-ORCH-004 grants each runtime agent exactly the tools its agent spec lists", () => {
    const dir = path.join(ROOT, "spec", "agents");
    const fromSpecs: Record<string, string[]> = {};
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md")) {
      const text = fs.readFileSync(path.join(dir, file), "utf8");
      if (text.match(/\*\*Kind:\*\*\s*(\w+)/)?.[1] !== "runtime") continue;
      const id = text.match(/\*\*ID:\*\*\s*(AGENT-[A-Z-]+)/)![1];
      const section = text.split(/^## Tools\s*$/m)[1].split(/^## /m)[0];
      fromSpecs[id] = [...section.matchAll(/`([a-z_]+)\(/g)].map((m) => m[1]).sort();
    }
    // Only the Analyst and the Writer are runtime agents since CR-20261121-1; code steps have no spec and no tools.
    expect(Object.keys(fromSpecs).sort()).toEqual(["AGENT-ANALYST", "AGENT-WRITER"]);
    const granted = Object.fromEntries(Object.entries(AGENT_TOOL_ALLOWLIST).map(([id, tools]) => [id, [...tools].sort()]));
    expect(granted).toEqual(fromSpecs);
    expect(fromSpecs["AGENT-ANALYST"]).toEqual(["get_event", "get_use_case"]);
    for (const name of Object.values(fromSpecs).flat()) expect(TOOL_NAMES).toContain(name);
  });

  it("AOPS-ORCH-004 offers the model only the tools the agent's spec lists, each strict", () => {
    const ctx: ToolContext = { store: untouchable };
    const analyst = modelToolDefinitions(buildToolSet("AGENT-ANALYST", ctx));
    expect(analyst.map((t) => t.name)).toEqual(["get_use_case", "get_event"]);
    expect(analyst.every((t) => t.strict === true)).toBe(true);
    expect(modelToolDefinitions(buildToolSet("AGENT-WRITER", ctx))).toEqual([]);
    expect(modelToolDefinitions(buildToolSet("code:retriever", ctx))).toEqual([]);
    expect(modelToolDefinitions(buildToolSet("code:guard", ctx))).toEqual([]);
  });

  it("AOPS-ORCH-004 refuses a tool the agent's spec does not list with outcome tool_denied, without reading the workbook", async () => {
    const analyst = buildToolSet("AGENT-ANALYST", { store: untouchable });
    const writer = buildToolSet("AGENT-WRITER", { store: untouchable });
    const attempts: [typeof analyst, unknown, unknown][] = [
      [analyst, "list_use_cases", { customer_id: 1 }], // registered, but not in the Analyst's spec
      [analyst, "list_events", { customer_id: 1 }],
      [analyst, "save_use_case", { id: 1 }], // no such tool
      [analyst, "constructor", {}],
      [analyst, "__proto__", {}],
      [analyst, 42, {}],
      [writer, "get_use_case", { fact_id: "UC-1" }], // the Writer's spec lists no tools
    ];
    for (const [set, name, input] of attempts) {
      const result = await callTool(set, name, input);
      expect(result).toMatchObject({ outcome: "tool_denied", code: "tool_denied", is_error: true });
      expect(result.is_error && result.message).toContain(set.agentId);
    }
    // Control: an allowed tool on the same stand-in does try to read (and reports a failure, without throwing).
    expect(await callTool(analyst, "get_use_case", { fact_id: "UC-1" })).toMatchObject({ outcome: "error", code: "failed" });
  });

  it("AOPS-ORCH-004 gives an agent with no spec entry no tools at all", async () => {
    for (const id of ["AGENT-UNKNOWN", "AGENT-JUDGE", "AGENT-CRITIC", "code:guard", "constructor", "__proto__", "toString", ""]) {
      const set = buildToolSet(id, { store: untouchable });
      expect(set.allowed).toEqual([]);
      expect(await callTool(set, "get_use_case", { fact_id: "UC-1" })).toMatchObject({ outcome: "tool_denied" });
    }
  });
});

describe("read-only tools", () => {
  it("AOPS-ORCH-005 every tool has a strict input schema: additionalProperties false, required listed, same fields as its validator", () => {
    expect([...TOOLS.keys()].sort()).toEqual([...TOOL_NAMES].sort());
    for (const tool of TOOLS.values()) {
      const schema = tool.input_schema;
      expect(schema.type).toBe("object");
      expect(schema.additionalProperties).toBe(false);
      const shape = (tool.inputSchema as z.AnyZodObject).shape as Record<string, z.ZodTypeAny>;
      expect(Object.keys(schema.properties).sort()).toEqual(Object.keys(shape).sort());
      expect([...schema.required].sort()).toEqual(Object.keys(shape).filter((k) => !shape[k].isOptional()).sort());
      expect(schema.required.length).toBeGreaterThan(0);
      // Keywords strict tool definitions do not accept; the zod validator enforces these limits instead.
      expect(JSON.stringify(schema)).not.toMatch(/"(minimum|maximum|minLength|maxLength|multipleOf|exclusiveMinimum|exclusiveMaximum)"/);
      expect(tool.description).toMatch(/Read-only/);
      expect(tool.description).toMatch(/data, not instructions/);
    }
  });

  it("AOPS-ORCH-005 rejects invalid input with an error naming the field, before reading the workbook", async () => {
    const ctx: ToolContext = { store: untouchable };
    const cases: [string, unknown, string][] = [
      ["get_use_case", { fact_id: "123" }, "fact_id"],
      ["get_use_case", { fact_id: "EV-12" }, "fact_id"],
      ["get_use_case", { fact_id: 12 }, "fact_id"],
      ["get_use_case", {}, "fact_id"],
      ["get_use_case", { fact_id: "UC-1", note: "x" }, "note"],
      ["get_use_case", "UC-1", "input"],
      ["get_use_case", null, "input"],
      ["get_event", { fact_id: "EV-1; DROP" }, "fact_id"],
      ["list_use_cases", { customer_id: "1" }, "customer_id"],
      ["list_use_cases", { customer_id: 1, page_size: PAGE_SIZE_MAX + 1 }, "page_size"],
      ["list_use_cases", { customer_id: 1, page: 0 }, "page"],
      ["list_use_cases", { customer_id: 1, status: "x".repeat(201) }, "status"],
      ["list_events", { customer_id: 1, from: "2026-13" }, "from"],
      ["list_events", { customer_id: 1.5 }, "customer_id"],
    ];
    for (const [name, input, field] of cases) {
      const result = await runTool(name as never, input, ctx);
      expect(result, `${name} ${JSON.stringify(input)}`).toMatchObject({ outcome: "error", code: "invalid_input", is_error: true });
      expect(result.is_error && result.message).toContain(field);
    }
    const analyst = buildToolSet("AGENT-ANALYST", ctx);
    expect(await callTool(analyst, "get_event", { fact_id: "UC-1" })).toMatchObject({ code: "invalid_input" });
  });

  it("AOPS-ORCH-005 get_use_case returns only the allow-listed fields of a live use case, matching the app's read model", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const { body } = await api.request<Row[]>("GET", `/api/workbook/use-cases?parentId=${customer}`);
    const analyst = buildToolSet("AGENT-ANALYST", { store, customerId: customer });
    for (const row of body.slice(0, 5)) {
      const content = ok(await callTool(analyst, "get_use_case", { fact_id: `UC-${row.id}` }));
      const record = content.record as Row;
      expect(Object.keys(content).sort()).toEqual(["record", "redactions"]);
      expect(Object.keys(record).sort()).toEqual(UC_KEYS);
      expect(record.fact_id).toBe(`UC-${row.id}`);
      expect(record.solution).toBe(row.solution_name ?? "");
      expect(record.status).toBe(row.status);
      expect(record.subsidiary).toBe(row.subsidiary_name ?? "");
      expect(record.department).toBe(row.department_name);
      expect(record.is_live).toBe(/\blive\b/i.exec(String(row.status ?? "")) !== null);
    }
  });

  it("AOPS-ORCH-005 never returns emails, attendee names, IDs, summaries or legacy columns", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const ctx: ToolContext = { store, customerId: customer };
    const ucs = liveUseCases(store, customer);
    const evs = eventsByParent(store, customer);
    const outputs = [
      ...(await Promise.all(ucs.slice(0, 5).map((r) => runTool("get_use_case", { fact_id: `UC-${r.id}` }, ctx)))),
      ...(await Promise.all(evs.slice(0, 5).map((r) => runTool("get_event", { fact_id: `EV-${r.id}` }, ctx)))),
      await runTool("list_use_cases", { customer_id: customer, page_size: PAGE_SIZE_MAX }, ctx),
      await runTool("list_events", { customer_id: customer, page_size: PAGE_SIZE_MAX }, ctx),
    ].map((r) => JSON.stringify(ok(r)));

    const emails = [...rows(store, "personnel"), ...rows(store, "stakeholder")].map((r) => String(r.email ?? "")).filter(Boolean);
    expect(emails.length).toBeGreaterThan(0);
    const summary = rows(store, "customer").find((c) => c.id === customer)?.executive_summary;
    const banned = ['"email"', '"attendee_names"', '"executive_summary"', '"personnel_ids"', '"stakeholder_id"', '"stakeholder_title"',
      '"parent_id"', '"blocker_names"', '"fde_request_notes"', '"jira_id"', '"deleted"', '"last_modified"', '"note"', '"meeting_notes"'];
    for (const out of outputs) {
      for (const e of emails) expect(out).not.toContain(e);
      for (const key of banned) expect(out).not.toContain(`${key}:`);
      if (typeof summary === "string" && summary.length > 40) expect(out).not.toContain(summary);
    }
    const event = ok(await runTool("get_event", { fact_id: `EV-${evs[0].id}` }, ctx)).record as Row;
    expect(Object.keys(event).sort()).toEqual(EV_KEYS);
    const list = ok(await runTool("list_use_cases", { customer_id: customer }, ctx));
    for (const item of list.items as Row[]) expect(Object.keys(item).sort()).toEqual(UC_KEYS);
  });

  it("AOPS-ORCH-005 never returns soft-deleted records or records of another customer", async () => {
    const store = await open();
    const [a, b] = customersWithActivity(store);
    const scoped: ToolContext = { store, customerId: a };
    const [ucA] = liveUseCases(store, a);
    const [evA] = eventsByParent(store, a);
    const [ucB] = liveUseCases(store, b);
    const [evB] = eventsByParent(store, b);

    // Another customer's records, from a tool set scoped to customer A.
    expect(await runTool("get_use_case", { fact_id: `UC-${ucB.id}` }, scoped)).toMatchObject({ outcome: "error", code: "not_found" });
    expect(await runTool("get_event", { fact_id: `EV-${evB.id}` }, scoped)).toMatchObject({ outcome: "error", code: "not_found" });
    expect(await runTool("list_use_cases", { customer_id: b }, scoped)).toMatchObject({ outcome: "error", code: "not_found" });
    expect(await runTool("list_events", { customer_id: b }, scoped)).toMatchObject({ outcome: "error", code: "not_found" });
    expect(await runTool("get_use_case", { fact_id: "UC-999999999" }, scoped)).toMatchObject({ code: "not_found" });

    // Soft-deleted rows (in memory only), scoped and unscoped.
    rows(store, "use_case").find((r) => r.id === ucA.id)!.deleted = true;
    rows(store, "event").find((r) => r.id === evA.id)!.deleted = true;
    for (const ctx of [scoped, { store }]) {
      expect(await runTool("get_use_case", { fact_id: `UC-${ucA.id}` }, ctx)).toMatchObject({ code: "not_found" });
      expect(await runTool("get_event", { fact_id: `EV-${evA.id}` }, ctx)).toMatchObject({ code: "not_found" });
      const ucs = ok(await runTool("list_use_cases", { customer_id: a, page_size: PAGE_SIZE_MAX }, ctx));
      const evs = ok(await runTool("list_events", { customer_id: a, page_size: PAGE_SIZE_MAX }, ctx));
      expect((ucs.items as Row[]).map((r) => r.fact_id)).not.toContain(`UC-${ucA.id}`);
      expect((evs.items as Row[]).map((r) => r.fact_id)).not.toContain(`EV-${evA.id}`);
    }
  });

  it("AOPS-ORCH-005 caps free text at 1500 characters for one record and 300 in lists, and lists the truncation", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const ctx: ToolContext = { store, customerId: customer };
    const [uc] = liveUseCases(store, customer);
    const [ev] = eventsByParent(store, customer);
    const ucRow = rows(store, "use_case").find((r) => r.id === uc.id)!;
    ucRow.note = "A".repeat(4000);
    ucRow.value_snippet = "V".repeat(2000);
    rows(store, "event").find((r) => r.id === ev.id)!.meeting_notes = "B".repeat(4000);

    const one = ok(await runTool("get_use_case", { fact_id: `UC-${uc.id}` }, ctx));
    expect((one.record as Row).text).toBe("A".repeat(TEXT_MAX));
    expect((one.record as Row).value_snippet).toBe("V".repeat(SNIPPET_MAX));
    expect(one.redactions).toContainEqual({ kind: "truncated", count: 2 });
    const oneEvent = ok(await runTool("get_event", { fact_id: `EV-${ev.id}` }, ctx));
    expect(((oneEvent.record as Row).text as string).length).toBe(TEXT_MAX);

    const list = ok(await runTool("list_use_cases", { customer_id: customer, page_size: PAGE_SIZE_MAX }, ctx));
    const item = (list.items as Row[]).find((r) => r.fact_id === `UC-${uc.id}`)!;
    expect(item.text).toBe("A".repeat(LIST_TEXT_MAX));
    const events = ok(await runTool("list_events", { customer_id: customer, page_size: PAGE_SIZE_MAX }, ctx));
    expect(((events.items as Row[]).find((r) => r.fact_id === `EV-${ev.id}`)!.text as string).length).toBe(LIST_TEXT_MAX);
    expect(list.redactions).toContainEqual(expect.objectContaining({ kind: "truncated" }));
  });

  it("AOPS-ORCH-005 caps a list page at 50 items and pages through every live record once", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const ctx: ToolContext = { store, customerId: customer };
    // Grow the customer to more than 50 live use cases (in memory only).
    const sheet = rows(store, "use_case");
    const template = sheet.find((r) => r.parent_id === customer && r.deleted !== true)!;
    let next = Math.max(...sheet.map((r) => Number(r.id) || 0)) + 1;
    for (let i = 0; i < 2 * PAGE_SIZE_MAX + 5; i++) sheet.push({ ...template, id: next, use_case_id: next++ });
    const live = liveUseCases(store, customer).map((r) => `UC-${r.id}`);
    expect(live.length).toBeGreaterThan(2 * PAGE_SIZE_MAX);

    const seen: string[] = [];
    for (let page = 1; ; page++) {
      const result = ok(await runTool("list_use_cases", { customer_id: customer, page, page_size: PAGE_SIZE_MAX }, ctx));
      const items = result.items as Row[];
      expect(items.length).toBeLessThanOrEqual(PAGE_SIZE_MAX);
      expect(result.total).toBe(live.length);
      seen.push(...items.map((r) => String(r.fact_id)));
      if (!result.has_more) break;
      expect(items.length).toBe(PAGE_SIZE_MAX);
    }
    expect(seen).toEqual(live);
    const byDefault = ok(await runTool("list_use_cases", { customer_id: customer }, ctx));
    expect((byDefault.items as Row[]).length).toBeLessThanOrEqual(PAGE_SIZE_MAX);
    expect(await runTool("list_use_cases", { customer_id: customer, page_size: 51 }, ctx)).toMatchObject({ code: "invalid_input" });
  });

  it("AOPS-ORCH-005 refuses a result over 200 000 characters with result_too_large instead of returning it", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const ctx: ToolContext = { store, customerId: customer };
    // Every field is capped, so the page is filled to its caps with a character JSON writes as six ("\u0001"): a full
    // page of use cases with the longest allowed note, snippet and lookup names (in memory only).
    const ctrl = String.fromCharCode(1);
    const sheet = rows(store, "use_case");
    const template = sheet.find((r) => r.parent_id === customer && r.deleted !== true)!;
    Object.assign(template, { note: ctrl.repeat(4000), value_snippet: ctrl.repeat(4000), last_modified: "2100-01-01T00:00:00" });
    let next = Math.max(...sheet.map((r) => Number(r.id) || 0)) + 1;
    for (let i = 0; i < PAGE_SIZE_MAX; i++) sheet.push({ ...template, id: next, use_case_id: next++ });
    rows(store, "subsidiary").find((r) => r.id === template.subsidiary_id)!.subsidiary_name = ctrl.repeat(4000);
    rows(store, "solution").find((r) => r.id === template.solution_id)!.solution_name = ctrl.repeat(4000);
    expect(RESULT_CHARS_MAX).toBe(200_000);
    const result = await runTool("list_use_cases", { customer_id: customer, page_size: PAGE_SIZE_MAX }, ctx);
    expect(result).toMatchObject({ outcome: "error", code: "result_too_large", is_error: true });
    expect(JSON.stringify(result).length).toBeLessThan(1000);
    // A smaller page of the same records comes back, as the error message advises.
    const small = ok(await runTool("list_use_cases", { customer_id: customer, page_size: 5 }, ctx));
    expect((small.items as Row[]).length).toBe(5);
  });

  it("AIB-SAFE-003 get_event, list_events and get_use_case redact and cut event stage and lookup names, with an exact tally", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const ctx: ToolContext = { store, customerId: customer };
    const [uc] = liveUseCases(store, customer);
    const [ev] = eventsByParent(store, customer);
    const evRow = rows(store, "event").find((r) => r.id === ev.id)!;
    const ucRow = rows(store, "use_case").find((r) => r.id === uc.id)!;
    const tallyOf = (content: Row) => Object.fromEntries((content.redactions as { kind: string; count: number }[]).map((r) => [r.kind, r.count]));
    const delta = (after: Row, before: Row) => {
      const a = tallyOf(after);
      const b = tallyOf(before);
      return Object.fromEntries(Object.keys(a).map((k) => [k, a[k] - (b[k] ?? 0)]).filter(([, n]) => n !== 0));
    };
    const evBefore = ok(await runTool("get_event", { fact_id: `EV-${ev.id}` }, ctx));
    const ucBefore = ok(await runTool("get_use_case", { fact_id: `UC-${uc.id}` }, ctx));

    // In memory only: free text in Stage, and an email in two lookup names.
    evRow.stage = `Call ann@example.org or 5551234567 ${"S".repeat(3000)}`;
    rows(store, "event_type").find((r) => r.id === evRow.event_type_id)!.event_type = "Workshop team@example.com";
    rows(store, "solution").find((r) => r.id === ucRow.solution_id)!.solution_name = "Suite ops@example.com";
    const stage = `Call [email] or [phone] ${"S".repeat(STAGE_MAX - 24)}`;

    const evAfter = ok(await runTool("get_event", { fact_id: `EV-${ev.id}` }, ctx));
    const record = evAfter.record as Row;
    expect(record.stage).toBe(stage);
    expect((record.stage as string).length).toBe(STAGE_MAX);
    expect(record.event_type).toBe("Workshop [email]");
    expect(delta(evAfter, evBefore)).toEqual({ email: 2, phone: 1, truncated: 1 });

    const list = ok(await runTool("list_events", { customer_id: customer, page_size: PAGE_SIZE_MAX }, ctx));
    expect((list.items as Row[]).find((r) => r.fact_id === `EV-${ev.id}`)!.stage).toBe(stage);

    const ucAfter = ok(await runTool("get_use_case", { fact_id: `UC-${uc.id}` }, ctx));
    expect((ucAfter.record as Row).solution).toBe("Suite [email]");
    expect(delta(ucAfter, ucBefore)).toEqual({ email: 1 });

    for (const out of [evAfter, list, ucAfter].map((c) => JSON.stringify(c))) {
      for (const leaked of ["ann@", "team@", "ops@", "5551234567"]) expect(out).not.toContain(leaked);
    }
  });

  it("AOPS-ORCH-005 redacts emails, phone numbers and query-string links in returned text and lists them", async () => {
    const store = await open();
    const [customer] = customersWithActivity(store);
    const ctx: ToolContext = { store, customerId: customer };
    const [uc] = liveUseCases(store, customer);
    rows(store, "use_case").find((r) => r.id === uc.id)!.note =
      "Call Jo on +44 20 7946 0958 or jo.smith@example.com, see https://example.com/deck?token=abc. Launch 2026-01-03 for 120 users.";

    const record = ok(await runTool("get_use_case", { fact_id: `UC-${uc.id}` }, ctx));
    const text = (record.record as Row).text as string;
    expect(text).toBe("Call Jo on [phone] or [email], see [link]. Launch 2026-01-03 for 120 users.");
    expect(record.redactions).toEqual([
      { kind: "email", count: 1 },
      { kind: "phone", count: 1 },
      { kind: "link", count: 1 },
    ]);

    const tally = new RedactionTally();
    expect(redact("(555) 123-4567 and 555-123-4567", tally)).toBe("[phone] and [phone]");
    expect(redact("Calls on 2026-01-03 2026-01-10, 1,500 credits, $10M", tally)).toBe("Calls on 2026-01-03 2026-01-10, 1,500 credits, $10M");
    expect(redact("https://example.com/page without a query", tally)).toBe("https://example.com/page without a query");
    expect(tally.list()).toEqual([{ kind: "phone", count: 2 }]);
  });

  it("AOPS-ORCH-005 calling every tool leaves the workbook file byte-identical and the read model unchanged", async () => {
    const before = sha(api.file);
    const mtime = fs.statSync(api.file).mtimeMs;
    const dir = fs.readdirSync(path.dirname(api.file)).sort();
    const store = await open();
    const snapshot = JSON.stringify([...store.sheets]);
    const called = new Set<string>();

    for (const customer of customersWithActivity(store)) {
      const ctx: ToolContext = { store, customerId: customer };
      const analyst = buildToolSet("AGENT-ANALYST", ctx);
      for (const r of liveUseCases(store, customer)) {
        ok(await callTool(analyst, "get_use_case", { fact_id: `UC-${r.id}` }));
        called.add("get_use_case");
      }
      for (const r of eventsByParent(store, customer)) {
        ok(await callTool(analyst, "get_event", { fact_id: `EV-${r.id}` }));
        called.add("get_event");
      }
      ok(await runTool("list_use_cases", { customer_id: customer, page_size: PAGE_SIZE_MAX }, { store }));
      ok(await runTool("list_events", { customer_id: customer, from: "2000-01-01", to: "2100-12-31" }, { store }));
      called.add("list_use_cases").add("list_events");
      // Refused and invalid calls too.
      await callTool(analyst, "list_use_cases", { customer_id: customer });
      await callTool(analyst, "get_use_case", { fact_id: "nope" });
    }

    expect([...called].sort()).toEqual([...TOOL_NAMES].sort());
    expect(JSON.stringify([...store.sheets])).toBe(snapshot);
    expect(sha(api.file)).toBe(before);
    expect(fs.statSync(api.file).mtimeMs).toBe(mtime);
    expect(fs.readdirSync(path.dirname(api.file)).sort()).toEqual(dir);
  });

  it("AOPS-ORCH-005 tools.ts uses only the workbook's read functions and no write path", () => {
    const source = fs.readFileSync(path.join(ROOT, "server", "ai", "tools.ts"), "utf8");
    const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[0]);
    expect(imports).toEqual(['import { z } from "zod";', 'import { eventsByParent, useCasesByParent, type Store } from "../workbook";']);
    expect(source).not.toMatch(/\.save\(|saveUseCase|saveEvent|saveSummary|softDelete|relink|writeFile|appendFile|renameSync|rmSync|unlink|mkdir|createWriteStream/);
  });
});
