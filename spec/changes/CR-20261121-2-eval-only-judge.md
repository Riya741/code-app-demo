# Change Request: Eval-only LLM judge with human calibration

- **ID:** CR-20261121-2
- **Author / date:** Project owner (decision), drafted with Claude Code · 2026-11-21
- **Type:** Behaviour change (evaluation harness only; no app, API, UI or brief-pipeline change)
- **Specs affected:** specs/023-ai-evaluation; `spec/agents/` (new AGENT-EVAL-JUDGE), `spec/contracts/` (new
  judge-verdict.v1), ADR-0007 (note), AI data policy
- **Constitution articles affected:** none amended (v1.1.1 stays); compliance re-checked for I, III, X and XII
- **Status:** Approved 2026-11-21 by the project owner · branch `phase-3-ai-pipeline`

## 1. Problem
CR-20261121-1 retired AGENT-JUDGE and the calibration requirements to cut tokens, so every eval score now comes from
deterministic graders. Those graders check citations, entities, numbers, safety and length exactly, but nothing scores
what code cannot check: whether the brief is faithful in meaning, covers what matters, is actionable and reads in an
executive tone. Model and prompt decisions (ADR-0007, Article XII.6) are then made without a quality signal for those
properties. The owner's decision: *"a narrow eval-only judge, with a different model from the writer and κ calibration
against your labels."*

## 2. Proposed behaviour
**One new evaluation agent, AGENT-EVAL-JUDGE** ([spec](../agents/eval-judge.md)). It is new, not AGENT-JUDGE
restored: retired IDs are never reused, and its scope is narrower.
- **Eval-only.** It runs only from the eval harness in `eval:full` and `eval:compare` (EVAL-JUDGE-007). The brief
  pipeline, the app API, `eval:smoke`, gate G7 and CI never call it, so it adds no tokens to a user's run or to a PR.
- **Different model from the Writer** (EVAL-JUDGE-008). The harness refuses to judge a configuration whose Writer
  model equals the judge model, to avoid self-preference. Default judge model `claude-opus-5-5` while the Writer's
  interim model is `claude-sonnet-5-5`; when a configuration uses Opus as the Writer, the judge switches to Sonnet.
- **Narrow rubric** (EVAL-JUDGE-006): faithfulness, coverage, actionability and executive tone, 1 to 5 against written
  anchors, with quoted evidence before reasoning before score. Concision stays a code metric (EVAL-CODE-006).
- **Blind** (EVAL-JUDGE-009): it never sees the model, prompt version or configuration.
- **No pairwise mode and no second judge** (unlike the retired AGENT-JUDGE): the different-model rule covers
  self-preference at a fraction of the cost.

**Human calibration (κ).** The owner scores 15 to 20 drafts from fictional fixtures with the same rubric
(EVAL-CAL-005). The harness computes quadratic-weighted Cohen's κ and Spearman ρ per criterion (EVAL-CAL-006). Judge
scores count in the report and in ADR-0007 only while κ ≥ 0.6 on faithfulness and coverage (EVAL-CAL-007); below
that, they are shown as *uncalibrated* and excluded from decisions. Each judge prompt version is kept with its κ and ρ
(EVAL-CAL-008), and the report lists the largest judge-human disagreements (EVAL-WHY-004).

**Contract.** New `judge-verdict.v1` (AGENT-EVAL-JUDGE → `code:eval-harness`). The judge reads the case's
`fact-sheet.v1` and the `writer-draft.v1` output.

**Deterministic graders stay primary.** G7 (EVAL-GATE-005) is unchanged and uses code graders only.

## 3. Spec impact
| File | IDs | Change |
|---|---|---|
| agents/eval-judge.md | AGENT-EVAL-JUDGE | new evaluation agent; README roster gains an *Evaluation agents* table |
| contracts/judge-verdict.v1.schema.json | judge-verdict.v1 | new contract; README row |
| specs/023-ai-evaluation/requirements.md | EVAL-JUDGE-006..009, EVAL-CAL-005..008, EVAL-EXP-009, EVAL-WHY-004 | new (the retired EVAL-JUDGE-001..005, EVAL-CAL-001..004 and EVAL-WHY-003 stay Deprecated; IDs not reused) |
| specs/023-ai-evaluation/design.md | — | judge files, flow, calibration, alternatives, Constitution check |
| specs/023-ai-evaluation/tasks.md | EVAL-T11..T14 | new tasks (EVAL-T14: the zod schema, so the contract registry stays complete) |
| adr/0007-model-and-prompt-choice.md | — | note: calibrated judge scores inform the decision |
| steering/ai-data-policy.md | — | the judge receives only the fact sheet and the draft |
| README.md, traceability.md | — | dashboard counts, roster, chain |

## 4. Risks and rollout
- **Tokens:** one judge call per case per repetition, in full runs only. The pilot (EVAL-EXP-003) prints the judge
  cost before a full run starts. Smoke and CI cost nothing extra.
- **A judge that disagrees with people** is excluded from decisions automatically (EVAL-CAL-007) rather than trusted.
- **Human labels are owner time** (15 to 20 drafts). They use fictional fixtures only (ADR-0006).
- Nothing is built until the Writer (AIB-T03) and the harness (EVAL-T04) exist; EVAL-T11 depends on both.

## 5. Review
- [x] requirements.md approved by: project owner, 2026-11-21
- [x] design.md approved by: project owner, 2026-11-21
- [x] tasks.md approved by: project owner, 2026-11-21
- [ ] Implementation verified on: — (EVAL-T11..T14)
