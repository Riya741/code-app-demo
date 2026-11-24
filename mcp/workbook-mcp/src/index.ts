/**
 * `workbook-mcp`: a local MCP server over stdio (spec 025-mcp-tooling, MCP-SRV-001; task MCP-T01).
 *
 * `createServer` registers `tools/list` and `tools/call`. Every call goes through `withControls` (guard.ts), so
 * validation, the path allow-list, the result cap and the audit line apply to every tool, including a call to a name
 * that is not registered. Tools are added by later tasks: data tools (MCP-T02), spec tools (MCP-T03), and the
 * change-request tool (MCP-T04). `main.ts` connects the server to stdio for `.mcp.json`.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, SERVER_NAME, SERVER_VERSION, type McpConfig } from "./config";
import { AuditLog, PathGuard, withControls, type McpTool } from "./guard";

/** The tools this server offers. Empty until MCP-T02..T04 add theirs. */
export const TOOLS: readonly McpTool[] = Object.freeze([]);

export interface ServerOptions {
  config?: McpConfig;
  tools?: readonly McpTool[];
  /** For tests: a fixed clock for audit durations. */
  now?: () => number;
}

export function createServer(options: ServerOptions = {}): Server {
  const config = options.config ?? loadConfig();
  const tools = new Map((options.tools ?? TOOLS).map((t) => [t.name, t] as const));
  const controls = { ctx: { config, paths: new PathGuard(config) }, audit: new AuditLog(config.auditPath), now: options.now };

  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...tools.values()].map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  }));

  // A Map, so a hostile name such as "constructor" never resolves to anything.
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    withControls(tools.get(request.params.name), request.params.arguments, controls),
  );

  return server;
}
