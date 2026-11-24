# Design — MCP Tooling (`workbook-mcp`)

## Overview
A small Node process started by the MCP client over stdio. It loads the workbook read-only through the same `Store`
code as the app, wraps `server/ai/tools.ts` for data tools, and parses `spec/` for spec tools. Every handler passes
through one wrapper that validates input, enforces the path allow-list, applies redaction and writes the audit line.

## Components and files
| File | Role |
|---|---|
| `mcp/workbook-mcp/src/index.ts` | Server set-up (`@modelcontextprotocol/sdk`, low-level `Server`), tool/resource/prompt registration (`createServer`) |
| `mcp/workbook-mcp/src/main.ts` | Stdio entry point started by `.mcp.json` (`node --experimental-transform-types --import ./evals/register.mjs`) |
| `mcp/workbook-mcp/src/config.ts` | Paths from the repository root: workbook (`WORKBOOK_PATH` or default), `spec/`, `spec/changes/`, audit log; no secrets |
| `mcp/workbook-mcp/src/guard.ts` | `withControls(tool, args)`: string cap, zod schema, `PathGuard` allow-list, result cap, audit line; `MESSAGES` |
| `mcp/workbook-mcp/src/specTools.ts` | `get_requirement`, `list_open_gaps`, `trace_requirement`, `run_spec_lint`; resources and the `draft-account-brief` prompt; `EVAL_METRICS` (metric → grader requirement) · planned: `propose_change_request` (MCP-T04) |
| `mcp/workbook-mcp/src/dataTools.ts` | `search_customers` (app ranking `src/lib/search.ts`), `get_customer_facts` (Retriever `retrieve`, notes cut to 300), and `get_use_case` / `get_event` / `list_use_cases` / `list_events` wrapped from `server/ai/tools.ts` |
| `server/ai/tools.ts` | Shared data functions (024-agent-ops) |
| `.mcp.json` | Project registration (no secrets) |
| `tests/mcp/*.test.ts` | Tool and control tests (`guard.test.ts`, `server.test.ts` from MCP-T01) |

## Interfaces
```ts
search_customers({ query: string /* ≤ 200 */, limit?: number /* ≤ 20 */ })
  → { items: { id: number; name: string; use_cases: number; events: number }[] }
get_customer_facts({ customer_id: number }) → FactSheetV1         // same contract as the Retriever
list_use_cases({ customer_id: number; status?: string; page?: number; page_size?: number /* ≤ 50 */ })
list_events({ customer_id: number; from?: string; to?: string; page?: number; page_size?: number })
get_requirement({ id: string /* ^[A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-\d{3}$ */ }) → { id, title, status, criterion, spec, tasks[] }
list_open_gaps({ severity?: "High" | "Medium" | "Low" }) → rows of gates/gap-register.md
trace_requirement({ id: string }) → { requirement, tasks[], sources[], tests[], eval_metrics[] }
run_spec_lint() → { ok: boolean; errors: string[]; summary: string }
propose_change_request({ title, problem, behaviour }) → { path: "spec/changes/CR-<date>-<n>-<slug>.md" }  // MCP_ALLOW_WRITE=1 only
```

## Data and state
Read-only. The only write is a new file under `spec/changes/` when enabled. The audit log is outside the repo.

## Flows
```
client ─► tools/call ─► withControls: validate ─► allow-list ─► handler ─► redact ─► cap ─► audit ─► result
                                  └── any rejection ─► error result with field name + audit line (outcome: rejected)
```

## Implementation notes (MCP-T01)
- The low-level SDK `Server` is used instead of `McpServer`, so a call with invalid input or an unknown tool name
  still reaches `withControls` and is audited; `McpServer` would refuse it inside the SDK first.
- The zod schema of each tool is authoritative; the JSON Schema in `tools/list` is advertised for the client.
- A path is checked after `realpath` (nearest existing folder for a file not created yet) and handlers open the
  returned real path. `..` segments are refused before resolving.
- If the audit line cannot be written, the call fails closed with "The audit log could not be written."
- An unregistered tool name is client text, so the audit line records it as `(unknown)` (MCP-AUD-002).

