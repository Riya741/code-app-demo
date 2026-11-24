/**
 * Configuration of the `workbook-mcp` server (spec 025-mcp-tooling, task MCP-T01).
 *
 * MCP-SEC-007: nothing here is secret and nothing is read from a file. The workbook path comes from `WORKBOOK_PATH`
 * or the app's default (`../data/code-app-data.xlsx`, as in `vite.config.ts`); `.mcp.json` passes no values.
 * Paths are anchored to the repository, found from this file's location, so the server does not depend on the
 * directory the MCP client starts it in.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface McpConfig {
  /** Repository root (the folder holding `spec/`). */
  readonly repoRoot: string;
  /** The one workbook file the server may read (MCP-SEC-001). */
  readonly workbookPath: string;
  /** Readable spec tree (MCP-SEC-001). */
  readonly specDir: string;
  /** The only folder a write may target, and only when writes are enabled (MCP-SEC-001, MCP-SRV-006). */
  readonly changesDir: string;
  /** Append-only audit log, outside the repository (MCP-AUD-001). */
  readonly auditPath: string;
}

export const SERVER_NAME = "workbook-mcp";
export const SERVER_VERSION = "0.1.0";

/** `mcp/workbook-mcp/src` → repository root. */
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function loadConfig(env: NodeJS.ProcessEnv = process.env, repoRoot: string = DEFAULT_REPO_ROOT): McpConfig {
  const dataDir = path.resolve(repoRoot, "..", "data");
  const fromEnv = env.WORKBOOK_PATH?.trim();
  return Object.freeze({
    repoRoot,
    workbookPath: fromEnv ? path.resolve(repoRoot, fromEnv) : path.join(dataDir, "code-app-data.xlsx"),
    specDir: path.join(repoRoot, "spec"),
    changesDir: path.join(repoRoot, "spec", "changes"),
    auditPath: path.join(dataDir, "mcp-audit.jsonl"),
  });
}
