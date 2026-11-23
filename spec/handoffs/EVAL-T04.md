---
contract: task-handoff.v1
task: EVAL-T04
agent: session
covers: [EVAL-GATE-004, EVAL-EXP-003, AOPS-ROUTE-008]
files_changed: [evals/run.ts, evals/configs/default.json, evals/register.mjs, evals/resolve-ts.mjs, evals/README.md, package.json, tsconfig.node.json]
tests: [tests/integration/eval-harness.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: EVAL-T04 Harness CLI

## What changed
- **Running it:** `evals/run.ts` runs on Node 24 with `--experimental-transform-types`, plus a small resolve hook
  for the project's extensionless imports. No new dependency.
- **Commands:**
  - `smoke`: the 8 `-01` cases;
  - `full` and `compare`: a 3-case pilot that reports its measured and projected cost, then stops unless `--yes`;
  - `grade <dir>`: replays recorded results without a model;
  - `build-dataset`.
- **Each case:** runs the real pipeline on the case's in-memory store. The spans are collected in memory (latency and
  tokens per step), and results go to `<AI_RUNS_DIR>/evals/…`.
- **Gateway route:** `gatewayBulkRefusal` runs before the workbook is generated and before any model call.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| EVAL-GATE-004 | "EVAL-GATE-004 npm runs eval:smoke, eval:full and eval:compare …"; the README's measured cost is pending (Partial) |
| EVAL-EXP-003 | "EVAL-EXP-003 a full run first runs a 3-case pilot …" |
| AOPS-ROUTE-008 | "AOPS-ROUTE-008 a live eval on the gateway route is refused …" |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean (`evals/` now in `tsconfig.node.json`) · G4 31 files passed, 1 skipped; 397 passed, 1 expected fail, 1 skipped.

## Open questions
- **Message Batches:** not built. The gateway route sends single requests (CR-20261123-1). Batches on the direct route
  go with the experiment (EVAL-T06), which CR-20261123-2 proposes to defer.
- **First live smoke:** 16 Sonnet calls through the gateway, with `AI_GATEWAY_ALLOW_BULK=1`. It waits for the owner's
  approval, and would fill in the README's cost column.

## Review
**Verdict: pass** (session, 2026-11-23).
