---
contract: task-handoff.v1
task: MCP-T06
agent: session
covers: [MCP-TEST-002]
files_changed: [l2-competency/evidence/mcp-workbook-server.md]
tests: [tests/mcp/server.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: MCP-T06 MCP Inspector and Claude Code session evidence

## What changed
`l2-competency/evidence/mcp-workbook-server.md` records the evidence.

**Part A, done: an MCP Inspector 2.16.0 session (CLI mode).** It ran against the project's `.mcp.json` registration,
the real demo workbook and the spec set.
- **Listed:** 10 tools (no write tool, since writes are off), 27 resources, the resource template and the prompt.
- **Calls that succeeded:**
  - `search_customers`, `list_open_gaps`, `trace_requirement`;
  - `run_spec_lint`, which ran the linter (0 errors);
  - one resource read.
- **Hostile calls refused:** a traversal ID, a shell-metacharacter field, the write tool (not found), and a `file://`
  URI.
- **Audit:** the 8 audit lines those calls wrote, with no values.

**Part B, done: a Claude Code session** (VS Code extension, 2026-11-24).
- **Loading:** after the owner reloaded the window, Claude Code loaded `workbook` from `.mcp.json`. It was already
  approved, so there was no prompt.
- **Calls:** the session made 6 `mcp__workbook__` calls:
  - open High and Medium gaps;
  - `trace_requirement` for MCP-SEC-005;
  - `search_customers` for "Ashcombe Medical";
  - the fact sheet (notes cut to 300, with 14 truncations reported);
  - the live use case by ID (full note).
- **Draft:** it wrote a four-section draft brief with cited fact IDs, not saved.
- **Audit:** the 6 audit lines are recorded. The Medium-gaps call has the same argument hash as the Inspector's
  identical call.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| MCP-TEST-002 | MCP Inspector: `l2-competency/evidence/mcp-workbook-server.md` Part A (commands, outputs, audit lines), 2026-11-24. Claude Code: Part B (tool calls, one expanded result, the draft, audit lines), 2026-11-24. Automated: `tests/mcp/server.test.ts` "MCP-SRV-001 starts over stdio from the command registered in the project's .mcp.json". |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 474 passed, 1 expected fail, 1 skipped |
| G5 | n/a | no UI; the client sessions are the manual check |

## Open questions
- **The Inspector was run in CLI mode, not the browser UI.** CLI mode is the same Inspector with a JSON transcript. If
  the assessor wants the screenshot that 05-tool-integration-extensibility.md mentions, run
  `npx @modelcontextprotocol/inspector@2.16.0 --config .mcp.json --server workbook` and capture the Tools tab.

## Review
Part A reviewed 2026-11-24. Every call's answer matches the spec:
- the write tool is absent (MCP-SEC-002);
- refusals name the field (MCP-SEC-003);
- `run_spec_lint` takes no arguments (MCP-SEC-004);
- audit lines hold hashes only (MCP-AUD-002).

Part B reviewed 2026-11-24:
- the tools appeared as `mcp__workbook__*`, and the write tool was not offered;
- the fact sheet cut notes and reported the cuts (MCP-SEC-005);
- the full note came only from the by-ID read;
- the draft cites only fact IDs from the tool results;
- the audit lines hold hashes only.

Verdict `pass`.
