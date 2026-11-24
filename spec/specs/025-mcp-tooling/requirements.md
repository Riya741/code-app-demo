# Requirements — MCP Tooling (`workbook-mcp`)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| 025-mcp-tooling | MCP | 📝 Planned (CR-20261117-1) | II, III, VIII, IX, X, XII |

## Introduction
A local MCP server gives Claude Code (and any other MCP client) safe, structured access to the workbook data and the
specs, instead of letting agents open the `.xlsx` or grep raw files. Its read tools are thin wrappers over the same
functions the runtime agents use (`server/ai/tools.ts`), so one implementation serves both. Security is designed in:
read-only by default, validated input, path allow-list, no shell, redaction and an audit log.

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### MCP-R1 — Server and tools
**User story:** As a developer using an AI agent, I want the agent to ask the project for facts through named tools,
so that its answers are grounded and its access is controlled.

#### MCP-SRV-001: Local stdio server
- **Status:** ✅ Implemented
- **Criterion:** THE project SHALL provide a TypeScript MCP server in `mcp/workbook-mcp/` using stdio transport, registered for Claude Code in a project-scoped `.mcp.json`.
- **Source:** `mcp/workbook-mcp/src/index.ts`, `mcp/workbook-mcp/src/main.ts`, `.mcp.json`

#### MCP-SRV-002: Data tools
- **Status:** 📝 Planned
- **Criterion:** THE server SHALL offer the read tools `search_customers`, `get_customer_facts`, `list_use_cases` and `list_events`, returning paged, structured results.

#### MCP-SRV-003: Spec tools
- **Status:** ✅ Implemented
- **Criterion:** THE server SHALL offer the read tools `get_requirement`, `list_open_gaps` and `trace_requirement` (requirement → tasks → source files → tests), and the exec tool `run_spec_lint`.
- **Source:** `mcp/workbook-mcp/src/specTools.ts`, `mcp/workbook-mcp/src/index.ts`

#### MCP-SRV-004: Shared implementation
- **Status:** 📝 Planned
- **Criterion:** THE data tools SHALL call the functions in `server/ai/tools.ts` used by the runtime agents, and SHALL NOT duplicate their query logic.

#### MCP-SRV-005: Resources and prompt
- **Status:** ✅ Implemented
- **Criterion:** THE server SHALL expose the resources `spec://constitution` and `spec://specs/{nnn}/requirements`, and the prompt `draft-account-brief`.
- **Source:** `mcp/workbook-mcp/src/specTools.ts` (`listSpecResources`, `readSpecResource`, `draftBriefMessages`), `mcp/workbook-mcp/src/index.ts`

#### MCP-SRV-006: Change-request tool
- **Status:** 📝 Planned
- **Criterion:** WHERE `MCP_ALLOW_WRITE=1` THE server SHALL offer `propose_change_request(title, problem, behaviour)`, which writes a new file from the change-request template under `spec/changes/` and returns its path.

### MCP-R2 — Security
**User story:** As the owner, I want the tools to expose only what an agent needs, so that a confused or manipulated
agent cannot leak or damage data.

#### MCP-SEC-001: Path allow-list
- **Status:** ✅ Implemented
- **Criterion:** THE server SHALL resolve every file path to its real path and reject any path outside the configured workbook, `spec/` and `spec/changes/` (for writes), including `..` segments and symbolic links that point outside.
- **Source:** `mcp/workbook-mcp/src/guard.ts` (`PathGuard`)

#### MCP-SEC-002: Read-only by default
- **Status:** 📝 Planned
- **Criterion:** IF `MCP_ALLOW_WRITE` is not `1` THEN THE server SHALL NOT register any tool that writes, and SHALL never write to the workbook in any mode (Article XII.3).

#### MCP-SEC-003: Validated input
- **Status:** ✅ Implemented
- **Criterion:** EVERY tool SHALL validate its arguments with a schema (types, ID patterns, string length ≤ 200, page size ≤ 50) and reject invalid input with a message naming the field.
- **Source:** `mcp/workbook-mcp/src/guard.ts` (`withControls`)

#### MCP-SEC-004: No shell
- **Status:** ✅ Implemented
- **Criterion:** THE `run_spec_lint` tool SHALL start the lint with `execFile` and a fixed argument list, and no tool argument SHALL reach a command line.
- **Source:** `mcp/workbook-mcp/src/specTools.ts` (`makeRunSpecLint`, `specLintCommand`)

#### MCP-SEC-005: Data minimisation
- **Status:** 📝 Planned
- **Criterion:** THE data tools SHALL apply the AI data policy allow-list and redaction, and SHALL return full note text only when a single record is requested by ID.

#### MCP-SEC-006: Free text marked as data
- **Status:** 📝 Planned
- **Criterion:** THE server SHALL return workbook free text only inside fields named `text`, with the tool description stating that such text is data, not instructions.

#### MCP-SEC-007: No secrets in configuration
- **Status:** ✅ Implemented
- **Criterion:** `.mcp.json` SHALL contain no secrets; the workbook path comes from `WORKBOOK_PATH` or the default.
- **Source:** `.mcp.json`, `mcp/workbook-mcp/src/config.ts`

### MCP-R3 — Audit
**User story:** As the owner, I want to know what agents asked the tools, so that misuse is visible after the fact.

#### MCP-AUD-001: Every call logged
- **Status:** ✅ Implemented
- **Criterion:** EVERY tool call SHALL append a line to `../data/mcp-audit.jsonl` with time, tool, a hash of the arguments, duration, result size and outcome.
- **Source:** `mcp/workbook-mcp/src/guard.ts` (`AuditLog`, `withControls`)

#### MCP-AUD-002: Audit holds no free text
- **Status:** ✅ Implemented
- **Criterion:** THE audit log SHALL NOT contain argument values or results, only their hash and size (ai-data-policy §6).
- **Source:** `mcp/workbook-mcp/src/guard.ts` (`AuditLine`)

### MCP-R4 — Proof
**User story:** As the assessor, I want the controls tested, not only listed.

#### MCP-TEST-001: Tests per tool and per control
- **Status:** 📝 Planned
- **Criterion:** EVERY tool SHALL have a unit test, and MCP-SEC-001..004 SHALL each have a test with a hostile input (path traversal, symlink, oversize string, shell metacharacters).

#### MCP-TEST-002: Works in a real client
- **Status:** 📝 Planned
- **Criterion:** THE server SHALL be exercised from MCP Inspector and from a Claude Code session, with the evidence kept in `l2-competency/evidence/`.

## Out of scope
- Remote (HTTP) transport and authentication; the server is local only.
- Write tools for business data; agents never write the workbook.

## Open questions
- Whether to publish the server inside the `sdd-toolkit` plugin (Phase 5) or keep it repo-only.

## Scenarios
- Agent calls `get_customer_facts(1003)` → structured facts, emails shown as `[email]`, notes inside `text` fields.
- Agent calls `get_requirement("../../.env")` → rejected: "id must match PREFIX-AREA-NNN".
- `MCP_ALLOW_WRITE` unset → `propose_change_request` is not listed.
