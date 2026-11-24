# Evidence: `workbook-mcp` in real MCP clients (MCP-TEST-002)

Spec [025-mcp-tooling](../../spec/specs/025-mcp-tooling/requirements.md), task MCP-T06. The data is the project's
fictional demo workbook ([ADR-0006](../../spec/adr/0006-fictional-demo-dataset.md)), so the customer names below are
not real.

| Part | Client | Date | State |
|---|---|---|---|
| A | MCP Inspector 2.16.0, CLI mode | 2026-11-24 | Done (below) |
| B | Claude Code session (VS Code extension) | — | **Waiting for the owner** (steps in Part B) |

## Part A: MCP Inspector session

### How it was run
From the repository root, with the server started from the project registration (`.mcp.json`, server `workbook`).
`MCP_ALLOW_WRITE` was not set.

```
npx -y @modelcontextprotocol/inspector@2.16.0 --cli --config .mcp.json --server workbook --method <method> [args]
```

The Inspector started the exact command in `.mcp.json`:

```
node --no-warnings --experimental-transform-types --import ./evals/register.mjs mcp/workbook-mcp/src/main.ts
```

Each call starts a fresh server, over stdio. The workbook was `../data/code-app-data.xlsx`, the default (no
`WORKBOOK_PATH`).

### What was listed
| Method | Result |
|---|---|
| `tools/list` | 10 tools: `search_customers`, `get_customer_facts`, `get_use_case`, `get_event`, `list_use_cases`, `list_events`, `get_requirement`, `list_open_gaps`, `trace_requirement`, `run_spec_lint`. Each has `additionalProperties: false`. `propose_change_request` is **not** listed (writes off, MCP-SEC-002) |
| `resources/list` | 27 resources: `spec://constitution` and `spec://specs/001/requirements` … `spec://specs/026/requirements` |
| `resources/templates/list` | `spec://specs/{nnn}/requirements` |
| `prompts/list` | `draft-account-brief` (argument `customer_id`, required) |

### Calls that succeed
`tools/call search_customers query=a limit=3`. This shows the app's ranking, live counts and the total number of
matches:

```json
{"items":[{"id":1056,"fact_id":"CU-1056","name":"Aldermoor Engineering","use_cases":4,"events":4},
          {"id":1043,"fact_id":"CU-1043","name":"Ambergate Technologies","use_cases":4,"events":1},
          {"id":1025,"fact_id":"CU-1025","name":"Ashcombe Medical","use_cases":14,"events":10}],
 "total":47,"redactions":[]}
```

`tools/call trace_requirement id=MCP-SEC-001`:

```json
{"requirement":{"id":"MCP-SEC-001","title":"Path allow-list","status":"✅ Implemented","spec":"025-mcp-tooling"},
 "tasks":[{"id":"MCP-T01","title":"Server scaffold, `.mcp.json`, controls wrapper (validation, allow-list, caps, audit).","status":"✅ Done","spec":"025-mcp-tooling"}],
 "sources":[".mcp.json","mcp/workbook-mcp/src/*.ts","mcp/workbook-mcp/src/guard.ts"],
 "tests":["tests/mcp/guard.test.ts","tests/mcp/server.test.ts"],"eval_metrics":[]}
```

`tools/call run_spec_lint`. The linter ran through `execFile` with no shell (MCP-SEC-004):

```json
{"ok":true,"errors":[],"error_count":0,
 "summary":"spec_lint: 26 specs, 580 requirements, 244 tasks, 4 agents, 6 contracts, 3 prompts, 43 hand-offs, 0 error(s)"}
```

Other calls that succeeded:
- **`tools/call list_open_gaps severity=Medium`:** returned the Medium rows of the gap register (first:
  `SRCH-ARIA-002`, *Expose active option with aria-activedescendant*, fix task `SRCH-T06 ⬜`).
- **`resources/read spec://specs/025/requirements`:** returned this spec's requirements as `text/markdown`.

