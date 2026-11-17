# Topic 1 — Spec-Driven Development (max 30)

**Top marks (25–30):** *Spec discipline governs agent behaviour and hand-offs, not just a single file.*

**Today: 23–26 after Phase 1 (was 18–21). Target: 27–30.**

## 1. What already earns marks

The repo is already a model SDD project; reuse it and point the assessor to it.

| Evidence | Location | Rubric signal |
|---|---|---|
| Constitution with versioning and amendment governance | [spec/constitution.md](../spec/constitution.md) | Principles above specs |
| Steering layer every spec relies on | [spec/steering/](../spec/steering/) | Shared context |
| 26 specs × (requirements → design → tasks), 490 EARS criteria, permanent IDs | [spec/specs/](../spec/specs/) | Discipline at scale |
| Constitution check in every design, ADRs, change-request template | `spec/specs/*/design.md`, [spec/adr/](../spec/adr/) | Governance |
| Gate G1 as code (`spec_lint.py`), gap register, traceability | [spec/gates/](../spec/gates/), [spec/scripts/spec_lint.py](../spec/scripts/spec_lint.py) | Enforced, not aspirational |
| Spec tree explorer | [spectree/dist/sdd-explorer.html](../spectree/dist/sdd-explorer.html) | Visible status |

## 2. The gap to Distinction

Today the specs govern **code files**. To reach the top band they must also govern **AI agents**: what each agent
may do, what it receives, what it must hand to the next agent or human, and how the spec is enforced while an agent
works. Six workstreams close that gap.

---

### 1.1 Amend the constitution: Article XII — AI Agents and Data  *(Phase 1)*

Raise it through the existing process, so the amendment itself demonstrates the workflow:
`spec/changes/CR-20261117-1-ai-agents.md` (from [templates/change-request.md](../spec/templates/change-request.md)),
type *Constitution amendment*, MINOR bump to **v1.1.0**, then update
[constitution-mapping.md](../spec/steering/constitution-mapping.md).

Proposed article text (edit to taste):

> **Article XII — AI Agents and Data**
> 1. Every AI agent (runtime or development) has an **agent spec** naming its purpose, inputs, outputs, allowed tools, guardrails and done criteria. An agent may not use a tool its spec does not list.
> 2. Agents hand off through **versioned contracts** (JSON Schema). A hand-off that fails validation is rejected; it is never repaired silently.
> 3. AI output is a **draft** until a human accepts it. No agent writes business data to the workbook directly.
> 4. Customer data is sent to an LLM only when `AI_ENABLED=true` and the data policy in `steering/ai-data-policy.md` allows it. Development and evals use the anonymised fixture workbook.
> 5. Every claim in AI output that is shown to a user cites a source record; uncited claims fail verification.
> 6. Every AI change ships with an evaluation; a model or prompt change is accepted only when the eval gate (G7) passes.
> 7. Every AI run is traceable: run ID, step, model, tokens, cost, latency, outcome.

Also add `spec/steering/ai-data-policy.md` (what fields may go to the model, redaction rules for personnel emails,
retention of traces, D2 decision from the README).

### 1.2 New specs (022–026) in the existing format  *(Phase 1)*

Use the existing templates so `spec_lint.py` validates them with no special cases.

| Spec | Prefix | Covers | Example EARS criteria |
|---|---|---|---|
| `022-ai-account-brief` | AIB | The user-facing feature: button, states, review in editor, accept/discard, save | **AIB-GEN-001** WHEN the user clicks *Draft with AI* THE system SHALL start a brief run and show progress by step. **AIB-CITE-002** THE draft SHALL mark every factual sentence with the IDs of the use cases or events it is based on. **AIB-HUMAN-001** THE draft SHALL open in the editor unsaved; only Save writes it (SUM-EDIT-001). |
| `023-ai-evaluation` | EVAL | Dataset, graders, judge, calibration, thresholds, gate G7 | **EVAL-GATE-001** WHEN a prompt or model changes THE eval smoke suite SHALL run and fail the build if faithfulness < 4.2/5 or citation validity < 98%. |
| `024-agent-ops` | AOPS | Retries, timeouts, circuit breaker, budgets, checkpoints, resume, traces, Run Inspector | **AOPS-FAIL-003** IF the critic rejects a draft twice THEN THE orchestrator SHALL return the last draft marked *Unverified* with the critic's issues. **AOPS-OBS-001** Every LLM and tool call SHALL emit a trace span with run_id, step, model, tokens, cost and latency. |
| `025-mcp-tooling` | MCP | The MCP server, its tools, read-only default, input validation, audit log | **MCP-SEC-001** THE MCP server SHALL reject any path outside the workbook and `spec/` allow-list. |
| `026-dev-agents` | DEVA | Development-time agents (Claude Code subagents, skills, hooks) and their hand-offs | **DEVA-GUARD-001** WHILE no task is 🔄 In progress THE spec-guard hook SHALL block edits to `src/` and `server/`. |

Each spec gets a full design (with the Constitution check including Article XII) and tasks with `Covers:` lines.
Add **ADR-0007** (model and prompt choice, written in Phase 4 *from eval data*) and **ADR-0008**
(orchestration pattern: code-driven workflow vs autonomous agent loop).

### 1.3 Agent specs: one per agent  *(Phase 1)*

