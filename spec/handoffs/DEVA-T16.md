---
contract: task-handoff.v1
task: DEVA-T16
agent: session
covers: [DEVA-SPEC-004, DEVA-SPEC-005, DEVA-SUB-003, DEVA-HAND-004]
files_changed: [spec/agents/README.md, spec/agents/writer.md, spec/scripts/spec_lint.py, spec/contracts/README.md, spec/contracts/fact-sheet.v1.schema.json, spec/contracts/brief-draft.v1.schema.json, spec/contracts/task-handoff.v1.schema.json, spec/contracts/writer-draft.v1.schema.json, spec/templates/handoff.md, .claude/skills/task-implement/SKILL.md, .claude/skills/eval-run/SKILL.md, .claude/README.md, server/ai/contracts.ts, tests/unit/contracts.test.ts]
tests: [tests/unit/contracts.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: DEVA-T16 Keep only the Analyst, Writer and Spec author agents

## What changed
`spec/agents/` holds AGENT-ANALYST, AGENT-WRITER (1.1.0: no critic input, output `writer-draft.v1`) and
AGENT-SPEC-AUTHOR. The other nine specs are deleted and listed in the README's *Retired agents* table, and
`.claude/agents/` keeps only `spec-author.md` (DEVA-SUB-003). Spec lint accepts `code:<step>`, `session`, `human` and
`ui` as contract endpoints and rejects retired agents there (DEVA-SPEC-004, DEVA-SPEC-005). Hand-offs may name an
active or retired agent or `session`, and a reviewer may also be `human`. A `**Retired tasks:**` line keeps removed
task IDs known, so history can still cite them. `task-handoff.v1` accepts `session` (DEVA-HAND-004), and every earlier
hand-off still validates. `/task-implement` and `/eval-run` run in the main session.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| DEVA-SPEC-004 | `py -I spec/scripts/spec_lint.py` 0 errors with `code:retriever`, `code:guard`, `session`, `human`, `ui` endpoints; before the contract edits it reported "x-contract 'from' names retired agent AGENT-RETRIEVER" |
| DEVA-SPEC-005 | Lint run with the stale contracts: 7 "names retired agent" errors; the 20 historical hand-offs naming AGENT-IMPLEMENTER / AGENT-REVIEWER pass |
| DEVA-SUB-003 | `.claude/agents/` lists only `spec-author.md`; lint check 11 counts 1 prompt file |
| DEVA-HAND-004 | `tests/unit/contracts.test.ts`: "DEVA-HAND-004 accepts session as agent and reviewer, and earlier hand-offs naming retired agents still validate"; this file uses `agent: session` |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 existing react-refresh warnings in `src/`) · pass |
| G4 | `npm test` (once, at close) | 24 files, 300 passed, 1 expected fail |

## Open questions
- The L2 evidence documents in `l2-competency/` still describe the old roster; this task does not edit them (owner).

## Review
Verdict: **pass** (main-session review against the criteria, CR-20261121-1).
- DEVA-SPEC-004 / -005: checked in `check_contracts` and `check_handoffs`; retired IDs are read from the README table,
  and a retired ID that still has a spec is an error.
- DEVA-HAND-004: the schema change only widens accepted values; zod and JSON Schema agree (registry test passes).
- CLAUDE.md "Never": no test was weakened. The contract-count floor in `contracts.test.ts` went from 6 to 5 because
  the CR deletes one contract, and the registry test still compares the full set exactly.
