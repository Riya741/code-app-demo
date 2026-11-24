// @vitest-environment node
// workbook-mcp change-request tool and read-only default (spec 025-mcp-tooling MCP-SRV-006, MCP-SEC-002). Task MCP-T04.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Store } from "../../server/workbook";
import { loadConfig, type McpConfig } from "../../mcp/workbook-mcp/src/config";
import { PathGuard, type McpTool } from "../../mcp/workbook-mcp/src/guard";
import { createServer, TOOLS } from "../../mcp/workbook-mcp/src/index";
import { makeProposeChangeRequest, slugOf, SPEC_TOOLS } from "../../mcp/workbook-mcp/src/specTools";
import { workbookApi } from "../integration/harness";

const repoRoot = path.resolve(__dirname, "..", "..");
// Requirement IDs of the fixture spec set, built at run time: spec lint (check 9) reads every ID written in a test file
// as a citation of a real requirement, and these are fixture data.
const fixtureId = (n: number) => ["ALP", "CORE", String(n).padStart(3, "0")].join("-");
const KNOWN = fixtureId(1);
const UNKNOWN = fixtureId(77);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-cr-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

let repo = "";
const changes = () => path.join(repo, "spec", "changes");
const crFiles = () => fs.readdirSync(changes()).filter((f) => f.startsWith("CR-")).sort();

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(tmp, "repo-"));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
    fs.writeFileSync(path.join(repo, rel), text);
  };
  write("spec/specs/001-alpha/requirements.md", `#### ${KNOWN}: Known\n- **Status:** 📝 Planned\n- **Criterion:** THE app SHALL work.\n`);
  write(
    "spec/specs/001-alpha/tasks.md",
    `**Retired tasks:** ALP-T09 (gone)\n- [ ] **ALP-T01** Do it.\n  - Status: ⬜ Not started · Covers: ${KNOWN}\n`,
  );
  write("spec/changes/CR-20261124-1-existing.md", "# Change Request: existing\n");
  write("spec/changes/CR-20261123-4-older.md", "# Change Request: older\n");
  write("spec/templates/change-request.md", fs.readFileSync(path.join(repoRoot, "spec", "templates", "change-request.md"), "utf8"));
});

const config = (env: Record<string, string> = {}): McpConfig => ({ ...loadConfig(env, repo), auditPath: path.join(tmp, "audit.jsonl") });
const NOV_24 = () => new Date(2026, 10, 24, 15, 30);

async function client(env: Record<string, string>, tools: readonly McpTool[] = [...SPEC_TOOLS.filter((t) => t.name !== "propose_change_request"), makeProposeChangeRequest({ now: NOV_24 })], workbook?: Store) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer({ config: config(env), tools, workbook }).connect(serverSide);
  const c = new Client({ name: "test", version: "1.0.0" });
  await c.connect(clientSide);
  return c;
}

const WRITE = { MCP_ALLOW_WRITE: "1" };
const valid = { title: "Export events to CSV", problem: "Events cannot be exported today.", behaviour: "Add an Export CSV button to the events panel." };
type Result = { content: { text: string }[]; isError?: boolean };
const propose = async (c: Client, args: Record<string, unknown>) => (await c.callTool({ name: "propose_change_request", arguments: args })) as Result;
const refusal = async (c: Client, args: Record<string, unknown>) => {
  const r = await propose(c, args);
  expect(r.isError).toBe(true);
  return r.content[0].text;
};

