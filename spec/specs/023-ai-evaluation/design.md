# Design — AI Evaluation

## Overview
An `evals/` harness in TypeScript runs the brief pipeline (or replays recorded outputs) over a fixed dataset, grades
each output with deterministic graders and an LLM judge, and writes a report. The judge is an agent with its own spec
([AGENT-JUDGE](../../agents/judge.md)) and is calibrated against human scores before its numbers are trusted. The
smoke subset with thresholds becomes gate **G7**. The [eval-analyst](../../agents/eval-analyst.md) development agent
runs the harness and explains score changes.

## Components and files
| File | Role |
|---|---|
| `evals/README.md` | How to run, measured cost per command, how to read a report |
| `evals/dataset/cases.jsonl`, `VERSION` | Cases with expectations (EVAL-DATA-001..005) |
| `evals/dataset/human-labels.jsonl` | Human scores for calibration (EVAL-CAL-001) |
| `evals/fixtures/` | Seeds and planted-record definitions; workbooks are generated, never committed (SEC-SUPPLY-001) |
| `evals/graders/code/*.ts` | Deterministic graders (EVAL-CODE-001..006) |
| `evals/graders/judge/judge.vN.md`, `judge-output.schema.json` | Judge prompt versions and output schema |
| `evals/configs/*.json` | Experiment configurations: model × prompt × critic × effort |
| `evals/run.ts` | CLI behind `npm run eval:smoke`, `eval:full`, `eval:compare`, `eval:calibrate` |
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
interface JudgeCriterion { evidence: string[]; reasoning: string; score: 1 | 2 | 3 | 4 | 5 }
```

## Flows
```
eval:calibrate  human-labels ─► judge vN ─► κ, ρ per criterion ─► judge-history.md (EVAL-CAL-002..004)
eval:full       configs × cases × reps ─► pipeline (Message Batches API for bulk) ─► runs/ ─► graders ─► report
eval:smoke      8 representative cases × current config ─► graders + judge ─► thresholds ─► exit 0/1 (G7)
CI (every PR touching server/ai/** or evals/**): code graders on recorded outputs ─► thresholds ─► exit 0/1
```
- **Pilot first (EVAL-EXP-003):** `eval:full --pilot 3` runs three cases per configuration, prints cost per brief and
  the projected full-run cost, and stops.
- **Judge model:** both Sonnet and Opus are calibrated; the cheaper one is used when its κ is within 0.05 of the
  other's. The other model judges a 20% sample (EVAL-JUDGE-005).

## Error handling
A case whose pipeline run fails is recorded as a failure with its error type (it is not dropped), so failures count
against a configuration. A judge response that fails its schema is retried once, then the case is marked
`judge_error` and excluded from judge metrics, with the count shown in the report.

## Testing approach
Unit tests for each code grader on hand-made outputs (good, uncited, hallucinated, wrong count, injected, unsafe
HTML), named by EVAL-CODE IDs. Statistics (κ, ρ, bootstrap CI) tested on textbook examples. The harness itself is
tested in replay mode with no API calls.

## Alternatives considered
- **Judge only, no code graders:** cheaper to build, but citations and numbers are exactly checkable and a judge is
  less reliable on them.
- **Full grid (3 models × 2 prompts × critic on/off = 12 configurations):** the six chosen configurations answer the
  same three questions at half the runs.
- **Hosted eval platform:** not needed for one feature; plain files keep reports in git.

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Dataset, graders and thresholds are specified before the harness. ✅ |
| II Workbook is truth | Uses generated fixtures; never reads or writes the app workbook. ✅ |
| III Safe by default | Fictional data only; workbooks generated, never committed. ✅ |
| IV Valid by construction | Judge output validated against its schema. ✅ |
| V Clear feedback | n/a (developer tool); the CLI prints pass/fail per threshold. ✅ |
| VI Theme & responsive | n/a (no UI). ✅ |
| VII Accessible | n/a (no UI). ✅ |
| VIII Simple & local-first | Plain TypeScript and files; no eval platform. ✅ |
| IX Layered architecture | Calls the pipeline through `server/ai`, not around it. ✅ |
| X Testable & traceable | Graders tested; metrics map to requirement IDs. ✅ |
| XI Performance budget | Latency per step reported (EVAL-CODE-006). ✅ |
| XII AI agents & data | This spec is how XII.6 is met; the judge has an agent spec. ✅ |

**Exceptions:** none.
