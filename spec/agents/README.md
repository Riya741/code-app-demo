# Agent specs

One file per AI agent, runtime or development ([Constitution Article XII.1](../constitution.md#article-xii--ai-agents-and-data)).
An agent spec names the agent's purpose, inputs, outputs, allowed tools, model, guardrails, done criteria and failure
behaviour. Prompts (`server/ai/prompts/`), judge prompts (`evals/graders/judge/`) and Claude Code subagents
(`.claude/agents/`) implement a spec and cite it in a header; spec lint (G1) checks 10–11 keep the two in step.
Template: [templates/agent.md](../templates/agent.md). Hand-offs: [contracts/](../contracts/README.md).

## Runtime agents: the AI Account Brief pipeline ([ADR-0008](../adr/0008-orchestration-pattern.md))

| Agent | ID | Kind of step | In → Out | Tools |
|---|---|---|---|---|
| [Orchestrator](orchestrator.md) | AGENT-ORCHESTRATOR | Code | request → brief-draft.v1 | Grants each step its listed tools |
| [Retriever](retriever.md) | AGENT-RETRIEVER | Code | customer → fact-sheet.v1 | Read-only `Store` |
| [Analyst](analyst.md) | AGENT-ANALYST | LLM | fact-sheet.v1 → analyst-to-writer.v1 | `get_use_case`, `get_event` (read-only) |
| [Writer](writer.md) | AGENT-WRITER | LLM | analyst-to-writer.v1 → writer-to-critic.v1 | None |
| [Critic](critic.md) | AGENT-CRITIC | Code + LLM | writer-to-critic.v1 → critic-verdict.v1 | None |
| [Guard](guard.md) | AGENT-GUARD | Code | writer-to-critic.v1 → brief-draft.v1 | `sanitizeHtml` |

## Evaluation agent

| Agent | ID | Job |
|---|---|---|
| [Judge](judge.md) | AGENT-JUDGE | Rubric and pairwise scoring, calibrated against human labels |

## Development agents (Claude Code subagents, Phase 2)

| Agent | ID | Job | Hand-off |
|---|---|---|---|
| [Spec author](spec-author.md) | AGENT-SPEC-AUTHOR | Idea → CR → spec edits passing G1 | CR + spec diff |
| [Implementer](implementer.md) | AGENT-IMPLEMENTER | One 🔄 task → code + tests | `spec/handoffs/<TASK>.md` |
| [Test writer](test-writer.md) | AGENT-TEST-WRITER | Tests from EARS criteria | Test list in the hand-off |
| [Reviewer](reviewer.md) | AGENT-REVIEWER | Diff vs criteria and constitution; no edits to code | Verdict in the hand-off |
| [Eval analyst](eval-analyst.md) | AGENT-EVAL-ANALYST | Run evals, explain score changes | Report summary |

## Rules
- File name = ID without `AGENT-`, lower case (`AGENT-SPEC-AUTHOR` → `spec-author.md`).
- Bump the version on any change to Tools, Model, Inputs, Outputs or Guardrails, and update every file whose header
  cites the agent; lint rejects a header with an old version.
