// @vitest-environment node
// workbook-mcp controls (spec 025-mcp-tooling): path allow-list, validated input, audit log. Task MCP-T01.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { loadConfig, type McpConfig } from "../../mcp/workbook-mcp/src/config";
import {
  AuditLog,
  ControlError,
  defineTool,
  INPUT_STRING_MAX,
  MESSAGES,
  PAGE_SIZE_MAX,
  PathGuard,
  RESULT_CHARS_MAX,
  withControls,
  type McpTool,
} from "../../mcp/workbook-mcp/src/guard";

let tmp: string;
let config: McpConfig;
let outside: string;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-guard-"));
  const repo = path.join(tmp, "repo");
  fs.mkdirSync(path.join(repo, "spec", "changes"), { recursive: true });
  fs.mkdirSync(path.join(repo, "spec", "specs", "001-x"), { recursive: true });
  fs.writeFileSync(path.join(repo, "spec", "specs", "001-x", "requirements.md"), "# R\n");
  fs.writeFileSync(path.join(repo, "package.json"), "{}");
  fs.mkdirSync(path.join(tmp, "data"));
  fs.writeFileSync(path.join(tmp, "data", "code-app-data.xlsx"), "wb");
  fs.writeFileSync(path.join(tmp, "data", "other.xlsx"), "other");
  outside = path.join(tmp, "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
  // A directory link inside spec/ that points outside (a junction on Windows needs no admin rights).
  fs.symlinkSync(outside, path.join(repo, "spec", "link"), "junction");
  fs.symlinkSync(outside, path.join(repo, "spec", "changes", "link"), "junction");
  config = loadConfig({}, repo);
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("path allow-list", () => {
  const guard = () => new PathGuard(config);
  const refused = (p: string, mode: "read" | "write") => {
    expect(() => guard().resolve(p, mode)).toThrowError(MESSAGES.pathOutside);
  };

  it("MCP-SEC-001 reads the workbook file and anything under spec/, returning the real path", () => {
    expect(guard().resolve("spec/specs/001-x/requirements.md", "read")).toBe(
      fs.realpathSync.native(path.join(config.specDir, "specs", "001-x", "requirements.md")),
    );
    expect(guard().resolve(config.workbookPath, "read")).toBe(fs.realpathSync.native(config.workbookPath));
    expect(loadConfig({}, config.repoRoot).workbookPath).toBe(path.join(tmp, "data", "code-app-data.xlsx"));
  });

  it("MCP-SEC-001 refuses '..' segments, absolute paths outside and other files next to the workbook", () => {
    for (const p of ["../data/other.xlsx", "spec/../package.json", "spec\\..\\package.json", "spec/specs/../../../outside/secret.txt", "package.json"]) {
      refused(p, "read");
    }
    refused(path.join(outside, "secret.txt"), "read");
    refused(path.join(tmp, "data", "other.xlsx"), "read");
    refused("spec/x\0.md", "read");
    refused("", "read");
  });

  it("MCP-SEC-001 refuses a symbolic link or junction inside spec/ that points outside", () => {
    refused("spec/link/secret.txt", "read");
    refused("spec/link", "read");
    refused("spec/changes/link/new.md", "write");
  });

  it("MCP-SEC-001 writes only to a new or existing file under spec/changes/", () => {
    expect(guard().resolve("spec/changes/CR-20261124-9-x.md", "write")).toBe(
      path.join(fs.realpathSync.native(config.changesDir), "CR-20261124-9-x.md"),
    );
    refused("spec/specs/001-x/requirements.md", "write");
    refused("spec/changes", "write");
    refused(config.workbookPath, "write");
    refused("spec/changes/../specs/001-x/requirements.md", "write");
  });
});

/* ------------------------------------------------------------------------------------------- wrapper */

const pageTool = defineTool({
  name: "test_page",
  description: "test tool",
  schema: z
    .object({
      id: z.string().regex(/^[A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-\d{3}$/, "must match PREFIX-AREA-NNN"),
      page_size: z.number().int().min(1).max(PAGE_SIZE_MAX).optional(),
      note: z.string().optional(),
    })
    .strict(),
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Requirement ID", pattern: "^[A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-\\d{3}$" },
      page_size: { type: "integer", description: "Page size", maximum: PAGE_SIZE_MAX },
      note: { type: "string", description: "Free text", maxLength: INPUT_STRING_MAX },
    },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async (input) => ({ echoed: input.id, note_length: input.note?.length ?? 0 }),
});

function tool(handler: McpTool["handler"]): McpTool {
  return defineTool({ ...pageTool, name: "test_custom", handler });
}

const noWorkbook = () => {
  throw new Error("no workbook in these tests");
};

function controls(auditFile: string) {
  return { ctx: { config, paths: new PathGuard(config), workbook: noWorkbook }, audit: new AuditLog(auditFile) };
}

const auditFile = (name: string) => path.join(tmp, "audit", `${name}.jsonl`);
const lines = (file: string) =>
  fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));

