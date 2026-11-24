---
contract: task-handoff.v1
task: MCP-T02
agent: session
covers: [MCP-SRV-002, MCP-SRV-004, MCP-SEC-005, MCP-SEC-006]
files_changed: [mcp/workbook-mcp/src/dataTools.ts, mcp/workbook-mcp/src/index.ts, mcp/workbook-mcp/src/guard.ts, server/ai/steps/retriever.ts]
tests: [tests/mcp/dataTools.test.ts, tests/mcp/guard.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: MCP-T02 Data tools over `server/ai/tools.ts` with redaction

## What changed
`workbook-mcp` now offers six read tools over the workbook:
- **`search_customers(query, limit ≤ 20)`:** uses the app's own ranking (`rankMatches` in `src/lib/search.ts`).
  Returns ID, fact ID, the redacted name, live use case and event counts, and the total number of matches.
- **`get_customer_facts(customer_id)`:** the Retriever's fact-sheet.v1, with notes cut to 300 characters.
- **`list_use_cases`, `list_events`:** paged, at most 50 per page.
- **`get_use_case`, `get_event`:** the full note (1 500 characters) of one record, asked for by ID.

The four record tools are the `server/ai/tools.ts` definitions, run through `runTool`, so there is no second query
layer.

How the server reaches the workbook:
- It opens the configured workbook on first use, at the path the allow-list returns.
- The tool context exposes it only as the read side (`ReadOnlyStore`).
- Tests can hand in an in-memory store instead.

One change outside `mcp/`: `retrieve` accepts an optional `textMax`.
- Its default is still `TEXT_MAX`, and it can never be higher, so the runtime pipeline is unchanged (all retriever and
  orchestrator tests pass).

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| MCP-SRV-002 | `tests/mcp/dataTools.test.ts`: "MCP-SRV-002 offers search_customers, get_customer_facts, list_use_cases and list_events, …", "MCP-SRV-002 search_customers ranks like the app's search box …", "MCP-SRV-002 get_customer_facts returns a valid fact-sheet.v1 …", "MCP-SRV-002 list_use_cases and list_events page through every live record …", "MCP-SRV-002 opens the configured workbook through the allow-list and never changes it" |
| MCP-SRV-004 | same file: "MCP-SRV-004 the record tools are server/ai/tools.ts tools: same schema, same results as runTool", "MCP-SRV-004 get_customer_facts is the Retriever's fact sheet …", "MCP-SRV-004 dataTools.ts has no query logic of its own …" |
| MCP-SEC-005 | same file: "MCP-SEC-005 redacts emails and phone numbers, and never returns emails, summaries, IDs or deleted rows", "MCP-SEC-005 returns full note text only for one record asked for by ID; …" (fails when `textMax` is removed; checked) |
| MCP-SEC-006 | same file: "MCP-SEC-006 returns workbook free text only in fields named text, and every data tool says it is data" (planted instructions found only under `text` keys) |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 460 passed, 1 expected fail, 1 skipped |
| G5 | n/a | no UI |

## Open questions
- **Two more tools than MCP-SRV-002 lists.** `get_use_case` and `get_event` are offered in addition to the four
  named tools.
  - MCP-SEC-005 implies a by-ID read, and the shared list tools' descriptions point to them.
  - If the owner wants exactly four tools, a CR can drop them. Full notes would then never be returned.
- **Fixture data.** The fixture has no customer with more than 50 use cases. Page caps are covered by the shared
  `tools.ts` tests (AOPS-ORCH-005).

## Review
Session review, 2026-11-24, `git diff` against the criteria: pass.
- **MCP-SRV-002:** all four named tools are listed with strict schemas; paging and caps were checked on the fixture.
- **MCP-SRV-004:**
  - Results are identical to `runTool` and `retrieve`, and the schema objects are the same objects.
  - The only sheet read directly is `customer`, for search.
  - There is no `.save(` and no `deleted` handling of its own.
- **MCP-SEC-005:** a planted email and phone number are redacted. Personnel emails, the executive summary,
  link-sheet IDs and deleted rows never appear. Notes are 300 characters in lists and the fact sheet, and 1 500 only
  by ID.
- **MCP-SEC-006:** `DATA_NOTE` is in every data tool's description. Free text sits only in `text` fields.
- **Article II / XII.3:** the workbook file is byte-identical after every tool runs. The store is typed read-only.
