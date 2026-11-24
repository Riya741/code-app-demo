// @vitest-environment node
// workbook-mcp server and registration (spec 025-mcp-tooling MCP-SRV-001, MCP-SEC-007). Task MCP-T01.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig } from "../../mcp/workbook-mcp/src/config";
import { defineTool } from "../../mcp/workbook-mcp/src/guard";
import { createServer, TOOLS } from "../../mcp/workbook-mcp/src/index";

const repoRoot = path.resolve(__dirname, "..", "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-server-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const auditPath = path.join(tmp, "mcp-audit.jsonl");
const config = { ...loadConfig({}, repoRoot), auditPath };

const sample = defineTool({
  name: "sample_tool",
  description: "Sample tool for the server test.",
  schema: z.object({ id: z.string().regex(/^[A-Z]{2,6}-\d{3}$/, "must look like ABC-123") }).strict(),
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "An ID", pattern: "^[A-Z]{2,6}-\\d{3}$" } },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async ({ id }) => ({ id }),
});

async function connected(tools = TOOLS) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer({ config, tools }).connect(serverSide);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}

describe("local stdio server", () => {
  it("MCP-SRV-001 answers initialize as workbook-mcp with the tools capability and lists its registered tools", async () => {
    const client = await connected([sample]);
    expect(client.getServerVersion()?.name).toBe("workbook-mcp");
    expect(client.getServerCapabilities()?.tools).toBeDefined();
    const { tools } = await client.listTools();
    expect(tools).toEqual([{ name: "sample_tool", description: "Sample tool for the server test.", inputSchema: sample.inputSchema }]);
    await client.close();
  });

  it("MCP-SRV-001 routes every tools/call through the controls, including an unknown tool name", async () => {
    const client = await connected([sample]);
    expect(await client.callTool({ name: "sample_tool", arguments: { id: "MCP-001" } })).toMatchObject({
      content: [{ type: "text", text: '{"id":"MCP-001"}' }],
      structuredContent: { id: "MCP-001" },
    });
    expect(await client.callTool({ name: "sample_tool", arguments: { id: "../../.env" } })).toEqual({
      content: [{ type: "text", text: "Invalid input: id: must look like ABC-123" }],
      isError: true,
    });
    for (const name of ["no_such_tool", "constructor", "__proto__"]) {
      expect(await client.callTool({ name, arguments: {} })).toEqual({ content: [{ type: "text", text: "Unknown tool." }], isError: true });
    }
    const outcomes = fs
      .readFileSync(auditPath, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l).outcome);
    expect(outcomes).toEqual(["ok", "rejected", "rejected", "rejected", "rejected"]);
    await client.close();
  });

  it("MCP-SRV-001 starts over stdio from the command registered in the project's .mcp.json", async () => {
    const registration = JSON.parse(fs.readFileSync(path.join(repoRoot, ".mcp.json"), "utf8"));
    const server = registration.mcpServers.workbook;
    expect(server.type).toBe("stdio");
    const transport = new StdioClientTransport({ command: server.command, args: server.args, cwd: repoRoot, stderr: "pipe" });
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(transport);
    expect(client.getServerVersion()?.name).toBe("workbook-mcp");
    expect(Array.isArray((await client.listTools()).tools)).toBe(true);
    await client.close();
  }, 30_000);
});

describe("no secrets in configuration", () => {
  it("MCP-SEC-007 .mcp.json holds no environment values, keys or tokens", () => {
    const raw = fs.readFileSync(path.join(repoRoot, ".mcp.json"), "utf8");
    const registration = JSON.parse(raw);
    for (const server of Object.values<Record<string, unknown>>(registration.mcpServers)) {
      expect(server.env ?? {}).toEqual({});
      expect(server.headers).toBeUndefined();
    }
    expect(raw).not.toMatch(/api[_-]?key|token|secret|password|bearer|sk-[a-z0-9]/i);
    expect(raw).not.toMatch(/\.xlsx|WORKBOOK_PATH/);
  });

  it("MCP-SEC-007 takes the workbook path from WORKBOOK_PATH or the app's default, and reads no settings file", () => {
    expect(loadConfig({}, repoRoot).workbookPath).toBe(path.resolve(repoRoot, "..", "data", "code-app-data.xlsx"));
    expect(loadConfig({ WORKBOOK_PATH: "fixtures/demo.xlsx" }, repoRoot).workbookPath).toBe(path.resolve(repoRoot, "fixtures", "demo.xlsx"));
    expect(loadConfig({ WORKBOOK_PATH: "  " }, repoRoot).workbookPath).toBe(path.resolve(repoRoot, "..", "data", "code-app-data.xlsx"));
    expect(loadConfig({}, repoRoot).auditPath).toBe(path.resolve(repoRoot, "..", "data", "mcp-audit.jsonl"));
    const source = fs.readFileSync(path.join(repoRoot, "mcp", "workbook-mcp", "src", "config.ts"), "utf8");
    expect(source).not.toMatch(/readFileSync|dotenv|["'`/]\.env/);
  });
});
