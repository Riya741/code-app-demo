# Traceability walkthrough: AIB-CITE-002

**Requirement:** *"THE draft SHALL mark every factual sentence with the fact IDs of the use cases or events it is
based on."* ([022 requirements](../../spec/specs/022-ai-account-brief/requirements.md), heading AIB-CITE-002)

This page follows one requirement through every layer of the project, from the constitution to a production trace. The
first two steps were pulled **live** on 2026-11-24, through the project's own MCP server (`workbook-mcp`), from a Claude
Code session. This is the same path an agent uses to ground itself in the specs.

## 1. Ask the spec set: `get_requirement` and `trace_requirement` (MCP)
`mcp__workbook__get_requirement {"id":"AIB-CITE-002"}` returned:

```json
{"id":"AIB-CITE-002","title":"Every factual sentence cites its records","status":"✅ Implemented",
 "criterion":"THE draft SHALL mark every factual sentence with the fact IDs of the use cases or events it is based on.",
 "source":["server/ai/steps/analyst.ts","server/ai/steps/writer.ts","server/ai/steps/guard.ts",
           "server/ai/prompts/analyst.v1.md","server/ai/prompts/writer.v2.md"],
 "spec":"022-ai-account-brief",
 "tasks":[{"id":"AIB-T03","title":"Analyst and Writer steps with prompts v1 (headers cite their agent specs).","status":"✅ Done"},
          {"id":"AIB-T11","title":"Writer prompt v2 and a cap of 3 markers per sentence in the Guard (CR-20261124-1); …","status":"✅ Done"}]}
```

`mcp__workbook__trace_requirement {"id":"AIB-CITE-002"}` added the tests:

```json
"tests":["tests/integration/analyst-writer.live.test.ts","tests/integration/analyst-writer.test.ts","tests/unit/ai-guard.test.ts"]
```

## 2. The chain, layer by layer
| Layer | Where | What ties it to AIB-CITE-002 |
|---|---|---|
| Constitution | [Article XII](../../spec/constitution.md#article-xii--ai-agents-and-data) | AI output is a draft until a person saves it. Agents work under specs and hand off through contracts |
| Requirement | [022 requirements, AIB-CITE-002](../../spec/specs/022-ai-account-brief/requirements.md) | EARS criterion. Status ✅ with its `Source:` files |
| Design | [022 design](../../spec/specs/022-ai-account-brief/design.md) | The Writer returns plain-text sentences with `fact_ids` and the Guard builds the HTML, "so citation checks work per sentence (AIB-CITE-002, -003)" |
| Agent specs | [analyst.md](../../spec/agents/analyst.md), [writer.md](../../spec/agents/writer.md) | Both list AIB-CITE-002 under *Requirements*. The Writer spec is at version 1.2.0 |
| Contract | [writer-draft.v1.schema.json](../../spec/contracts/writer-draft.v1.schema.json) | Each sentence must have `text`, `factual` and `fact_ids` (pattern `^(CU\|UC\|EV)-[0-9]+$`) |
| Prompt headers | [analyst.v1.md](../../server/ai/prompts/analyst.v1.md), [writer.v2.md](../../server/ai/prompts/writer.v2.md) | First line `<!-- agent-spec: AGENT-WRITER@1.2.0 · requirements: AIB-CITE-002, … -->`. Spec lint check 11 fails on version drift |
| Code | [analyst.ts](../../server/ai/steps/analyst.ts), [writer.ts](../../server/ai/steps/writer.ts) (header comment, AIB-CITE-002), [guard.ts](../../server/ai/steps/guard.ts) (AIB-CITE-003/004 checks on the same `fact_ids`) | The Analyst rejects a point without fact IDs or with an unknown one (`invalid_output`). The Guard marks an uncited factual sentence as `unverified` |
| Tasks and hand-offs | [022 tasks](../../spec/specs/022-ai-account-brief/tasks.md): AIB-T03, AIB-T11. [AIB-T03.md](../../spec/handoffs/AIB-T03.md), [AIB-T11.md](../../spec/handoffs/AIB-T11.md) | Criteria → evidence tables, gate results and review verdicts |
| Tests | [analyst-writer.test.ts](../../tests/integration/analyst-writer.test.ts) | 7 tests titled `AIB-CITE-002 …`, e.g. "AIB-CITE-002 every point and every factual sentence carries fact IDs from the run's fact sheet, passed on unchanged" and "… fails the run with invalid_output when a point has no fact IDs" |
| Eval grader | [evals/graders/code/index.ts](../../evals/graders/code/index.ts) (EVAL-CODE-002) | `citation_coverage` is the share of factual sentences with ≥ 1 fact ID; `citation_validity` is the share of cited IDs that exist. Gated by `evals/thresholds.json` (≥ 0.95 and ≥ 0.98) |
| Eval result | [eval/smoke-2026-11-24.md](eval/smoke-2026-11-24.md) | Smoke run through the gateway: citation coverage **1.00** and validity **1.00** on all 8 cases (G7 passed) |
| Trace span | [ops/trace-sample.md](ops/trace-sample.md) | The `write` step span of run `run_939c49a6…`: agent `AGENT-WRITER`, `agentVersion`, `promptVersion`, model, tokens, cost and outcome. The run outcome `unverified` is where the Guard reports a citation issue |

## 3. What keeps the chain intact
- **G1 spec lint fails if:**
  - a prompt cites an agent version that doesn't match its spec (check 11);
  - a hand-off covers a requirement its task doesn't (check 12);
  - a test title doesn't start with a known requirement ID (check 9);
  - a `Source:` path doesn't exist.
- **Version check:** a test (`AIB-CITE-002 each prompt cites its agent spec at the current version …`) checks that the
  version in each prompt header matches the agent spec's version, and that the agent ID matches the step's
  configured agent.
- **G7:** blocks a prompt or model change that lowers citation coverage below the threshold.

## Known limit
`trace_requirement` lists eval metrics only for the grader requirements themselves (EVAL-CODE-001..006). For
AIB-CITE-002 it returns `eval_metrics: []`, and the link to `citation_coverage` above was made by hand. A
`Measured by:` line on requirements would close this; it is recorded in the MCP-T03 hand-off as an owner decision.
