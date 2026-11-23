# Agent specs

One file per AI agent, runtime or development ([Constitution Article XII.1](../constitution.md#article-xii--ai-agents-and-data)).
An agent is a step that calls a model (runtime) or a Claude Code subagent (development); deterministic code steps are
not agents. An agent spec names the agent's purpose, inputs, outputs, allowed tools, model, guardrails, done criteria
and failure behaviour. Prompts (`server/ai/prompts/`) and Claude Code subagents (`.claude/agents/`) implement a spec
and cite it in a header; spec lint (G1) checks 10–11 keep the two in step.
Template: [templates/agent.md](../templates/agent.md). Hand-offs: [contracts/](../contracts/README.md).

The roster is kept small to limit tokens per run ([CR-20261121-1](../changes/CR-20261121-1-slim-agent-roster.md)).

## Runtime agents: the AI Account Brief pipeline ([ADR-0008](../adr/0008-orchestration-pattern.md))

The pipeline is retrieve → analyse → write → guard (AOPS-ORCH-006). Retrieve (`server/ai/steps/retriever.ts`), guard
and the orchestrator (`server/ai/orchestrator.ts`) are code steps, written `code:<step>` in contracts.

| Agent | ID | In → Out | Tools |
|---|---|---|---|
| [Analyst](analyst.md) | AGENT-ANALYST | fact-sheet.v1 → analyst-to-writer.v1 | `get_use_case`, `get_event` (read-only) |
| [Writer](writer.md) | AGENT-WRITER | analyst-to-writer.v1 → writer-draft.v1 | None |

## Evaluation agents ([CR-20261121-2](../changes/CR-20261121-2-eval-only-judge.md))

Called only by the eval harness in `eval:full` and `eval:compare`; never by the pipeline, the app, `eval:smoke` or CI.

| Agent | ID | In → Out | Tools |
|---|---|---|---|
| [Eval judge](eval-judge.md) | AGENT-EVAL-JUDGE | fact-sheet.v1 + writer-draft.v1 → judge-verdict.v1 | None |

## Development agents (Claude Code subagents)

| Agent | ID | Job | Hand-off |
|---|---|---|---|
| [Spec author](spec-author.md) | AGENT-SPEC-AUTHOR | Idea → CR → spec edits passing G1 | CR + spec diff |

Implementing, testing, reviewing and running evals happen in the main session (DEVA-SUB-003); its hand-offs name
`agent: session` (DEVA-HAND-004).

## Retired agents

Historical hand-offs may name these IDs; contracts and prompt or subagent headers may not (DEVA-SPEC-005).

| ID | Last version | Retired by | Now |
|---|---|---|---|
| AGENT-ORCHESTRATOR | 1.0.0 | CR-20261121-1 | Code: `server/ai/orchestrator.ts` |
| AGENT-RETRIEVER | 1.0.1 | CR-20261121-1 | Code step `code:retriever` |
| AGENT-GUARD | 1.0.0 | CR-20261121-1 | Code step `code:guard` (AIB-T04) |
| AGENT-CRITIC | 1.0.0 | CR-20261121-1 | Removed; the Guard's citation checks verify (AIB-CITE-003) |
| AGENT-JUDGE | 1.0.0 | CR-20261121-1 | Replaced by the narrower AGENT-EVAL-JUDGE (CR-20261121-2) |
| AGENT-IMPLEMENTER | 1.0.0 | CR-20261121-1 | Main session, `/task-implement` |
| AGENT-TEST-WRITER | 1.0.0 | CR-20261121-1 | Main session, `/task-implement` |
| AGENT-REVIEWER | 1.1.0 | CR-20261121-1 | Main session review, then the owner |
| AGENT-EVAL-ANALYST | 1.0.0 | CR-20261121-1 | Main session, `/eval-run` |

## Rules
- File name = ID without `AGENT-`, lower case (`AGENT-SPEC-AUTHOR` → `spec-author.md`).
- Bump the version on any change to Tools, Model, Inputs, Outputs or Guardrails, and update every file whose header
  cites the agent; lint rejects a header with an old version.
- Retiring an agent: delete its file and add a row to *Retired agents*; never reuse its ID.
