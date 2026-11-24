/**
 * The controls every `workbook-mcp` tool call passes through (spec 025-mcp-tooling, task MCP-T01):
 *
 *   validate ─► handler (paths through the allow-list) ─► cap ─► audit ─► result
 *
 * - MCP-SEC-003: every string argument is at most 200 characters, then the tool's own zod schema (types, ID patterns,
 *   page size ≤ 50, no unknown fields) is the authority; a rejection names the field.
 * - MCP-SEC-001: `PathGuard` resolves a path to its real location and allows only the workbook file and `spec/` for
 *   reads, and only `spec/changes/` for writes. Handlers open the path it returns, never the path they were given.
 * - MCP-AUD-001 / MCP-AUD-002: one JSON line per call with time, tool, SHA-256 of the arguments, duration, result
 *   size and outcome; never an argument value, a result or an unknown tool's name.
 * - Errors are short reasons from the messages catalog; no stack trace or file path reaches the client (Article III.4).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import type { McpConfig } from "./config";

/* ------------------------------------------------------------------------------------------- limits */

/** MCP-SEC-003: string length ≤ 200, for every string argument of every tool. */
export const INPUT_STRING_MAX = 200;
/** MCP-SEC-003: page size ≤ 50. */
export const PAGE_SIZE_MAX = 50;
/** Backstop on the serialised size of one result (Article XI). */
export const RESULT_CHARS_MAX = 200_000;

/* ------------------------------------------------------------------------------------------- types */

/** JSON Schema advertised in `tools/list`. The zod schema is what is enforced. */
export interface JsonInputSchema {
  type: "object";
  properties: Record<string, { type: "string" | "integer" | "number" | "boolean"; description: string; pattern?: string; maxLength?: number; minimum?: number; maximum?: number; enum?: string[] }>;
  required?: string[];
  additionalProperties: false;
}

export interface ToolContext {
  readonly config: McpConfig;
  readonly paths: PathGuard;
}

export interface McpTool<S extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly name: string;
  readonly description: string;
  /** Authoritative validation; use `.strict()` so unknown fields are refused. */
  readonly schema: S;
  readonly inputSchema: JsonInputSchema;
  readonly handler: (input: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
}

export type AuditOutcome = "ok" | "rejected" | "error";

export interface AuditLine {
  time: string;
  tool: string;
  args_sha256: string;
  duration_ms: number;
  result_bytes: number;
  outcome: AuditOutcome;
}

/** The `tools/call` result shape (MCP `CallToolResult`). */
export interface ToolCallResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** A refusal raised on purpose; its message is shown to the client. Any other error becomes "The tool failed." */
export class ControlError extends Error {
  constructor(
    readonly outcome: "rejected" | "error",
    message: string,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------------------------------- messages */

/** Every client-facing message of the controls (messages catalog §3, "MCP tool errors"). */
export const MESSAGES = Object.freeze({
  unknownTool: "Unknown tool.",
  invalidInput: (detail: string) => `Invalid input: ${detail}`,
  argumentsNotObject: "arguments: must be an object",
  stringTooLong: (field: string) => `${field}: at most ${INPUT_STRING_MAX} characters`,
  pathOutside: "Path outside allow-list.",
  tooLarge: "The result is too large; ask for a smaller page.",
  failed: "The tool failed.",
  auditFailed: "The audit log could not be written.",
});

/* ------------------------------------------------------------------------------------------- path allow-list */

export type PathMode = "read" | "write";

/** Real path of `p`; for a path that does not exist yet, the real path of its nearest existing folder plus the rest. */
function realLocation(p: string): string {
  const rest: string[] = [];
  let existing = p;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    rest.unshift(path.basename(existing));
    existing = parent;
  }
  return path.join(fs.realpathSync.native(existing), ...rest);
}

function realOrSelf(p: string): string {
  try {
    return realLocation(p);
  } catch {
    return path.resolve(p);
  }
}

const within = (base: string, target: string): boolean => {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

const samePath = (a: string, b: string): boolean =>
  process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;

/**
 * MCP-SEC-001. Reads: the configured workbook file, or anything under `spec/`. Writes: only under `spec/changes/`.
 * Relative paths are taken from the repository root. A `..` segment, a NUL character, or a real path outside the
 * allowed places (for example through a symbolic link or junction) is refused.
 */
export class PathGuard {
  private readonly workbook: string;
  private readonly specDir: string;
  private readonly changesDir: string;

  constructor(private readonly config: McpConfig) {
    this.workbook = realOrSelf(config.workbookPath);
    this.specDir = realOrSelf(config.specDir);
    this.changesDir = realOrSelf(config.changesDir);
  }

  /** The real path to open, or a `ControlError` "Path outside allow-list." */
  resolve(input: string, mode: PathMode): string {
    if (typeof input !== "string" || input.length === 0 || input.includes("\0") || input.split(/[\\/]+/).includes("..")) {
      throw new ControlError("rejected", MESSAGES.pathOutside);
    }
    let real: string;
    try {
      real = realLocation(path.resolve(this.config.repoRoot, input));
    } catch {
      throw new ControlError("rejected", MESSAGES.pathOutside);
    }
    const allowed =
      mode === "write" ? within(this.changesDir, real) && !samePath(real, this.changesDir) : samePath(real, this.workbook) || within(this.specDir, real);
    if (!allowed) throw new ControlError("rejected", MESSAGES.pathOutside);
    return real;
  }
}

/* ------------------------------------------------------------------------------------------- audit */

/** Keys sorted, so the same arguments always hash the same. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export const argsHash = (args: unknown): string => crypto.createHash("sha256").update(canonical(args)).digest("hex");

/** MCP-AUD-001: append-only JSON lines. MCP-AUD-002: the line type has no field for values or results. */
export class AuditLog {
  constructor(readonly file: string) {}

  append(line: AuditLine): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, `${JSON.stringify(line)}\n`, "utf8");
  }
}

