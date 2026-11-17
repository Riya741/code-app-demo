# Change Request: AI agents, the AI Account Brief and the specs that govern them

- **ID:** CR-20261117-1
- **Author / date:** Project owner, drafted with Claude Code · 2026-11-17
- **Type:** Constitution amendment + New feature
- **Specs affected:** new specs/022-ai-account-brief, specs/023-ai-evaluation, specs/024-agent-ops,
  specs/025-mcp-tooling, specs/026-dev-agents; changed specs/003-executive-summary, specs/019-security,
  specs/021-quality (Constitution check rows only)
- **Constitution articles affected:** new Article XII; Article III.3 and Article VIII.3 are qualified by Article XII.4
  and XII.8 (wording of III and VIII unchanged)
- **Status:** Specified 2026-11-17 on branch `phase-1-specify-ai`; approval is the owner's review before merge ·
  constitution v1.0.0 → **v1.1.0** (MINOR: article added)

## 1. Problem
The project is about to gain AI in two places:

1. **At runtime:** a *Draft with AI* button that asks a pipeline of LLM agents to draft the customer's executive
   summary from its use cases and events (the "AI Account Brief").
2. **During development:** Claude Code subagents, skills, hooks and an MCP server that write and review the code.

The constitution says nothing about either. Specifically:

- Nothing says what an agent may do, which tools it may use, or what it must hand to the next agent or human.
  Agents would be governed only by prompts, which are not reviewed like specs.
- Article III.3 says customer data must not leave the user's machine. Sending workbook text to a model provider
  breaks that rule unless it is resolved on purpose.
- Article VIII.3 says the app needs no external services apart from the font CDN. A model provider is one.
- Article X asks for testable criteria, but LLM output is not deterministic. A plain unit test cannot prove
  "the summary is faithful".

## 2. Proposed behaviour
Add **Article XII — AI Agents and Data** (full text in [constitution.md](../constitution.md#article-xii--ai-agents-and-data)):

| Clause | Rule | Resolves |
|---|---|---|
| XII.1 | Every agent (runtime, evaluation or development) has an **agent spec** in `spec/agents/`; it may use only the tools its spec lists | Agents governed by prompts only |
| XII.2 | Agents hand off through **versioned JSON Schema contracts** in `spec/contracts/`; an invalid hand-off is rejected, never repaired silently | Silent drift between agents |
| XII.3 | AI output is a **draft** until a human accepts it; no agent writes business data | Article II (workbook is truth) |
| XII.4 | Data goes to a model only when `AI_ENABLED=true` and [ai-data-policy.md](../steering/ai-data-policy.md) allows it | Article III.3 conflict |
| XII.5 | Every factual claim shown to a user **cites a source record** | Hallucination risk |
| XII.6 | Every AI change ships with an **evaluation**; prompt or model changes pass gate **G7** | Article X for non-deterministic output |
| XII.7 | Every AI run is **traceable** (run ID, step, model, tokens, cost, latency, outcome) | Operability |
| XII.8 | AI features are **optional**: with AI off, the app runs exactly as under Article VIII.3 | Article VIII.3 conflict |

Add five specs, all 📝 Planned except the spec-lint checks built in this change:

| Spec | Prefix | Covers |
|---|---|---|
| 022-ai-account-brief | AIB | The user-facing feature: button, progress, citations, review in the editor, save via SUM-EDIT-001 |
| 023-ai-evaluation | EVAL | Dataset, code graders, LLM judge, judge calibration, experiments, gate G7 |
| 024-agent-ops | AOPS | Orchestration, failure handling, budgets, checkpoints and resume, traces, Run Inspector |
| 025-mcp-tooling | MCP | The `workbook-mcp` server: tools, least privilege, input validation, audit |
| 026-dev-agents | DEVA | Development agents: agent specs, hand-offs, hooks, skills, subagents, headless review |

Add the governing artefacts:

- `spec/templates/agent.md` and **12 agent specs** in [spec/agents/](../agents/README.md) (6 runtime, 1 evaluation, 5 development).
- **6 hand-off contracts** in [spec/contracts/](../contracts/README.md) (5 runtime JSON Schemas, 1 development hand-off).
- `spec/templates/handoff.md` and the [spec/handoffs/](../handoffs/README.md) folder for task hand-off files.
- [ADR-0007](../adr/0007-model-and-prompt-choice.md) (model and prompt choice, *Proposed*: decided from eval data in Phase 4) and
  [ADR-0008](../adr/0008-orchestration-pattern.md) (code-driven workflow with agentic steps, *Accepted*).
- Gate **G1** extended with checks 10–13 (agent specs, prompt headers, hand-off files, contracts); gate **G7** added as planned.

## 3. Spec impact
| File | IDs | Change |
|---|---|---|
| constitution.md | — | add Article XII; version 1.1.0; amendment log |
| steering/ai-data-policy.md | — | new: what data may reach a model, redaction, retention |
| steering/constitution-mapping.md | — | column XII; rows 022–026; Article XII enforcement row; re-check note |
| steering/product.md, tech.md, structure.md, glossary.md | — | AI scope, planned stack and config, new folders, terms |
| specs/022…026 (new) | AIB, EVAL, AOPS, MCP, DEVA | add requirements, design, tasks |
| specs/003, 019, 021 design.md | — | Constitution check gains an Article XII row |
| specs/017-design-system/messages-catalog.md | — | planned AI Brief messages |
| templates/design.md | — | Constitution check gains Article XII |
| templates/agent.md, templates/handoff.md | — | new |
| gates/validation-gates.md | — | G1 checks 10–13; G7 planned |
| scripts/spec_lint.py | — | checks 10–13 |
| workflow.md, README.md, traceability.md | — | agent work, dashboard, trace rows |

## 4. Risks and rollout
- **No runtime change in this CR.** It adds specs, governing documents and lint checks only. Code follows in Phase 2
  (development agents) and Phase 3 (pipeline), each through its own tasks.
- **Data:** the workbook is fictional (ADR-0006), so XII.4 allows sending it to the model. Real customer data stays
  out until authentication and a data processing agreement are specified (policy §5).
- **Lint:** checks 10–13 pass on the new files and are vacuous where files do not exist yet (prompts, hand-offs).
  The spec tree imports the lint module, so `build_spectree.py --verify` must still pass.
- **Rollback:** revert the commits; no data or schema change.

## 5. Review
- [ ] requirements.md approved by: (project owner, at merge review)
- [ ] design.md approved by: (project owner, at merge review)
- [ ] tasks.md approved by: (project owner, at merge review)
- [ ] Implementation verified on: per task, Phases 2–5