## Implementation notes (MCP-T02)
- **Record tools:** `get_use_case`, `get_event`, `list_use_cases` and `list_events` are the `server/ai/tools.ts`
  definitions. They use the same zod schema and JSON Schema objects, and run through `runTool`. Its refusals come back
  as rejections with its message; a workbook failure comes back as "The tool could not read the workbook."
- **Why `get_use_case` and `get_event` are offered:** MCP-SEC-005 needs a by-ID way to read a full note, and the list
  tools' descriptions point to them.
- **`get_customer_facts`:** calls `retrieve` with the new optional `textMax` (`LIST_TEXT_MAX`, 300). The fact sheet
  is still a valid fact-sheet.v1. The cut is counted in `redactions`. `run_id` is `run_mcp<12 hex>`.
- **`search_customers`:** ranks with the app's `rankMatches` (`src/lib/search.ts`), so results match the search box.
  - Counts come from `useCasesByParent` / `eventsByParent`.
  - Names are redacted with `dataText`.
  - Results are capped at 20 (default 10), with the total number of matches.
- **Workbook:** a `Store` opened on first use at the path `PathGuard` returns. The tool context exposes it only as
  `ReadOnlyStore` (`fresh`, `table`).

## Implementation notes (MCP-T03)
- Spec tools read only through `PathGuard` (MCP-SEC-001), so they never read `tests/` or `evals/`. As a result:
  - `trace_requirement` finds **sources** from the requirement's `Source:` line and traceability §2.
  - It finds **tests** from traceability §2 and from the evidence tables of the hand-offs of the covering tasks. It
    does not read test titles.
  - It finds **eval metrics** from `EVAL_METRICS`, the summary metrics each EVAL-CODE grader requirement defines. A test
    keeps the map in step with `Summary` in `evals/graders/code/index.ts`. Other requirements get an empty list until a
    spec says which metric measures them.
- Covers lines are read with ranges expanded (`API-GEN-001..004`), across every spec, so shared tasks are found.
- `run_spec_lint` takes no arguments. It runs `execFile("py" | "python3", ["-I", <real path of spec_lint.py>])`
  with `shell: false`, the repository as cwd, and a 120 s timeout.
  - Exit code 1 means "errors found".
  - Any other failure returns "Spec lint could not run."
- Resource reads and prompt requests are validated and audited under the fixed labels `resources/read` and
  `prompts/get`. A refusal is an MCP protocol error (these methods have no error result).
- The prompt takes `customer_id` (digits only). It asks for the four AIB sections with cited fact IDs, from
  workbook-mcp data tools only, and marks the result as a draft. The data tools arrive with MCP-T02.

## Error handling
Rejections return MCP tool errors with a short reason ("id must match PREFIX-AREA-NNN", "path outside allow-list");
they never include stack traces (Article III.4) and are audited.

## Testing approach
Unit tests per tool on the 8-customer fixture; hostile-input tests per security control (MCP-TEST-001); one
recorded MCP Inspector session and one Claude Code session (MCP-TEST-002).

## Alternatives considered
- **Let agents read files directly:** no validation, redaction or audit; the reason for this spec.
- **HTTP transport:** needs authentication (SEC-EXPO-002); stdio keeps it local.

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Tools and controls specified before the server. ✅ |
| II Workbook is truth | Never writes the workbook (MCP-SEC-002). ✅ |
| III Safe by default | Allow-list, no shell, redaction, audit, no secrets. ✅ |
| IV Valid by construction | Schemas on every tool. ✅ |
| V Clear feedback | Rejections name the field. ✅ |
| VI Theme & responsive | n/a (no UI). ✅ |
| VII Accessible | n/a (no UI). ✅ |
| VIII Simple & local-first | Local stdio; one shared implementation. ✅ |
| IX Layered architecture | Reuses `server/ai/tools.ts`; no second query layer. ✅ |
| X Testable & traceable | Test per tool and per control. ✅ |
| XI Performance budget | Page and result caps. ✅ |
| XII AI agents & data | Data policy applied; agents get least privilege. ✅ |

**Exceptions:** none.
