# Hand-off contracts

Versioned JSON Schemas for every hand-off between agents ([Constitution Article XII.2](../constitution.md#article-xii--ai-agents-and-data)).
A hand-off that fails its schema is rejected and never repaired silently (AOPS-ORCH-002, AOPS-FAIL-002).

| Contract | From → To | Enforced by | Requirements |
|---|---|---|---|
| [fact-sheet.v1](fact-sheet.v1.schema.json) | `code:retriever` → [Analyst](../agents/analyst.md) | zod in the orchestrator | AIB-CITE-001, AIB-SAFE-001, AIB-SAFE-003 |
| [analyst-to-writer.v1](analyst-to-writer.v1.schema.json) | [Analyst](../agents/analyst.md) → [Writer](../agents/writer.md) | structured output + zod | AIB-CITE-002, AIB-FAITH-001 |
| [writer-draft.v1](writer-draft.v1.schema.json) | [Writer](../agents/writer.md) → `code:guard` | structured output + zod | AIB-CITE-002, AIB-FMT-001, AIB-FMT-002 |
| [brief-draft.v1](brief-draft.v1.schema.json) | `code:guard` → `ui` (via the orchestrator) | zod; API response | AIB-API-003, AIB-SAFE-002, AIB-CITE-003, AIB-HUMAN-009, AIB-HUMAN-012 |
| [judge-verdict.v1](judge-verdict.v1.schema.json) | [Eval judge](../agents/eval-judge.md) → `code:eval-harness` | structured output + zod | EVAL-JUDGE-006, EVAL-JUDGE-009 |
| [task-handoff.v1](task-handoff.v1.schema.json) | `session` → `human` | spec lint check 12 | DEVA-HAND-002..004 |

Since [CR-20261121-1](../changes/CR-20261121-1-slim-agent-roster.md): `critic-verdict.v1` is deleted (no Critic) and
`writer-to-critic.v1` is renamed `writer-draft.v1` (same shape, no producer existed yet). `task-handoff.v1` accepts
`session` for `agent` and `reviewer`; every earlier hand-off still validates.

## Rules (checked by spec lint, check 13)
- File name `<name>.v<N>.schema.json`; `$id` ends with the file name; `$schema` and `title` present.
- `x-contract` holds `name` and `version` matching the file name, `from` and `to`, and the `requirements` the
  contract serves (IDs must exist). An endpoint is an agent ID with a spec in [spec/agents/](../agents/README.md),
  a code step `code:<step>`, `session`, `human` or `ui`; never a retired agent (DEVA-SPEC-004, DEVA-SPEC-005).
- **Versioning:** a backward-incompatible change is a new file (`.v2.`), with both versions kept until every producer
  and consumer has moved; the agent specs that use it bump their versions. Adding an optional field is not allowed
  either, because every object sets `additionalProperties: false`: make a new version.
- **Structured outputs:** the API supports a subset of JSON Schema. The runtime derives the request schema from these
  files (dropping unsupported keywords such as `maxLength`) and then validates the response against the **full**
  schema with zod, so these files stay the source of truth.
- **Formats are asserted, not hints:** `format: date` must be `YYYY-MM-DD`; `format: date-time` must be RFC 3339 with
  seconds, an upper-case `T` and an offset written `Z` or `±hh:mm` (what `Date.prototype.toISOString()` produces).
  `maxLength` counts characters (code points). Implemented in `server/ai/contracts.ts` (AIB-T01).
