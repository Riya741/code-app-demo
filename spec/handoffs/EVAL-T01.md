---
contract: task-handoff.v1
task: EVAL-T01
agent: session
covers: [EVAL-DATA-001, EVAL-DATA-002, EVAL-DATA-003, EVAL-DATA-004, EVAL-DATA-005]
files_changed: [evals/lib/dataset.ts, evals/dataset/specs.ts, evals/dataset/cases.jsonl, evals/dataset/VERSION, evals/fixtures/fixture.json]
tests: [tests/integration/eval-harness.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: EVAL-T01 Dataset

## What changed
- **Cases:** 32 cases, 4 in each of the 8 categories. Each one picks a customer by activity rank in the seed-42,
  8-customer fixture.
- **Planted records:** applied in memory to a `Store` that is never saved. The plants are `keep_one`, `delete_all`,
  `status_mix` (with a stale variant), long `notes`, injection notes with markers, `rename_customer` (Japanese,
  Greek, Cyrillic, Arabic) and HTML notes.
- **Expectations:** `build-dataset` computes them from the planted source records: the newest use case as
  `must_mention`, the other customers' names plus the markers as `must_not_mention`, the counts by status, and 350
  words.
- **Drift check:** `checkCase` rebuilds a case's expectations, and every harness run checks its cases first.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| EVAL-DATA-001, -003, -004, -005 | `tests/integration/eval-harness.test.ts`: one test each, titled with the ID |
| EVAL-DATA-002 | "EVAL-DATA-002 every case is reproduced exactly from the generator …" (regenerates the fixture, all 32 cases) |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean (`evals/` now in `tsconfig.node.json`) · G4 31 files passed, 1 skipped; 397 passed, 1 expected fail, 1 skipped.

## Review
**Verdict: pass** (session, 2026-11-23).
- No real data (ADR-0006), and no `.xlsx` in the project: the fixture is generated into a temp folder.
- The planted injection texts are invented.
