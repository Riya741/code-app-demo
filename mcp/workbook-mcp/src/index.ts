/**
 * `workbook-mcp`: a local MCP server over stdio (spec 025-mcp-tooling, MCP-SRV-001; tasks MCP-T01, MCP-T03).
 *
 * `createServer` registers tools, resources and prompts. Every `tools/call` goes through `withControls` (guard.ts), so
 * validation, the path allow-list, the result cap and the audit line apply to every tool, including a call to a name
 * that is not registered. Resource reads and prompt requests are validated and audited the same way, under the fixed
 * labels "resources/read" and "prompts/get". Spec tools, resources and the prompt come from specTools.ts (MCP-T03);
 * data tools (MCP-T02) and the change-request tool (MCP-T04) are added by their tasks. `main.ts` connects to stdio.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, SERVER_NAME, SERVER_VERSION, type McpConfig } from "./config";
import { AuditLog, ControlError, MESSAGES, PathGuard, withControls, writeAudit, type Controls, type McpTool } from "./guard";
import {
  DRAFT_BRIEF_PROMPT,
  draftBriefMessages,
  listSpecResources,
  promptArgsSchema,
  readSpecResource,
  REQUIREMENTS_TEMPLATE,
  SPEC_TOOLS,
} from "./specTools";

/** The tools this server offers. Data tools (MCP-T02) and the change-request tool (MCP-T04) join later. */
export const TOOLS: readonly McpTool[] = Object.freeze([...SPEC_TOOLS]);

export interface ServerOptions {
  config?: McpConfig;
  tools?: readonly McpTool[];
  /** For tests: a fixed clock for audit durations. */
  now?: () => number;
}

/**
 * Runs a resource read or prompt request with an audit line; a refusal becomes an MCP protocol error with a short
 * reason (these methods have no error result). Fails closed if the audit line cannot be written.
 */
async function auditedRequest<T>(controls: Controls, label: string, rawArgs: unknown, run: () => T): Promise<T> {
  const now = controls.now ?? (() => performance.now());
  const started = now();
  let value: T | undefined;
  let failure: string | null = null;
  let outcome: "ok" | "rejected" | "error" = "ok";
  try {
    value = run();
  } catch (e) {
    outcome = e instanceof ControlError ? e.outcome : "error";
    failure = e instanceof ControlError ? e.message : MESSAGES.failed;
  }
  try {
    writeAudit(controls, label, rawArgs, started, outcome, failure ? Buffer.byteLength(failure) : Buffer.byteLength(JSON.stringify(value)));
  } catch {
    throw new McpError(ErrorCode.InternalError, MESSAGES.auditFailed);
  }
  if (failure) throw new McpError(outcome === "rejected" ? ErrorCode.InvalidParams : ErrorCode.InternalError, failure);
  return value as T;
}

export function createServer(options: ServerOptions = {}): Server {
  const config = options.config ?? loadConfig();
  const tools = new Map((options.tools ?? TOOLS).map((t) => [t.name, t] as const));
  const controls: Controls = { ctx: { config, paths: new PathGuard(config) }, audit: new AuditLog(config.auditPath), now: options.now };

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...tools.values()].map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  }));

  // A Map, so a hostile name such as "constructor" never resolves to anything.
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    withControls(tools.get(request.params.name), request.params.arguments, controls),
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: listSpecResources(controls.ctx) }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      {
        uriTemplate: REQUIREMENTS_TEMPLATE,
        name: "Spec requirements",
        description: "EARS requirements of one spec, by its three-digit number (e.g. spec://specs/025/requirements).",
        mimeType: "text/markdown",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    return auditedRequest(controls, "resources/read", { uri }, () => {
      if (typeof uri !== "string" || uri.length > 200) throw new ControlError("rejected", "Unknown resource.");
      return { contents: [readSpecResource(controls.ctx, uri)] };
    });
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [DRAFT_BRIEF_PROMPT] }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return auditedRequest(controls, "prompts/get", { name, arguments: args }, () => {
      if (name !== DRAFT_BRIEF_PROMPT.name) throw new ControlError("rejected", "Unknown prompt.");
      const parsed = promptArgsSchema.safeParse(args ?? {});
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const detail = issue.code === "unrecognized_keys" ? `${issue.keys.map((k) => k.slice(0, 40)).join(", ")}: not an allowed field` : `${issue.path.join(".") || "arguments"}: ${issue.message}`;
        throw new ControlError("rejected", MESSAGES.invalidInput(detail));
      }
      return draftBriefMessages(parsed.data.customer_id);
    });
  });

  return server;
}