describe("validated input", () => {
  const call = (args: unknown, t: McpTool = pageTool) => withControls(t, args, controls(auditFile("input")));
  const errorText = async (args: unknown) => {
    const r = await call(args);
    expect(r.isError).toBe(true);
    return r.content[0].text;
  };

  it("MCP-SEC-003 accepts valid input, with a string of exactly 200 characters", async () => {
    const r = await call({ id: "MCP-SEC-003", page_size: PAGE_SIZE_MAX, note: "x".repeat(INPUT_STRING_MAX) });
    expect(r.isError).toBeUndefined();
    expect(JSON.parse(r.content[0].text)).toEqual({ echoed: "MCP-SEC-003", note_length: 200 });
    expect(r.structuredContent).toEqual({ echoed: "MCP-SEC-003", note_length: 200 });
  });

  it("MCP-SEC-003 refuses an oversize string (201 characters), naming the field, before the tool's schema runs", async () => {
    expect(await errorText({ id: "MCP-SEC-003", note: "x".repeat(INPUT_STRING_MAX + 1) })).toBe(
      "Invalid input: note: at most 200 characters",
    );
    // Also an unknown field: the length cap applies to every string, not only declared ones.
    expect(await errorText({ id: "MCP-SEC-003", extra: { deep: "y".repeat(5000) } })).toBe("Invalid input: extra.deep: at most 200 characters");
  });

  it("MCP-SEC-003 refuses an ID that does not match its pattern, such as a path traversal", async () => {
    expect(await errorText({ id: "../../.env" })).toBe("Invalid input: id: must match PREFIX-AREA-NNN");
  });

  it("MCP-SEC-003 refuses a page size over 50, a wrong type, a missing field and an unknown field, naming each", async () => {
    expect(await errorText({ id: "MCP-SEC-003", page_size: 51 })).toMatch(/^Invalid input: page_size: /);
    expect(await errorText({ id: 3 })).toMatch(/^Invalid input: id: /);
    expect(await errorText({})).toMatch(/^Invalid input: id: /);
    expect(await errorText({ id: "MCP-SEC-003", cmd: "rm -rf /" })).toBe("Invalid input: cmd: not an allowed field");
  });

  it("MCP-SEC-003 refuses arguments that are not an object", async () => {
    expect(await errorText(["MCP-SEC-003"])).toBe("Invalid input: arguments: must be an object");
    expect(await errorText("MCP-SEC-003")).toBe("Invalid input: arguments: must be an object");
  });

  it("MCP-SEC-003 never shows a stack trace or file path; a refusal raised on purpose shows its message", async () => {
    const thrown = tool(async () => {
      throw new Error("ENOENT: C:\\Users\\someone\\secret.xlsx\n    at Object.openSync (node:fs:573:18)");
    });
    const r = await call({ id: "MCP-SEC-003" }, thrown);
    expect(r).toEqual({ content: [{ type: "text", text: MESSAGES.failed }], isError: true });

    const refused = tool(async () => {
      throw new ControlError("rejected", MESSAGES.pathOutside);
    });
    expect((await call({ id: "MCP-SEC-003" }, refused)).content[0].text).toBe("Path outside allow-list.");
  });

  it("MCP-SEC-003 caps the result size", async () => {
    const big = tool(async () => ({ text: "x".repeat(RESULT_CHARS_MAX) }));
    const r = await call({ id: "MCP-SEC-003" }, big);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe(MESSAGES.tooLarge);
  });
});

describe("audit log", () => {
  const CANARY = "CANARY-8f3a";

  it("MCP-AUD-001 appends one line per call, accepted or not, with time, tool, argument hash, duration, size and outcome", async () => {
    const file = auditFile("every-call");
    const c = controls(file);
    const ok = await withControls(pageTool, { id: "MCP-AUD-001", page_size: 5 }, c);
    await withControls(pageTool, { id: "nope" }, c);
    await withControls(tool(async () => { throw new Error("boom"); }), { id: "MCP-AUD-001" }, c);
    await withControls(undefined, { id: "MCP-AUD-001" }, c);

    const logged = lines(file);
    expect(logged.map((l) => [l.tool, l.outcome])).toEqual([
      ["test_page", "ok"],
      ["test_page", "rejected"],
      ["test_custom", "error"],
      ["(unknown)", "rejected"],
    ]);
    for (const l of logged) {
      expect(Object.keys(l).sort()).toEqual(["args_sha256", "duration_ms", "outcome", "result_bytes", "time", "tool"]);
      expect(Number.isNaN(Date.parse(l.time))).toBe(false);
      expect(l.args_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(l.duration_ms).toBeGreaterThanOrEqual(0);
    }
    expect(logged[0].result_bytes).toBe(Buffer.byteLength(ok.content[0].text));
    // Same arguments in another key order hash the same.
    await withControls(pageTool, { page_size: 5, id: "MCP-AUD-001" }, c);
    expect(lines(file)[4].args_sha256).toBe(logged[0].args_sha256);
    expect(logged[0].args_sha256).toBe(crypto.createHash("sha256").update('{"id":"MCP-AUD-001","page_size":5}').digest("hex"));
  });

  it("MCP-AUD-001 fails the call closed when the audit line cannot be written", async () => {
    const dir = path.join(tmp, "audit-is-a-folder");
    fs.mkdirSync(dir, { recursive: true });
    const r = await withControls(pageTool, { id: "MCP-AUD-001" }, controls(dir));
    expect(r).toEqual({ content: [{ type: "text", text: MESSAGES.auditFailed }], isError: true });
  });

  it("MCP-AUD-002 holds no argument value, result text or unregistered tool name", async () => {
    const file = auditFile("no-free-text");
    const c = controls(file);
    const echo = tool(async (input) => ({ text: `result ${CANARY}-result`, id: input.id }));
    await withControls(echo, { id: "MCP-AUD-002", note: `${CANARY}-argument` }, c);
    await withControls(pageTool, { id: `${CANARY}-rejected` }, c);
    await withControls(undefined, { note: CANARY }, c);
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).not.toContain(CANARY);
    expect(raw).not.toContain("MCP-AUD-002");
    expect(lines(file)).toHaveLength(3);
  });
});
