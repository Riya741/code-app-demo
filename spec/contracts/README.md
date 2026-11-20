# Hand-off contracts

Versioned JSON Schemas for every hand-off between agents ([Constitution Article XII.2](../constitution.md#article-xii--ai-agents-and-data)).
A hand-off that fails its schema is rejected and never repaired silently (AOPS-ORCH-002, AOPS-FAIL-002).

| Contract | From → To | Enforced by | Requirements |
|---|---|---|---|
| [fact-sheet.v1](fact-sheet.v1.schema.json) | [Retriever](../agents/retriever.md) → [Analyst](../agents/analyst.md) | zod in the orchestrator | AIB-CITE-001, AIB-SAFE-001, AIB-SAFE-003 |
| [analyst-to-writer.v1](analyst-to-writer.v1.schema.json) | [Analyst](../agents/analyst.md) → [Writer](../agents/writer.md) | structured output + zod | AIB-CITE-002, AIB-FAITH-001 |
| [writer-to-critic.v1](writer-to-critic.v1.schema.json) | [Writer](../agents/writer.md) → [Critic](../agents/critic.md) | structured output + zod | AIB-CITE-002, AIB-FMT-001, AIB-FMT-002 |
| [critic-verdict.v1](critic-verdict.v1.schema.json) | [Critic](../agents/critic.md) → [Orchestrator](../agents/orchestrator.md) | structured output + zod | AIB-CITE-003, AOPS-FAIL-003 |
| [brief-draft.v1](brief-draft.v1.schema.json) | [Guard](../agents/guard.md) → [Orchestrator](../agents/orchestrator.md) → UI | zod; API response | AIB-API-003, AIB-SAFE-002, AIB-HUMAN-002, AIB-HUMAN-004 |
| [task-handoff.v1](task-handoff.v1.schema.json) | [Implementer](../agents/implementer.md) → [Reviewer](../agents/reviewer.md) → human | spec lint check 12 | DEVA-HAND-001..003 |

## Rules (checked by spec lint, check 13)
- File name `<name>.v<N>.schema.json`; `$id` ends with the file name; `$schema` and `title` present.
- `x-contract` holds `name` and `version` matching the file name, `from` and `to` agent IDs that exist in
  [spec/agents/](../agents/README.md), and the `requirements` the contract serves (IDs must exist).
- **Versioning:** a backward-incompatible change is a new file (`.v2.`), with both versions kept until every producer
  and consumer has moved; the agent specs that use it bump their versions. Adding an optional field is not allowed
  either, because every object sets `additionalProperties: false`: make a new version.
- **Structured outputs:** the API supports a subset of JSON Schema. The runtime derives the request schema from these
  files (dropping unsupported keywords such as `maxLength`) and then validates the response against the **full**
  schema with zod, so these files stay the source of truth.
