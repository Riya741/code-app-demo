---
contract: task-handoff.v1
task: AOPS-T11
agent: session
covers: [AOPS-ORCH-006, AOPS-FAIL-008, AOPS-OBS-007]
files_changed: [server/ai/config.ts, server/ai/orchestrator.ts, server/ai/contracts.ts, server/ai/tools.ts, server/ai/trace.ts, server/ai/steps/retriever.ts, tests/integration/orchestrator.test.ts, tests/integration/tools.test.ts, tests/unit/ai-config.test.ts, tests/unit/ai-trace.test.ts, tests/unit/ai-client.test.ts, tests/unit/contracts.test.ts]
tests: [tests/integration/orchestrator.test.ts, tests/unit/ai-config.test.ts, tests/integration/tools.test.ts, tests/unit/contracts.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AOPS-T11 Remove the Critic step

## What changed
The pipeline is retrieve → analyse → write → guard, with no branch (`nextStep`, `STEP_NAMES`); `MAX_REVISIONS` and
the critique step are gone. Only analyse and write call a model. Retrieve and guard have `agent: null` in
`STEP_AGENTS`, and their spans and the run span carry no agent ID; a code step's tool set is keyed `code:<step>` and
grants nothing. The run ends `unverified` when the guard's draft is `unverified`, else `succeeded`. `critic-verdict.v1`
is removed from `contracts.ts`, and `writer-to-critic.v1` is now `writer-draft.v1` (same shape).

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AOPS-ORCH-006 | `tests/integration/orchestrator.test.ts`: "AOPS-ORCH-006 runs retrieve → analyse → write → guard in that order, each step getting the previous hand-off"; "AOPS-ORCH-006 the state machine has no branch, no critique step, and only analyse and write call a model"; `tests/unit/ai-config.test.ts`: "AOPS-ORCH-003 each step's agent, version and model defaults are the ones in its agent spec" |
| AOPS-FAIL-008 | `tests/integration/orchestrator.test.ts`: "AOPS-FAIL-008 the run ends unverified, with the draft and its issues, when the guard's citation checks fail" |
| AOPS-OBS-007 | `tests/integration/orchestrator.test.ts`: "AOPS-OBS-007 every run, step, model call and tool call writes one JSONL span; only agent steps carry an agent ID"; the earlier trace tests retitled from AOPS-OBS-001 |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors · pass |
| G4 | related: `npx vitest run` on the 7 AI test files · full `npm test` once at close | 110 passed · 300 passed, 1 expected fail |

## Open questions
- None. The Guard's citation checks themselves are AIB-T04 (re-scoped to cover AIB-CITE-003).

## Review
Verdict: **pass** (main-session review against AOPS-ORCH-006, AOPS-FAIL-008, AOPS-OBS-007 and the 024 design).
- Article XII.2: hand-offs are still validated against fixed output contracts; nothing is repaired.
- Article XII.7: model-step spans keep the agent spec ID and version; code steps are not agents (glossary).
- `revision` stays in `Position` and the contracts, always 0, so checkpoints and contracts keep their shape.
