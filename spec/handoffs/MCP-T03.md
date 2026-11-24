---
contract: task-handoff.v1
task: MCP-T03
agent: session
covers: [MCP-SRV-003, MCP-SRV-005, MCP-SEC-004]
files_changed: [mcp/workbook-mcp/src/specTools.ts, mcp/workbook-mcp/src/index.ts, mcp/workbook-mcp/src/guard.ts]
tests: [tests/mcp/specTools.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: MCP-T03 Spec tools, resources, prompt; `run_spec_lint` via `execFile`

## What changed
`workbook-mcp` now offers four read tools over the spec set:
- **`get_requirement`:** the requirement, its sources, links to its spec files, and the tasks in any spec that cover it.
- **`list_open_gaps`:** the Open rows of the gap register, optionally filtered by severity.
- **`trace_requirement`:** requirement → tasks → source files → tests → eval metrics.
- **`run_spec_lint`:** runs gate G1.

It also offers:
- **Resources:** `spec://constitution` and `spec://specs/{nnn}/requirements` (one listed resource per spec, plus the
  template).
- **Prompt:** `draft-account-brief(customer_id)`.

How the controls apply:
- **Files:** every file is opened through the MCP-T01 path allow-list.
- **`run_spec_lint`:** takes no arguments and uses `execFile` with a fixed program and argument list, and no shell.
- **Resource reads and prompt requests:** validated and audited like tool calls, under the fixed labels
  `resources/read` and `prompts/get`. `guard.ts` gains `writeAudit`, shared with `withControls`.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| MCP-SRV-003 | `tests/mcp/specTools.test.ts`: "MCP-SRV-003 offers get_requirement, list_open_gaps, trace_requirement and run_spec_lint", "MCP-SRV-003 get_requirement returns …", "… reports an unknown ID …", "MCP-SRV-003 list_open_gaps …", "MCP-SRV-003 trace_requirement links …", "… on the real spec set lists the eval metrics …", "MCP-SRV-003 every eval metric in the map …", "MCP-SRV-003 reads spec files only through the path allow-list" |
| MCP-SRV-005 | same file: "MCP-SRV-005 exposes spec://constitution and spec://specs/{nnn}/requirements", "MCP-SRV-005 refuses any other resource URI, and audits each read", "MCP-SRV-005 offers the draft-account-brief prompt …" |
| MCP-SEC-004 | same file: "MCP-SEC-004 starts the linter with execFile, a fixed program, a fixed argument list and no shell", "… refuses any argument, such as shell metacharacters, before anything runs", "… reports lint errors, and a linter that cannot start …", "MCP-SEC-004 runs the real spec linter of this repository" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 449 passed, 1 expected fail, 1 skipped |
| G5 | n/a | no UI |

## Open questions
- **Tests are traced through the spec set, not by reading test titles.** The allow-list (MCP-SEC-001) covers only
  `spec/` and the workbook.
  - `trace_requirement` takes tests from traceability §2 and the hand-off evidence tables, so it misses tests that
    neither lists.
  - Title-level tracing would need `tests/` added to the allow-list (read-only), which needs a CR. Owner decision.
- **Eval metrics:** only the EVAL-CODE grader requirements map to metrics. An AIB requirement shows `[]` until a spec
  states which metric measures it (e.g. a `Measured by:` line, via a CR).
- **The prompt names data tools that don't exist yet.** It refers to `get_customer_facts`, `list_use_cases` and
  `list_events`, which arrive with MCP-T02.
- **Fixture IDs in the test are built at run time.** Spec lint check 9 reads every ID written in a test file as a
  citation. The check is unchanged.

## Review
Session review, 2026-11-24, `git diff` against the criteria: pass.
- **MCP-SRV-003:** the four tools are listed with strict schemas. Parsing follows the formats spec_lint enforces,
  including ranges and cross-spec Covers lines. Checked on the real spec set (DT-TIME-003 → UCP-T08 and PERF-T03, plus
  `tests/unit/dates.test.ts`).
- **MCP-SRV-005:** the resource URIs match exactly (`\d{3}`). Traversal, other schemes and malformed URIs are refused.
  The prompt argument is digits only, so no client text is put into the prompt.
- **MCP-SEC-004:** `child_process` is imported only for `execFile`, and `shell: false` is explicit. The tool's schema
  is empty and strict, so any argument is refused before a process starts.
- **MCP-SEC-001:** every `fs.*Sync` call takes a path returned by `ctx.paths.resolve` (checked by a test).
- **Article III.4:** failures return short catalog messages, with no stack traces or paths.
