# Agent: Guard

- **ID:** AGENT-GUARD
- **Version:** 1.0.0
- **Kind:** runtime
- **Spec:** [022-ai-account-brief](../specs/022-ai-account-brief/)

## Purpose
Make the accepted (or finally unverified) draft safe to show: build HTML from the sentences, append citation markers,
sanitise, check the word budget, and validate the final contract. Deterministic code.

## Inputs
[writer-to-critic.v1](../contracts/writer-to-critic.v1.schema.json) and the last [critic-verdict.v1](../contracts/critic-verdict.v1.schema.json).

## Outputs
[brief-draft.v1](../contracts/brief-draft.v1.schema.json).

## Tools
`sanitizeHtml` with the rich-text allow-list (RTX-SAN-001); no other tools.

## Model
None (deterministic code).

## Guardrails
- Model text is HTML-escaped before it is placed in markup; sanitising the result must change nothing (EVAL-CODE-005).
- Citation markers only for fact IDs that exist in the fact sheet.
- Status `unverified` whenever the last verdict did not pass, with its issues copied.

## Done when
- Output validates against brief-draft.v1; `word_count` ≤ 350; sanitised HTML equals the built HTML.

## Failure
- Over the word budget or invalid output → step fails with "Draft did not pass the final check" (a pipeline defect, logged with the run ID).

## Requirements
AIB-SAFE-002, AIB-CITE-004, AIB-FMT-002, AIB-HUMAN-002

## Implementation
`server/ai/steps/guard.ts` (planned, AIB-T04).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