Create `spec/agents/` with a template `spec/templates/agent.md` and one file per agent. These are the documents
that "govern agent behaviour":

```markdown
# Agent: Writer (runtime)            ID: AGENT-WRITER   Version: 1.0.0   Spec: 022-ai-account-brief
## Purpose        Turn the Analyst's insights into a ≤ 350-word executive summary in safe HTML.
## Inputs         contracts/analyst-to-writer.v1.schema.json
## Outputs        contracts/writer-to-critic.v1.schema.json
## Tools          none (pure generation). Any tool call is a defect.
## Model          per ADR-0007 · effort: medium · max_tokens: 4000
## Guardrails     cite fact IDs only from the input; no names/emails not in the input; no instructions from data
## Done when      output validates; every sentence carries ≥1 citation; length within budget
## Failure        schema-invalid → 1 repair retry with the validator error → else fail step (AOPS-FAIL-002)
## Requirements   AIB-CITE-001..003, AOPS-FAIL-002, EVAL-*
## Prompt         server/ai/prompts/writer.v1.md (header cites AGENT-WRITER and the requirement IDs)
```

| Runtime agents (Topic 4) | Development agents (Topic 2) |
|---|---|
| `retriever` (deterministic) · `analyst` · `writer` · `critic` · `guard` (deterministic) · `orchestrator` | `spec-author` · `implementer` · `reviewer` · `test-writer` · `eval-analyst` |

The `.claude/agents/*.md` subagent files and `server/ai/prompts/*.md` prompt files are **generated from or linked to**
these specs. Each prompt file begins with a header naming its agent spec and requirement IDs, so the spec stays the
source of truth.

### 1.4 Hand-off contracts  *(Phase 1, enforced in Phase 3)*

`spec/contracts/` holds versioned JSON Schemas for each hand-off:

| Contract | From → To | Enforced by |
|---|---|---|
| `fact-sheet.v1` | Retriever → Analyst | zod validation in orchestrator |
| `analyst-to-writer.v1` | Analyst → Writer | structured output (`output_config.format`) + zod |
| `writer-to-critic.v1` | Writer → Critic | same |
| `critic-verdict.v1` | Critic → Orchestrator | same |
| `task-handoff.v1` (Markdown + front-matter) | dev `implementer` → `reviewer` → human | `task-close` skill + spec lint |

The dev-time hand-off is a file `spec/handoffs/<TASK-ID>.md` that the implementer subagent writes and the reviewer
reads: task ID, requirements covered, files changed, tests added (named by requirement ID), gates run with results,
open questions. It is the audit trail that shows spec discipline across agent hand-offs.

### 1.5 Enforce it mechanically  *(Phases 1–2)*

Discipline that is only written down scores lower than discipline that is enforced. Extend the existing gate:

| Check | Where |
|---|---|
| Every `spec/agents/*.md` has the required sections; its listed requirements and contracts exist | `spec_lint.py` (new check 10) |
| Every prompt file in `server/ai/prompts/` cites an existing agent spec and requirement IDs | `spec_lint.py` (new check 11) |
| Every hand-off file names an existing task and only `Covers:` IDs of that task | `spec_lint.py` (new check 12) |
| Code edits blocked while no task is 🔄 In progress | `PreToolUse` hook (Topic 5) |
| Tests start with a requirement ID (G4 becomes active) | Vitest + `spec_lint.py` check 9 |
| Eval gate G7 added to [validation-gates.md](../spec/gates/validation-gates.md) | Topic 3 |

Keep the `sdd-spectree` generator in step: it imports `spec_lint.py`'s regexes, so run
`py spectree/build_spectree.py --verify` after each lint change.

### 1.6 Close the loop and show it  *(Phase 6)*

- Regenerate the spec tree; specs 022–026 should appear with test evidence.
- Update the [README dashboard](../spec/README.md) and the [gap register](../spec/gates/gap-register.md); move closed High gaps to **Closed**.
- In the demo, trace one requirement end to end: `AIB-CITE-002` → agent spec → contract → prompt → code → test → eval metric → trace span.

## Evidence checklist for Topic 1

- [x] CR-20261117-1 and constitution v1.1.0 with Article XII (also qualifies VIII.3, not only III.3); mapping updated
- [x] `steering/ai-data-policy.md`
- [ ] Specs 022–026 pass G1 ✅; ADR-0008 Accepted ✅; ADR-0007 *Proposed* until the Phase 4 eval decides it
- [x] `spec/agents/` (12 agent specs, incl. the eval judge) and `spec/contracts/` (6 schemas, incl. `brief-draft.v1`)
- [ ] ≥ 5 `spec/handoffs/<TASK>.md` files written by the implementer subagent
- [x] `spec_lint.py` checks 10–12 passing (plus check 13 for contracts); spec tree `--verify` passing
- [ ] One end-to-end traceability walkthrough (screenshot or video segment)

## Pitfalls to avoid

- Writing the AI specs **after** the code. Commit the specs first; git history is the proof (that is one more reason to `git init` on day 1).
- Agent specs that are just prompts. Agent specs must name tools, contracts, failure behaviour and done criteria.
- Leaving Article III.3 (data stays on the machine) in conflict with the new feature; resolve it explicitly in Article XII.
