# Agent: Orchestrator

- **ID:** AGENT-ORCHESTRATOR
- **Version:** 1.0.0
- **Kind:** runtime
- **Spec:** [024-agent-ops](../specs/024-agent-ops/)

## Purpose
Run one AI Account Brief from request to draft: call the steps in a fixed order, validate every hand-off, enforce
budgets and tool permissions, checkpoint, and trace. It is deterministic code, not an LLM ([ADR-0008](../adr/0008-orchestration-pattern.md)).

## Inputs
`POST /api/ai/brief { customerId }`; resume and cancel requests; step outputs
[analyst-to-writer.v1](../contracts/analyst-to-writer.v1.schema.json), [writer-to-critic.v1](../contracts/writer-to-critic.v1.schema.json),
[critic-verdict.v1](../contracts/critic-verdict.v1.schema.json), [brief-draft.v1](../contracts/brief-draft.v1.schema.json).

## Outputs
Run record and checkpoints in `../data/ai-runs/`; progress events; the final [brief-draft.v1](../contracts/brief-draft.v1.schema.json); trace spans.

## Tools
None of its own. It grants each step only the tools that step's agent spec lists and refuses any other (AOPS-ORCH-004).

## Model
None (deterministic code).

## Guardrails
- Never passes on or repairs an invalid hand-off without the one repair retry (AOPS-ORCH-002, AOPS-FAIL-002).
- Never writes to the workbook (Article XII.3).
- Never logs free text, prompts or model output (AOPS-OBS-002).

## Done when
- The run ends in exactly one of `succeeded`, `unverified`, `failed`, `cancelled`, with a trace span for every step and call.

## Failure
Retries and timeouts (AOPS-FAIL-001), repair retry (AOPS-FAIL-002), bounded critic loop (AOPS-FAIL-003), refusals
(AOPS-FAIL-004), truncation (AOPS-FAIL-005), circuit breaker (AOPS-FAIL-006), budgets (AOPS-BUDG-001), resume
(AOPS-REC-001), cancel (AOPS-REC-002).

## Requirements
AOPS-ORCH-001..005, AOPS-FAIL-001..007, AOPS-BUDG-001, AOPS-BUDG-002, AOPS-REC-001..004, AOPS-OBS-001, AOPS-OBS-002, AIB-API-001..004

## Implementation
`server/ai/orchestrator.ts`, `server/ai/resilience.ts`, `server/ai/trace.ts`, `server/ai/routes.ts` (planned, AOPS-T01).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
