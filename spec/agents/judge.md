# Agent: Judge

- **ID:** AGENT-JUDGE
- **Version:** 1.0.0
- **Kind:** evaluation
- **Spec:** [023-ai-evaluation](../specs/023-ai-evaluation/)

## Purpose
Score a brief on what code cannot check (faithfulness, coverage, actionability, concision, executive tone) against an
anchored rubric, or compare two briefs pairwise. Used only while calibrated against human scores.

## Inputs
The case's [fact-sheet.v1](../contracts/fact-sheet.v1.schema.json) and one or two
[writer-to-critic.v1](../contracts/writer-to-critic.v1.schema.json) outputs, with nothing that identifies the model,
prompt or configuration (EVAL-JUDGE-003).

## Outputs
Per criterion `{ evidence[], reasoning, score }` (schema `evals/graders/judge/judge-output.schema.json`), or a pairwise
preference with reasons.

## Tools
None.

## Model
Chosen by calibration (EVAL-CAL-003): `claude-sonnet-5-5` or `claude-opus-5-5`, effort `high`, `max_tokens` 8 000.
The other model judges a 20% sample (EVAL-JUDGE-005).

## Guardrails
- Evidence (quoted spans) before reasoning before score.
- Judges against the fact sheet only.
- Pairwise comparisons run twice with positions swapped (EVAL-JUDGE-004).

## Done when
- Output validates; every score has at least one quoted evidence span.

## Failure
- Invalid output → one retry, then the case is marked `judge_error` and counted in the report.
- κ below 0.6 on faithfulness or coverage → not used for decisions until the prompt is revised (EVAL-CAL-003).

## Requirements
EVAL-JUDGE-001..005, EVAL-CAL-003, EVAL-CAL-004

## Implementation
`evals/graders/judge/judge.v1.md` (planned, EVAL-T03).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