describe("read-only by default", () => {
  it("MCP-SEC-002 does not list or run propose_change_request unless MCP_ALLOW_WRITE is exactly 1", async () => {
    for (const env of [{}, { MCP_ALLOW_WRITE: "0" }, { MCP_ALLOW_WRITE: "true" }, { MCP_ALLOW_WRITE: "yes" }, { MCP_ALLOW_WRITE: " 1" }]) {
      expect(config(env).allowWrite).toBe(false);
      const c = await client(env, TOOLS);
      expect((await c.listTools()).tools.map((t) => t.name)).not.toContain("propose_change_request");
      expect(await propose(c, valid)).toEqual({ content: [{ type: "text", text: "Unknown tool." }], isError: true });
    }
    expect(crFiles()).toEqual(["CR-20261123-4-older.md", "CR-20261124-1-existing.md"]);
    const on = await client(WRITE, TOOLS);
    expect((await on.listTools()).tools.map((t) => t.name)).toContain("propose_change_request");
    // Every other registered tool is read-only.
    expect(TOOLS.filter((t) => t.writes).map((t) => t.name)).toEqual(["propose_change_request"]);
  });

  it("MCP-SEC-002 never writes the workbook, with writes enabled or not", async () => {
    // The only file writes in the server: the change request (to an allow-listed write path) and the audit log.
    const src = path.join(repoRoot, "mcp", "workbook-mcp", "src");
    const code = fs.readdirSync(src).map((f) => [f, fs.readFileSync(path.join(src, f), "utf8")] as const);
    const writes = code.flatMap(([f, text]) => (text.match(/fs\.(writeFileSync|appendFileSync|writeFile|appendFile|renameSync|copyFileSync|rmSync|unlinkSync)\([^,]*/g) ?? []).map((m) => `${f}: ${m}`));
    expect(writes).toEqual(["guard.ts: fs.appendFileSync(this.file", "specTools.ts: fs.writeFileSync(target"]);
    expect(code.some(([, text]) => /\.save\(/.test(text))).toBe(false);
    // The write path is the allow-list's write mode, which refuses the workbook (and everything outside spec/changes/).
    const guard = new PathGuard(config(WRITE));
    expect(() => guard.resolve(config(WRITE).workbookPath, "write")).toThrowError("Path outside allow-list.");
  });
});

describe("workbook stays byte-identical", () => {
  const api = workbookApi();
  it("MCP-SEC-002 calling every tool with MCP_ALLOW_WRITE=1 leaves the workbook file unchanged", async () => {
    const sha = () => crypto.createHash("sha256").update(fs.readFileSync(api.file)).digest("hex");
    const before = sha();
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createServer({ config: { ...loadConfig({ ...WRITE, WORKBOOK_PATH: api.file }, repo), auditPath: path.join(tmp, "audit.jsonl") } }).connect(serverSide);
    const c = new Client({ name: "test", version: "1.0.0" });
    await c.connect(clientSide);
    const store = new Store(api.file);
    await store.fresh();
    const id = store.table("customer").rows[0].id as number;
    for (const [name, args] of [
      ["search_customers", { query: String(id) }],
      ["get_customer_facts", { customer_id: id }],
      ["list_use_cases", { customer_id: id }],
      ["list_events", { customer_id: id }],
      ["propose_change_request", valid],
    ] as const) {
      const r = (await c.callTool({ name, arguments: args })) as Result;
      expect(r.isError, `${name}: ${r.content[0].text}`).toBeUndefined();
    }
    expect(sha()).toBe(before);
  });
});

describe("propose_change_request", () => {
  it("MCP-SRV-006 writes a new CR file from the template under spec/changes/ and returns its path", async () => {
    const c = await client(WRITE);
    const r = await propose(c, valid);
    expect(JSON.parse(r.content[0].text)).toEqual({ id: "CR-20261124-2", path: "spec/changes/CR-20261124-2-export-events-to-csv.md" });
    const text = fs.readFileSync(path.join(changes(), "CR-20261124-2-export-events-to-csv.md"), "utf8");
    expect(text).toContain("# Change Request: Export events to CSV\n");
    expect(text).toContain("- **ID:** CR-20261124-2\n");
    expect(text).toContain("· 2026-11-24");
    expect(text).toContain("- **Status:** Proposed, not reviewed.");
    expect(text).toContain("## 1. Problem\n```text\nEvents cannot be exported today.\n```");
    expect(text).toContain("## 2. Proposed behaviour\n```text\nAdd an Export CSV button to the events panel.\n```");
    expect(text).toContain("## 5. Review\n- [ ] requirements.md approved by:");
    // The next proposal the same day takes the next number; existing files are never overwritten.
    await propose(c, { ...valid, title: "Second idea" });
    expect(crFiles()).toEqual(["CR-20261123-4-older.md", "CR-20261124-1-existing.md", "CR-20261124-2-export-events-to-csv.md", "CR-20261124-3-second-idea.md"]);
    expect(fs.readFileSync(path.join(changes(), "CR-20261124-1-existing.md"), "utf8")).toBe("# Change Request: existing\n");
  });

  it("MCP-SRV-006 numbers from 1 on a new day and slugs any title into a file name inside spec/changes/", async () => {
    const tools = [makeProposeChangeRequest({ now: () => new Date(2026, 11, 2, 9) })];
    const c = await client(WRITE, tools);
    const r = JSON.parse((await propose(c, { ...valid, title: "../../../outside/escape" })).content[0].text);
    expect(r).toEqual({ id: "CR-20261202-1", path: "spec/changes/CR-20261202-1-outside-escape.md" });
    expect(fs.existsSync(path.join(changes(), "CR-20261202-1-outside-escape.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "outside"))).toBe(false);
    expect(slugOf("Café: résumé (v2) & more")).toBe("cafe-resume-v2-more");
    expect(slugOf("------")).toBe("change");
    expect(slugOf("a".repeat(80))).toHaveLength(40);
  });

  it("MCP-SRV-006 keeps free text as one fenced line, so it cannot become a heading, link or HTML", async () => {
    const c = await client(WRITE);
    await propose(c, { ...valid, problem: "Line one\n# Heading?\r\n[link](../../x.md) <!-- note -->\u0007 end" });
    const text = fs.readFileSync(path.join(changes(), crFiles().at(-1)!), "utf8");
    expect(text).toContain("```text\nLine one # Heading? [link](../../x.md) <!-- note --> end\n```");
    expect(await refusal(c, { ...valid, behaviour: "```\n## injected" })).toBe("Invalid input: behaviour: must not start a code fence");
  });

  it("MCP-SRV-006 refuses unknown requirement or task IDs, odd titles, oversize text and extra fields, writing nothing", async () => {
    const c = await client(WRITE);
    expect(await refusal(c, { ...valid, problem: `Breaks ${UNKNOWN} badly.` })).toBe(`Invalid input: problem: unknown requirement ${UNKNOWN}`);
    expect(await refusal(c, { ...valid, behaviour: "Reopen task ALP-T42 please." })).toBe("Invalid input: behaviour: unknown task ALP-T42");
    expect(await refusal(c, { ...valid, title: "Use `rm -rf`" })).toMatch(/^Invalid input: title: letters, digits/);
    expect(await refusal(c, { ...valid, title: "# Heading\nnext" })).toMatch(/^Invalid input: title: /);
    expect(await refusal(c, { ...valid, problem: "x".repeat(201) })).toBe("Invalid input: problem: at most 200 characters");
    expect(await refusal(c, { ...valid, problem: "short" })).toBe("Invalid input: problem: must be at least 10 characters");
    expect(await refusal(c, { ...valid, path: "spec/specs/001-alpha/requirements.md" })).toBe("Invalid input: path: not an allowed field");
    expect(crFiles()).toEqual(["CR-20261123-4-older.md", "CR-20261124-1-existing.md"]);
    // Known and retired IDs are fine.
    expect((await propose(c, { ...valid, problem: `Extends ${KNOWN} from ALP-T01 and ALP-T09.` })).isError).toBeUndefined();
  });

  it("MCP-SRV-006 is audited like every call, without the text it wrote", async () => {
    const c = await client(WRITE);
    await propose(c, { ...valid, problem: "CANARY-77ab in the problem text." });
    const last = JSON.parse(fs.readFileSync(path.join(tmp, "audit.jsonl"), "utf8").trim().split("\n").at(-1)!);
    expect(last).toMatchObject({ tool: "propose_change_request", outcome: "ok" });
    expect(fs.readFileSync(path.join(tmp, "audit.jsonl"), "utf8")).not.toContain("CANARY-77ab");
  });
});
