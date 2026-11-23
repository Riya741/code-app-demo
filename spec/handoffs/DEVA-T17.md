---
contract: task-handoff.v1
task: DEVA-T17
agent: session
covers: [DEVA-GATE-002]
files_changed: [.claude/hooks/gates_on_stop.py, tests/hooks/test_hooks.py, spec/workflow.md]
tests: [tests/hooks/test_hooks.py]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: DEVA-T17 Stop hook runs only the related tests

## What changed
DEVA-GATE-002 says the stop hook runs "the affected tests", but it ran the whole vitest suite on any TypeScript change.
It now runs `vitest related <changed .ts/.tsx files that exist> --run --passWithNoTests`, and no tests when only deleted
or non-TS files changed. The workflow says to run related tests while building and the full suite once at close.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| DEVA-GATE-002 | `tests/hooks/test_hooks.py`: `test_DEVA_GATE_002_runs_only_tests_related_to_changed_files` (plus the existing never-blocks-twice and nothing-changed tests) |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors · pass |
| G4 | `npm run test:hooks` · `npm test` (once, at close) | 18 hook tests OK · 300 passed, 1 expected fail |

## Open questions
- Restart Claude Code (or review in `/hooks`) so the changed hook loads.

## Review
Verdict: **pass** (main-session review). The hook still fails open and still allows a stop after one block
(`stop_hook_active`); only the test command changed, and its arguments are built by a pure function under test.
