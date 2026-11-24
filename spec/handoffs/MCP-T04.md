---
contract: task-handoff.v1
task: MCP-T04
agent: session
covers: [MCP-SRV-006, MCP-SEC-002]
files_changed: [mcp/workbook-mcp/src/specTools.ts, mcp/workbook-mcp/src/index.ts, mcp/workbook-mcp/src/config.ts, mcp/workbook-mcp/src/guard.ts]
tests: [tests/mcp/changeRequest.test.ts, tests/mcp/specTools.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: MCP-T04 Change-request tool behind `MCP_ALLOW_WRITE`

## What changed
`propose_change_request(title, problem, behaviour)` writes one new change request from
`spec/templates/change-request.md` and returns `{ id, path }`.
- **File name:** `spec/changes/CR-<yyyymmdd>-<n>-<slug>.md`, where `n` is the next free number that day.
- **Never overwrites:** the file is written with flag `wx`, to the allow-list's write path.
- **Content:**
  - The file says it is proposed and not reviewed.
  - Problem and behaviour are one line each inside a fenced block.
  - Type, specs and articles are left for the owner.
- **Kept lint-clean:** requirement and task IDs mentioned in the text must exist, so the new file never breaks spec
  lint (G1).

Read-only by default:
- **Opt-in:** the tool is marked `writes`. `createServer` registers write tools only when `MCP_ALLOW_WRITE` is exactly
  `1`.
- **Otherwise:** it is not listed, and calling it returns "Unknown tool."
- **The workbook is never written in any mode:**
  - the store is read-only;
  - the allow-list refuses the workbook in write mode;
  - the server's only file writes are this file and the audit line.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| MCP-SRV-006 | `tests/mcp/changeRequest.test.ts`: "MCP-SRV-006 writes a new CR file from the template under spec/changes/ and returns its path", "… numbers from 1 on a new day and slugs any title …", "… keeps free text as one fenced line …", "… refuses unknown requirement or task IDs, odd titles, oversize text and extra fields, writing nothing", "… is audited like every call, without the text it wrote". Manual: a CR generated in the real repo with hostile Markdown (`# …`, a link, an HTML comment) passed spec lint with 0 errors; the file was then deleted. |
| MCP-SEC-002 | same file: "MCP-SEC-002 does not list or run propose_change_request unless MCP_ALLOW_WRITE is exactly 1" (unset, `0`, `true`, `yes`, ` 1`), "MCP-SEC-002 never writes the workbook, with writes enabled or not" (only two file-write calls in `mcp/workbook-mcp/src`, no `.save(`), "MCP-SEC-002 calling every tool with MCP_ALLOW_WRITE=1 leaves the workbook file unchanged" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 468 passed, 1 expected fail, 1 skipped |
| G5 | n/a | no UI |

## Open questions
- **Text length.** MCP-SEC-003 caps every string at 200 characters, so problem and behaviour are short summaries.
  The owner fills in the rest when reviewing.
- **The date is the server's local calendar day.** That matches how CR IDs are written by hand.
- **One existing test changed.** The MCP-T03 source check (`specTools.test.ts`) now also accepts the write target.
  It gained an assertion that the target comes from `ctx.paths.resolve(rel, "write")`, so the check is not weaker.

## Review
Session review, 2026-11-24, `git diff` against the criteria: pass.
- **MCP-SRV-006:**
  - The file is filled from the template and the path is returned.
  - A title like `../../../outside/escape` only becomes a slug inside `spec/changes/`.
  - Text that tries to start a heading, link or HTML stays inside the fence.
- **MCP-SEC-002:** the exact `1` check and the filter apply to injected tool lists too. Calling every tool with
  writes on leaves the workbook byte-identical.
- **MCP-SEC-001 / MCP-AUD-002:** the write goes through `PathGuard` write mode. The audit line holds no proposal text
  (canary check).
- **Article I:** the tool only proposes. The file is marked not reviewed and nothing else changes.
