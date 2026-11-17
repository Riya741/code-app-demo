# Agent: Critic

- **ID:** AGENT-CRITIC
- **Version:** 1.0.0
- **Kind:** runtime
- **Spec:** [022-ai-account-brief](../specs/022-ai-account-brief/)

## Purpose
Decide whether a draft may go to the user. Code checks run first (citations, unknown entities, length); then an LLM
checks what code cannot (numbers and statuses against the facts, omissions, tone, instructions followed from data).

## Inputs
[writer-to-critic.v1](../contracts/writer-to-critic.v1.schema.json) and the run's [fact-sheet.v1](../contracts/fact-sheet.v1.schema.json).

## Outputs
[critic-verdict.v1](../contracts/critic-verdict.v1.schema.json).

## Tools
None. The code checks are functions called by the step, not tools offered to the model.

## Model
Per [ADR-0007](../adr/0007-model-and-prompt-choice.md); interim `claude-sonnet-5-5`, effort `medium`,
`max_tokens` 8 000, timeout 45 s. Config: `AI_MODEL_CRITIC`, `AI_EFFORT_CRITIC`. With the critic switched off
(eval configs 5 and 6), only the code checks run.

## Guardrails
- `pass` is true only if every code check passes **and** the LLM verdict passes.
- Every issue names its section, sentence and type, with a fix hint the Writer can act on.
- Judges against the fact sheet only, never against general knowledge.

## Done when
- Output validates; `pass` is consistent with `code_checks` and `issues`.

## Failure
- Invalid output → one repair retry, then the step fails (AOPS-FAIL-002).
- Rejection → orchestrator loop, at most 2 revisions, then `unverified` (AOPS-FAIL-003).

## Requirements
AIB-CITE-003, AIB-FAITH-001, AIB-FAITH-002, AIB-SAFE-001, AIB-FMT-002, AOPS-FAIL-003

## Implementation
`server/ai/steps/critic.ts`, prompt `server/ai/prompts/critic.v1.md` (planned, AIB-T03).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
