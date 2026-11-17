# Design — MCP Tooling (`workbook-mcp`)

## Overview
A small Node process started by the MCP client over stdio. It loads the workbook read-only through the same `Store`
code as the app, wraps `server/ai/tools.ts` for data tools, and parses `spec/` for spec tools. Every handler passes
through one wrapper that validates input, enforces the path allow-list, applies redaction and writes the audit line.

## Components and files
| File | Role |
|---|---|
| `mcp/workbook-mcp/src/index.ts` | Server set-up (`@modelcontextprotocol/sdk`), tool/resource/prompt registration |
| `mcp/workbook-mcp/src/guard.ts` | `withControls(handler)`: schema validation, allow-list, size caps, audit |
| `mcp/workbook-mcp/src/specTools.ts` | `get_requirement`, `list_open_gaps`, `trace_requirement`, `run_spec_lint`, `propose_change_request` |
| `server/ai/tools.ts` | Shared data functions (024-agent-ops) |
| `.mcp.json` | Project registration (no secrets) |
| `tests/mcp/*.test.ts` | Tool and control tests |

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
