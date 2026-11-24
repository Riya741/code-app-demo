---
contract: task-handoff.v1
task: MCP-T05
agent: session
covers: [MCP-TEST-001]
files_changed: [tests/mcp/hostile.test.ts]
tests: [tests/mcp/hostile.test.ts, tests/mcp/guard.test.ts, tests/mcp/specTools.test.ts, tests/mcp/dataTools.test.ts, tests/mcp/changeRequest.test.ts, tests/mcp/server.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: MCP-T05 Tool tests and hostile-input tests per control

## What changed
MCP-TEST-001 asks for a test per tool, and a hostile-input test per security control (MCP-SEC-001..004). Most of
those were written with MCP-T01..T04. This task checks that the whole set is complete, and adds
`tests/mcp/hostile.test.ts`, which keeps it complete as tools are added.

**Coverage guard.** One test checks that every registered tool, including the write tool, is called by name in another
`tests/mcp` test. A new tool without a test fails the suite.

**Sweep over every tool**, run in a context where nothing can be read or written:
- an oversize string in each string field (refused, naming the field);
- an unknown field carrying shell metacharacters;
- traversal and shell text in each ID, enum or number field;
- hostile free text that passes validation still never succeeds, and writes nothing.

**Through the real server, with writes off:**
- every listed tool refuses an unknown field;
- each refusal is audited;
- the write tool is not listed.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| MCP-TEST-001 | `tests/mcp/hostile.test.ts`: "MCP-TEST-001 every registered tool, including the write tool, is called by name in a test", "… an oversize string in any field of any tool is refused …", "… an unknown field carrying shell metacharacters is refused by every tool", "… shell metacharacters and path traversal in every ID or number field are refused …", "… hostile free text that passes validation reaches no file, process or workbook", "… through the real server, every tool refuses an unknown field and each refusal is audited". Per control: MCP-SEC-001 path traversal and junction (`guard.test.ts` "MCP-SEC-001 …"), MCP-SEC-002 (`changeRequest.test.ts` "MCP-SEC-002 …"), MCP-SEC-003 oversize string (`guard.test.ts` "MCP-SEC-003 refuses an oversize string …"), MCP-SEC-004 shell metacharacters (`specTools.test.ts` "MCP-SEC-004 refuses any argument, such as shell metacharacters …"). Unit test per tool: `dataTools.test.ts` (6 data tools), `specTools.test.ts` (4 spec tools), `changeRequest.test.ts` (`propose_change_request`). |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 474 passed, 1 expected fail, 1 skipped (`tests/mcp`: 59 tests in 6 files) |
| G5 | n/a | no UI |

## Open questions
- None.

## Review
Session review, 2026-11-24: pass.
- **Coverage:** every one of the 11 tools has a direct test. The coverage guard keeps that true.
- **Each control has a hostile-input test**, as the criterion lists:
  - path traversal and a symlink (junction) → MCP-SEC-001;
  - an oversize string → MCP-SEC-003;
  - shell metacharacters → MCP-SEC-004;
  - writes off by default → MCP-SEC-002.
- **Dead-end context:** the sweep's "repository" folder is still empty after the run, so no hostile call wrote
  anything.
