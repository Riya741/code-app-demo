# Agent: Retriever

- **ID:** AGENT-RETRIEVER
- **Version:** 1.0.0
- **Kind:** runtime
- **Spec:** [022-ai-account-brief](../specs/022-ai-account-brief/)

## Purpose
Build the fact sheet for one customer: the only data the LLM steps will see, with stable fact IDs, the AI data policy
allow-list and redaction applied, and free text wrapped as data. Deterministic code.

## Inputs
`customerId` and a read-only `Store` view of the workbook.

## Outputs
[fact-sheet.v1](../contracts/fact-sheet.v1.schema.json).

## Tools
Read-only `Store` queries for the customer, its non-deleted use cases and events, and the lookups to resolve names.

## Model
None (deterministic code).

## Guardrails
- Only fields in the [AI data policy](../steering/ai-data-policy.md) allow-list; emails, phone numbers and query-string links redacted.
- Soft-deleted rows are never included.
- Free text cut to 1 500 characters and placed only in `text` fields.

## Done when
- Output validates against fact-sheet.v1; every record has a fact ID; `counts` match the records; `redactions` lists what was removed.

## Failure
- Customer not found → run fails with 404 before any model call (AIB-API-001).
- Output invalid → step fails (a code defect; no repair retry for deterministic steps).

## Requirements
AIB-CITE-001, AIB-SAFE-001, AIB-SAFE-003, AIB-FAITH-003

## Implementation
`server/ai/steps/retriever.ts` (planned, AIB-T02).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
