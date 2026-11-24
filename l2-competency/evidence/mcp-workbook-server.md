# Evidence: `workbook-mcp` in real MCP clients (MCP-TEST-002)

Spec [025-mcp-tooling](../../spec/specs/025-mcp-tooling/requirements.md), task MCP-T06. The data is the project's
fictional demo workbook ([ADR-0006](../../spec/adr/0006-fictional-demo-dataset.md)), so the customer names below are
not real.

| Part | Client | Date | State |
|---|---|---|---|
| A | MCP Inspector 2.16.0, CLI mode | 2026-11-24 | Done (below) |
| B | Claude Code session (VS Code extension) | 2026-11-24 | Done (below) |

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

## Part B: Claude Code session

### How it was run
- **Client:** the Claude Code VS Code extension (model Claude Opus 5.5), in this repository, on 2026-11-24.
- **Loading the server:**
  - The owner reloaded the window (Developer: Reload Window) and started a new conversation.
  - Claude Code loaded the project server `workbook` from `.mcp.json`. It was already approved for this project, so no
    prompt appeared.
  - Its 10 tools appeared in the session as `mcp__workbook__<tool>`.
  - `MCP_ALLOW_WRITE` was not set, so `propose_change_request` was not offered.
- **Request:** the Part B request was made in the conversation that built the server:
  > Using only the workbook MCP tools: list the open High and Medium gaps, trace MCP-SEC-005, find the customer
  > "Ashcombe Medical", and draft an account brief for it with the draft-account-brief prompt's rules. Do not save
  > anything.

### Tool calls Claude made
| # | Tool call | Result (summary) |
|---|---|---|
| 1 | `mcp__workbook__list_open_gaps {"severity":"High"}` | `{"items":[],"total":0}`: no open High gaps |
| 2 | `mcp__workbook__list_open_gaps {"severity":"Medium"}` | 8 rows: SRCH-ARIA-002, EVF-ADD-004, GRID-ROW-006, DATA-QUAL-003, A11Y-NAME-003, A11Y-KEY-001, A11Y-FORM-002, SEC-SUPPLY-004 |
| 3 | `mcp__workbook__trace_requirement {"id":"MCP-SEC-005"}` | Implemented. Task MCP-T02 ✅. Sources: `mcp/workbook-mcp/src/dataTools.ts`, `server/ai/tools.ts`, `server/ai/steps/retriever.ts`. Test: `tests/mcp/dataTools.test.ts` |
| 4 | `mcp__workbook__search_customers {"query":"Ashcombe Medical"}` | `CU-1025` Ashcombe Medical: 14 use cases, 10 events; 1 match |
| 5 | `mcp__workbook__get_customer_facts {"customer_id":1025}` | fact-sheet.v1 with 14 use cases and 10 events. Counts by status: Blocked 3, Documented & Validated 4, Identified 5, Live 1, Implementing 1. Notes cut to 300 characters, reported as `redactions: [{"kind":"truncated","count":14}]` (MCP-SEC-005) |
| 6 | `mcp__workbook__get_use_case {"fact_id":"UC-50185"}` | The live use case read by ID with its full note (shown below) |

Result of call 6, expanded:

```json
{"record":{"fact_id":"UC-50185","solution":"Nimbra API","use_case_type":"Edit Production Assets","status":"Live",
  "is_live":true,"subsidiary":"Ashcombe Medical North America","department":"Strategy & Operations",
  "expected_launch_date":"2026-10-31","value_snippet":"Photo shoot spend reduced by an estimated $40K this year.",
  "people":["Gabriel Reyes","Wei Reyes","Valentina Sato"],
  "text":"Ashcombe Medical North America - Edit Production Assets with Nimbra API\nThe Strategy & Operations team wants to use Nimbra API to generate product imagery in seasonal settings without new photo shoots. Valentina Sato is the business sponsor.\n\nWeekly Progress Starts Here-\n{{2026-08-21}} Expanding to a second market next quarter.\n{{2026-09-09}} Weekly usage trending up."},
 "redactions":[]}
```