### Hostile calls that are refused
| Call | Server answer | Control |
|---|---|---|
| `get_requirement id=../../package.json` | `isError: true`, "Invalid input: id: must match PREFIX-AREA-NNN" | MCP-SEC-003 (pattern), MCP-SEC-001 |
| `search_customers query=x cmd=; rm -rf / && calc.exe` | `isError: true`, "Invalid input: cmd: not an allowed field" | MCP-SEC-003, MCP-SEC-004 |
| `propose_change_request title=Test …` | Inspector: "Tool 'propose_change_request' not found on server." | MCP-SEC-002 (writes off by default) |
| `resources/read file:///C:/Windows/win.ini` | MCP error -32602 "Unknown resource." | MCP-SRV-005, MCP-SEC-001 |

### Audit log written by the session
These are the lines appended to `../data/mcp-audit.jsonl` (outside the repository, MCP-AUD-001) by the calls above,
in order. They hold no argument values or results, only the hash and the size (MCP-AUD-002).

```json
{"time":"2026-11-24T21:39:16.018Z","tool":"search_customers","args_sha256":"b561d4743e6a47af3eb7dcc82a02d734a99ab256300cb6eeb0dc5b3236c07dee","duration_ms":1148,"result_bytes":300,"outcome":"ok"}
{"time":"2026-11-24T21:39:28.294Z","tool":"list_open_gaps","args_sha256":"844e9dad8eade66e189bc4eb55519a6183f44e2a18378edaee4f5837f2bc2a8b","duration_ms":12,"result_bytes":1339,"outcome":"ok"}
{"time":"2026-11-24T21:39:36.960Z","tool":"trace_requirement","args_sha256":"e2ddcfb0bf4caf6787702aa782b0ac71024dee33f2cf4363c468a826e7a696db","duration_ms":96,"result_bytes":447,"outcome":"ok"}
{"time":"2026-11-24T21:39:45.288Z","tool":"run_spec_lint","args_sha256":"44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a","duration_ms":470,"result_bytes":160,"outcome":"ok"}
{"time":"2026-11-24T21:39:53.234Z","tool":"get_requirement","args_sha256":"3269da14ab3ba32c0d390598a5e24b088768572f1640973d0ff18655fb209948","duration_ms":9,"result_bytes":45,"outcome":"rejected"}
{"time":"2026-11-24T21:40:01.169Z","tool":"search_customers","args_sha256":"0b3035e19840aad9cb390ad899e7853795cab8efce7514381d4dfb24d638efc6","duration_ms":9,"result_bytes":40,"outcome":"rejected"}
{"time":"2026-11-24T21:40:16.647Z","tool":"resources/read","args_sha256":"5ee296687524840c4b20dcb9f686e9660176faa67516f69f953e3b32488ea65e","duration_ms":10,"result_bytes":7785,"outcome":"ok"}
{"time":"2026-11-24T21:40:24.711Z","tool":"resources/read","args_sha256":"9122e5e6529fa6a139b1e62ae9985d76ce2540d235d40b7ea3bf4d7b4762da85","duration_ms":6,"result_bytes":17,"outcome":"rejected"}
```

There is no line for `propose_change_request`: the Inspector found the tool missing from `tools/list` and never sent
the call. List calls (`tools/list`, `resources/list`, `prompts/list`) are not audited, because they carry no
arguments.

## Part B: Claude Code session (waiting for the owner)

Claude Code loads project MCP servers when a session starts, and asks once before using a project server. Steps:

1. Start a new Claude Code session in this folder (in VS Code: open a new Claude Code conversation, or reload the
   window).
2. When asked, approve the project server `workbook` from `.mcp.json`. `/mcp` should then show it as connected, with
   10 tools.
3. Ask Claude:
   > Using only the workbook MCP tools: list the open High and Medium gaps, trace MCP-SEC-005, find the customer
   > "Ashcombe Medical", and draft an account brief for it with the draft-account-brief prompt's rules. Do not save
   > anything.
4. Save the evidence here:
   - the `/mcp` panel;
   - the tool calls Claude made (`mcp__workbook__…`), with one result expanded;
   - the draft;
   - the new lines in `../data/mcp-audit.jsonl`.

   Paste or attach them to Part B, or tell Claude in that session to record them in this file.
