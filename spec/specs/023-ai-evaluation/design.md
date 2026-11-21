# Design — AI Evaluation

## Overview
An `evals/` harness in TypeScript runs the brief pipeline (or replays recorded outputs) over a fixed dataset, grades
each output with deterministic graders, and writes a report. The smoke subset with thresholds becomes gate **G7**.
The `/eval-run` skill runs the harness in the main session and explains score changes. CR-20261121-1 removed the LLM
judge, its human calibration and the critic configurations to cut tokens. CR-20261121-2 adds back a narrow eval-only
judge (AGENT-EVAL-JUDGE) on a different model from the Writer, calibrated against owner labels (κ). Code graders stay
primary: G7, smoke and CI use them alone.

## Components and files
| File | Role |
|---|---|
| `evals/README.md` | How to run, measured cost per command, how to read a report |
| `evals/dataset/cases.jsonl`, `VERSION` | Cases with expectations (EVAL-DATA-001..005) |
| `evals/fixtures/` | Seeds and planted-record definitions; workbooks are generated, never committed (SEC-SUPPLY-001) |
| `evals/graders/code/*.ts` | Deterministic graders (EVAL-CODE-001..006) |
| `evals/graders/judge/judge.v<N>.md` | Eval-judge prompt; header cites AGENT-EVAL-JUDGE (EVAL-JUDGE-006) |
| `evals/graders/judge/calibration.ts` | Weighted κ and Spearman ρ against `evals/dataset/human-labels.jsonl` (EVAL-CAL-005..007) |
| `evals/graders/judge/history.md` | Each judge prompt version with its κ and ρ (EVAL-CAL-008) |
| `evals/configs/*.json` | Experiment configurations: model × prompt × effort |
| `evals/run.ts` | CLI behind `npm run eval:smoke`, `eval:full`, `eval:compare` |
| `evals/thresholds.json` | G7 thresholds (EVAL-GATE-003) |
| `evals/runs/` (git-ignored) · `evals/reports/` | Raw outputs · committed reports (`*.md` + `scores.csv`) |

## Interfaces
```ts
interface EvalCase {
  id: string;                       // "rich-03"
  category: "rich" | "sparse" | "empty" | "conflicting" | "long" | "injection" | "non_latin" | "html";
  fixture: { seed: number; customers: number; plant?: string };   // plant = evals/fixtures/<name>.json
  customer_id: number;
  expectations: { must_mention: string[]; must_not_mention: string[];
                  status_counts?: Record<string, number>; max_words: number };
}
interface GradeRow { case_id: string; config: string; rep: number; metric: string; value: number; detail?: string }
```

## Flows
```
eval:full       configs × cases × reps ─► pipeline (Message Batches API for bulk) ─► runs/ ─► graders ─► report
judge step      (eval:full / eval:compare only) blind fact sheet + draft ─► judge model ≠ Writer model ─► judge-verdict.v1
                 ─► calibrated (κ ≥ 0.6 faithfulness, coverage)? scores in report : marked uncalibrated
eval:smoke      8 representative cases × current config ─► graders ─► thresholds ─► exit 0/1 (G7)
CI (every PR touching server/ai/** or evals/**): code graders on recorded outputs ─► thresholds ─► exit 0/1
```
- **Pilot first (EVAL-EXP-003):** `eval:full --pilot 3` runs three cases per configuration, prints cost per brief and
  the projected full-run cost, and stops.

## Error handling
A case whose pipeline run fails is recorded as a failure with its error type (it is not dropped), so failures count
against a configuration.

## Testing approach
Unit tests for each code grader on hand-made outputs (good, uncited, hallucinated, wrong count, injected, unsafe
HTML), named by EVAL-CODE IDs. Statistics (bootstrap CI) tested on textbook examples. The harness itself is
tested in replay mode with no API calls.

## Alternatives considered
- **Judge only, no code graders:** cheaper to build, but citations and numbers are exactly checkable and a judge is
  less reliable on them.
- **Full grid (3 models × 2 prompts = 6 configurations):** the four chosen configurations (EVAL-EXP-006) answer the
  same two questions with fewer runs.
- **LLM judge calibrated against human labels (CR-20261117-1):** removed by CR-20261121-1 to cut tokens, then added
  back in narrow form by CR-20261121-2: eval-only, four criteria, no pairwise mode and no second judge. The
  different-model rule (EVAL-JUDGE-008) addresses self-preference at a fraction of the cost.
- **No judge (code graders only):** cheapest, but nothing scores faithfulness in meaning, coverage or tone, so
  ADR-0007 would be decided without a quality signal for them.
- **Hosted eval platform:** not needed for one feature; plain files keep reports in git.

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Dataset, graders and thresholds are specified before the harness. ✅ |
| II Workbook is truth | Uses generated fixtures; never reads or writes the app workbook. ✅ |
| III Safe by default | Fictional data only; workbooks generated, never committed. ✅ |
| IV Valid by construction | Every hand-off and draft validated against its contract (EVAL-CODE-001). ✅ |
| V Clear feedback | n/a (developer tool); the CLI prints pass/fail per threshold. ✅ |
| VI Theme & responsive | n/a (no UI). ✅ |
| VII Accessible | n/a (no UI). ✅ |
| VIII Simple & local-first | Plain TypeScript and files; no eval platform. ✅ |
| IX Layered architecture | Calls the pipeline through `server/ai`, not around it. ✅ |
| X Testable & traceable | Graders tested; metrics map to requirement IDs. ✅ |
| XI Performance budget | Latency per step reported (EVAL-CODE-006). ✅ |
| XII AI agents & data | This spec is how XII.6 is met, with deterministic graders only (no evaluation agent). ✅ |

**Exceptions:** none.
