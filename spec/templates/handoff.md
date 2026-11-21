---
contract: task-handoff.v1
task: <PREFIX-Tnn>
agent: session
covers: [<PREFIX-AREA-NNN>, <PREFIX-AREA-NNN>]
files_changed: [<path>, <path>]
tests: [<path>]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pending
reviewer: session
---
# Hand-off: <PREFIX-Tnn> <task title>

## What changed
<One paragraph: the behaviour now implemented, in the words of the criteria.>

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| <PREFIX-AREA-NNN> | `<test file>`: "<PREFIX-AREA-NNN …>" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | <summary line> |
| G3 | `npm run lint` · `npm run typecheck` | <errors / warnings> |
| G4 | `npm test` | <passed / failed> |

## Open questions
- <none | question, with who must answer>

## Review
<Written by the reviewer (the session, or the owner as `human`): verdict, then findings, each tied to a requirement ID, an article or a CLAUDE.md rule.>

<!-- Rules (checked by spec/scripts/spec_lint.py, check 12; contract spec/contracts/task-handoff.v1.schema.json):
  - Save as spec/handoffs/<PREFIX-Tnn>.md; 'task' equals the file name and is an existing task.
  - 'covers' lists only IDs from that task's Covers line; 'agent' is 'session' or an agent ID; 'reviewer' is 'session', 'human' or an agent ID.
  - 'verdict' is pending, pass or fail. Lists are written inline: [a, b].
-->