### The draft
The draft was written from the tool results only, following the `draft-account-brief` rules. It was not saved
anywhere.

> **DRAFT: for review; not saved.** Account brief, Ashcombe Medical (CU-1025)
>
> **Overview.** Ashcombe Medical has 14 use cases and 10 events on record. One use case is live, one is implementing,
> four are documented and validated, five are identified and three are blocked [CU-1025]. The live use case is
> Nimbra API for editing production assets at Ashcombe Medical North America [UC-50185]. Recent contact includes a
> product demo on 2026-11-14 and a quarterly business review on 2026-10-03 [EV-60123, EV-60119].
>
> **Wins.** The Nimbra API use case went live with a 2026-10-31 launch date, and photo shoot spend is reduced by an
> estimated $40K this year [UC-50185]. Weekly usage is trending up, and it is expanding to a second market next
> quarter [UC-50185]. A hackathon drew 50 attendees and a webinar 28 [EV-60128, EV-60127].
>
> **Risks.** Three use cases are blocked, and the Social Adaptation use case is past its 2026-08-31 launch date
> [UC-50178, UC-50186, UC-50179]. Two sessions had low attendance and need a deep dive rescheduled [EV-60120,
> EV-60121]. The budget owner is still to be confirmed [EV-60123, EV-60119].
>
> **Next steps.** Confirm the budget owner and send the pilot success criteria for sign-off [EV-60123, EV-60119].
> Book the follow-up enablement session [EV-60123, EV-60127]. Review what blocks the three blocked use cases
> [UC-50178, UC-50186, UC-50179]. Draft the value realization summary for the live use case [EV-60119, UC-50185].

About 230 words, four sections, and 1 to 3 cited fact IDs per sentence. Every fact comes from calls 5 and 6.

### Audit lines written by the session
These are the lines appended to `../data/mcp-audit.jsonl` by calls 1 to 6, in order:

```json
{"time":"2026-11-24T21:56:06.169Z","tool":"list_open_gaps","args_sha256":"ec844737fecdf804158beef238bf155246c9bde0afd576ce4e366f8b2d0cacb2","duration_ms":3,"result_bytes":22,"outcome":"ok"}
{"time":"2026-11-24T21:56:06.188Z","tool":"list_open_gaps","args_sha256":"844e9dad8eade66e189bc4eb55519a6183f44e2a18378edaee4f5837f2bc2a8b","duration_ms":1,"result_bytes":1339,"outcome":"ok"}
{"time":"2026-11-24T21:56:06.251Z","tool":"trace_requirement","args_sha256":"0751a02119145bc180a0b4b5d1b10ca10c977707065e864414648627bf2d1f4f","duration_ms":47,"result_bytes":449,"outcome":"ok"}
{"time":"2026-11-24T21:56:06.612Z","tool":"search_customers","args_sha256":"7c2e629af9bd103b13cc3c0e53a1834c7e10a36a83e34293180e51e9dcd73f1b","duration_ms":341,"result_bytes":122,"outcome":"ok"}
{"time":"2026-11-24T21:56:10.931Z","tool":"get_customer_facts","args_sha256":"204c147d544f8e81cc3055ca2303509b77e56a6402d862a73b65441d5d7e62b4","duration_ms":9,"result_bytes":13178,"outcome":"ok"}
{"time":"2026-11-24T21:56:15.074Z","tool":"get_use_case","args_sha256":"a8b7344d24c7a354aa0b21d3b1308cae4789c35fdb8a6fcd85eb656aa9877423","duration_ms":1,"result_bytes":781,"outcome":"ok"}
```

The `{"severity":"Medium"}` call has the same hash (`844e9dad…`) as the Inspector's identical call in Part A. The
hash is stable across clients, and it holds no value.

A line at 21:49:58 (`get_use_case`) comes from a call outside this session, so it is not listed here.
