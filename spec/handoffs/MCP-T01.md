---
contract: task-handoff.v1
task: MCP-T01
agent: session
covers: [MCP-SRV-001, MCP-SEC-001, MCP-SEC-003, MCP-SEC-007, MCP-AUD-001, MCP-AUD-002]
files_changed: [mcp/workbook-mcp/src/index.ts, mcp/workbook-mcp/src/main.ts, mcp/workbook-mcp/src/config.ts, mcp/workbook-mcp/src/guard.ts, .mcp.json, tsconfig.node.json, package.json, package-lock.json]
tests: [tests/mcp/guard.test.ts, tests/mcp/server.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: MCP-T01 Server scaffold, `.mcp.json`, controls wrapper

## What changed
- **Server:** `workbook-mcp` is a local MCP server over stdio. It is registered for Claude Code in a project-scoped
  `.mcp.json` that holds no secrets and no environment values.
- **Controls:** every `tools/call` goes through `withControls`, in this order:
  - a 200-character cap on every string argument;
  - the tool's strict zod schema (a rejection names the field);
  - handler paths through `PathGuard`: real path; reads only the workbook file and `spec/`; writes only `spec/changes/`;
    `..` and links pointing outside are refused;
  - a cap on result size;
  - one audit line in `../data/mcp-audit.jsonl` with time, tool, SHA-256 of the arguments, duration, result bytes and
    outcome, and never a value.
- **Fail closed:** if the audit line cannot be written, the call fails.
- **No tools yet:** none are registered. MCP-T02 (data), MCP-T03 (spec) and MCP-T04 (change request) add them to
  `TOOLS`.
- **New dependency:** `@modelcontextprotocol/sdk` 1.32.2, already planned in `spec/steering/tech.md`.
  - It adds no new `npm audit` finding.
  - The existing high finding for zod < 4.6.6 was already on `main` at 3.25.76 and is unchanged.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| MCP-SRV-001 | `tests/mcp/server.test.ts`: "MCP-SRV-001 answers initialize as workbook-mcp …", "MCP-SRV-001 routes every tools/call through the controls …", "MCP-SRV-001 starts over stdio from the command registered in the project's .mcp.json" (spawns the real command) |
| MCP-SEC-001 | `tests/mcp/guard.test.ts`: 4 tests "MCP-SEC-001 …": allowed reads return the real path; `..`, outside absolute paths, NUL, neighbouring files refused; a junction in `spec/` and in `spec/changes/` pointing outside refused; writes only under `spec/changes/` |
| MCP-SEC-003 | `tests/mcp/guard.test.ts`: 7 tests "MCP-SEC-003 …": 200 characters accepted, 201 refused naming the field (also nested in an unknown field), ID pattern (`../../.env`), page size 51, wrong type, missing and unknown fields, non-object arguments, no stack trace or path, result cap |
| MCP-SEC-007 | `tests/mcp/server.test.ts`: "MCP-SEC-007 .mcp.json holds no environment values, keys or tokens", "MCP-SEC-007 takes the workbook path from WORKBOOK_PATH or the app's default, and reads no settings file" |
| MCP-AUD-001 | `tests/mcp/guard.test.ts`: "MCP-AUD-001 appends one line per call, accepted or not, …", "MCP-AUD-001 fails the call closed when the audit line cannot be written" |
| MCP-AUD-002 | `tests/mcp/guard.test.ts`: "MCP-AUD-002 holds no argument value, result text or unregistered tool name" (canary values) |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean (`mcp/` added to `tsconfig.node.json`, strict) |
| G4 | `npm test` | 434 passed, 1 expected fail, 1 skipped (8 consecutive full runs). See the first open question for one earlier failure. |
| G5 | n/a | no UI |

## Open questions
- **One unexplained failure.** The first full run after `npm install` failed one test (1 of 436), and its output was
  cut off. The next 8 full runs passed.
  - The most likely cause is a cold start of the stdio spawn test, which has a 30 s timeout. This is not confirmed.
  - If it happens again, keep the output (`npx vitest run > out.txt`).
- **Claude Code approval.** Claude Code asks the owner to approve the project server in `.mcp.json` the first time.
  The server has no tools until MCP-T02/T03.
- **MCP-T02's block is out of date.** It says "⛔ Blocked by AOPS-T02", but AOPS-T02 is ✅. Clear it when MCP-T02
  starts.

## Review
Session review, 2026-11-24, `git diff` against the criteria: pass.
- **MCP-SRV-001:** the low-level `Server` is used, so invalid input and unknown names reach the controls and are
  audited. The stdio start is proven with the exact `.mcp.json` command.
- **MCP-SEC-001:** the check runs on the real path, and handlers must open the returned path (documented in
  `guard.ts` and design.md).
- **MCP-SEC-003:** applies to every tool, because it sits in the wrapper and not in each tool. Rejections name the
  field and come from the messages catalog (Article V).
- **MCP-SEC-007:** no `env` block. Paths come from the repository root.
- **MCP-AUD-001/002:** the `AuditLine` type has no field for values. An unknown tool name is logged as `(unknown)`.
- **Article III.4:** no stack traces or paths are returned. **Article IX:** no query logic here yet; MCP-T02 must wrap
  `server/ai/tools.ts` `runTool`.
