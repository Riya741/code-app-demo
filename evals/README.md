# AI evaluation

Evaluates the AI Account Brief pipeline ([spec 023](../spec/specs/023-ai-evaluation/requirements.md)) with
deterministic code graders. There is no LLM judge in these commands (CR-20261121-1). All data is fictional (ADR-0006).

## Commands
| Command | What it does | Model calls | Measured cost |
|---|---|---|---|
| `npm run eval:smoke` | 8 cases (the `-01` case of each category), then gate G7 against `thresholds.json` | 16 Sonnet calls | not measured yet |
| `npm run eval:full` | 3-case pilot with its measured and projected cost; add `-- --yes` to run all 32 cases | 6 (pilot) · 64 (all) | not measured yet |
| `npm run eval:compare` | The same for each config in `configs/` | 6 · 64 per config | not measured yet |
| `npm run eval:grade -- <dir>` | Replay: re-grades `results.jsonl` in a results folder | none | $0 |
| `npm run eval:build-dataset` | Rebuilds `dataset/cases.jsonl` from `dataset/specs.ts` on the seeded fixture | none | $0 |

**Measured cost:** this column is filled in after the first owner-approved live run (EVAL-GATE-004). Gateway use is
kept to a minimum (CR-20261123-1).

**Exit codes:** 0 means the gate passed, or the run stopped after the pilot. 1 means a threshold was breached. 2
means the run was refused or hit an error.

## Settings
Live runs use the app's AI settings (the `AI_*` variables; see `server/ai/config.ts`). On the gateway route
(`AI_GATEWAY=portkey`), a live run also needs `AI_GATEWAY_ALLOW_BULK=1`. Without it, the harness refuses before any
model call (AOPS-ROUTE-008). Requests are sent one at a time.

Results go to `<AI_RUNS_DIR>/evals/<time>-<command>/`, which is outside the project:
- `results.jsonl`: one recorded case per line;
- `report.json`: the summary, the gate result and the dataset version.

## Dataset
- **Cases:** `dataset/cases.jsonl` holds 32 cases, 4 in each of the 8 categories: rich, sparse, empty, conflicting,
  long, injection, non_latin and html.
- **Data:** each case points at a customer in the workbook that `scripts/generate_demo_workbook.py` builds with the
  settings in `fixtures/fixture.json` (seed 42, 8 customers). The case's planted records are applied in memory and
  never saved.
- **Expectations:** `must_mention`, `must_not_mention`, the counts by status and the word limit are computed by
  `build-dataset`.
- **Drift check:** every run first checks that each case still matches the fixture.
- **Changing cases:** edit `specs.ts`, run `eval:build-dataset`, then bump `dataset/VERSION`.

## Graders (`graders/code/`)
| Grader | What it measures |
|---|---|
| Schema (EVAL-CODE-001) | Every hand-off against its contract |
| Citations (EVAL-CODE-002) | Validity and coverage of citations |
| Entities (EVAL-CODE-003) | Workbook names in the draft that are not in the fact sheet |
| Numbers (EVAL-CODE-004) | Counts, statuses and ISO dates against the source records |
| Safety (EVAL-CODE-005) | HTML that sanitising would change, followed injections, fact-sheet policy |
| Cost (EVAL-CODE-006) | Words, tokens, cost and latency per case and per step |

The gate (EVAL-GATE-005) reads `thresholds.json`. An unknown key counts as a breach. Lowering a limit needs a change
request that cites a report (EVAL-GATE-003).