/* ------------------------------------------------------------------------------------------- validation */

/** MCP-SEC-003, before the tool's schema: every string anywhere in the arguments is at most 200 characters. */
function oversizeString(value: unknown, at: string, depth = 0): string | null {
  if (typeof value === "string") return value.length > INPUT_STRING_MAX ? at : null;
  if (depth > 8 || value === null || typeof value !== "object") return null;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const hit = oversizeString(v, at ? `${at}.${k.slice(0, 40)}` : k.slice(0, 40), depth + 1);
    if (hit) return hit;
  }
  return null;
}

function describe(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) =>
      i.code === "unrecognized_keys"
        ? `${i.keys.map((k) => k.slice(0, 40)).join(", ")}: not an allowed field`
        : `${i.path.join(".") || "arguments"}: ${i.message}`,
    )
    .join("; ");
}

function validate(tool: McpTool, raw: unknown): unknown {
  const args = raw ?? {};
  if (typeof args !== "object" || Array.isArray(args)) throw new ControlError("rejected", MESSAGES.invalidInput(MESSAGES.argumentsNotObject));
  const long = oversizeString(args, "");
  if (long) throw new ControlError("rejected", MESSAGES.invalidInput(MESSAGES.stringTooLong(long)));
  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) throw new ControlError("rejected", MESSAGES.invalidInput(describe(parsed.error)));
  return parsed.data;
}

/* ------------------------------------------------------------------------------------------- the wrapper */

const textResult = (text: string, isError: boolean, structured?: Record<string, unknown>): ToolCallResult => ({
  content: [{ type: "text", text }],
  ...(structured ? { structuredContent: structured } : {}),
  ...(isError ? { isError: true } : {}),
});

export interface Controls {
  readonly ctx: ToolContext;
  readonly audit: AuditLog;
  /** For tests: a fixed clock. */
  readonly now?: () => number;
}

/**
 * Runs one `tools/call` through the controls. `tool` is undefined for a name that is not registered. Never throws;
 * every call, accepted or not, writes one audit line. If the audit line cannot be written, the call fails closed.
 */
export async function withControls(tool: McpTool | undefined, rawArgs: unknown, controls: Controls): Promise<ToolCallResult> {
  const now = controls.now ?? (() => performance.now());
  const started = now();
  let result: ToolCallResult;
  let outcome: AuditOutcome;
  try {
    if (!tool) throw new ControlError("rejected", MESSAGES.unknownTool);
    const input = validate(tool, rawArgs);
    const content = await tool.handler(input, controls.ctx);
    const text = JSON.stringify(content ?? null);
    if (text.length > RESULT_CHARS_MAX) throw new ControlError("rejected", MESSAGES.tooLarge);
    const structured = content && typeof content === "object" && !Array.isArray(content) ? (content as Record<string, unknown>) : undefined;
    result = textResult(text, false, structured);
    outcome = "ok";
  } catch (e) {
    const known = e instanceof ControlError;
    result = textResult(known ? e.message : MESSAGES.failed, true);
    outcome = known ? e.outcome : "error";
  }
  try {
    // An unregistered name is client text, so it is not logged (MCP-AUD-002).
    writeAudit(controls, tool ? tool.name : "(unknown)", rawArgs, started, outcome, Buffer.byteLength(result.content[0].text, "utf8"));
  } catch {
    return textResult(MESSAGES.auditFailed, true);
  }
  return result;
}

/**
 * One audit line (MCP-AUD-001). `label` is a registered tool name or a fixed method name such as "resources/read",
 * never client text. Throws if the line cannot be written, so the caller can fail closed.
 */
export function writeAudit(controls: Controls, label: string, rawArgs: unknown, started: number, outcome: AuditOutcome, resultBytes: number): void {
  const now = controls.now ?? (() => performance.now());
  controls.audit.append({
    time: new Date().toISOString(),
    tool: label,
    args_sha256: argsHash(rawArgs),
    duration_ms: Math.max(0, Math.round(now() - started)),
    result_bytes: resultBytes,
    outcome,
  });
}

/** A tool definition, typed from its schema. */
export function defineTool<S extends z.ZodTypeAny>(tool: McpTool<S>): McpTool {
  return Object.freeze(tool) as unknown as McpTool;
}
