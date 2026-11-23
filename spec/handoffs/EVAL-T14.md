---
contract: task-handoff.v1
task: EVAL-T14
agent: session
covers: [EVAL-JUDGE-006, AOPS-ORCH-002]
files_changed: [server/ai/contracts.ts, tests/unit/contracts.test.ts, spec/contracts/judge-verdict.v1.schema.json]
tests: [tests/unit/contracts.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: EVAL-T14 `judge-verdict.v1` zod schema

## What changed
CR-20261121-2 added the contract file `spec/contracts/judge-verdict.v1.schema.json`. The contract registry test
(AOPS-ORCH-002) requires one zod schema per contract file, so `server/ai/contracts.ts` now exports
`JudgeVerdictV1Schema`, `JudgeVerdictV1` and `JUDGE_CRITERIA`, and registers `judge-verdict.v1` in `CONTRACTS`.
The schema is strict, with no defaults or coercion. It has exactly four criteria (faithfulness, coverage,
actionability, executive tone), each with 1 to 5 quoted evidence spans (at most 400 code points each), reasoning (at
most 1 200) and an integer score from 1 to 5. `tests/unit/contracts.test.ts` gains a valid sample for the contract.

The case ID pattern was tightened to the eight dataset categories (`rich`, `sparse`, `empty`, `conflicting`, `long`,
`injection`, `non_latin`, `html`) followed by two digits, in both the JSON Schema and zod. The test's
mutation generator showed that a looser `[a-z_]+` prefix accepted made-up IDs.

## Tests
`npx vitest run tests/unit/contracts.test.ts`: 22 passed. Structure, plus agreement between zod and the JSON Schema
on every generated variant, for every contract, `judge-verdict.v1` included.

## Gates
G1 spec lint 0 errors · G3 eslint on the changed files clean, typecheck clean · G4 related tests pass · G5 n/a (no UI).

## Review
Diff checked against the task: the registry is complete again and no test was weakened (one sample added, no
assertion changed). The judge prompt, harness step and Writer-model check are still to do in EVAL-T11.
