# Design — Development Agents

## Overview
Three layers keep development agents inside the spec:

1. **Specified:** an agent spec per role in [spec/agents/](../../agents/README.md), and versioned hand-off contracts in
   [spec/contracts/](../../contracts/README.md).
2. **Checked:** spec lint (G1) checks 10–13 tie agent specs, prompt headers, hand-off files and contracts together.
3. **Enforced while working:** Claude Code hooks block out-of-workflow edits and feed gate results back to the agent;
   skills encode the workflow steps; the one subagent (spec author) gets only the tools its spec lists.

**Slim roster (CR-20261121-1).** Every subagent starts cold and re-reads context the main session already holds, so
only the spec author stays a subagent. Implementing, testing, reviewing and evals run in the main session
(DEVA-SUB-003); the Stop hook runs only the tests related to the changed files, and the full suite runs at task close
(DEVA-GATE-002).

Layers 1 and 2 are built in this change (DEVA-T01..T04). Layer 3 is Phase 2.

```
/task-implement UCF-T07
  └─ set task 🔄 ─► plan ─► build + related tests (main session) ─► gates ─► review against criteria (main session)
                            │ writes spec/handoffs/UCF-T07.md (task-handoff.v1, agent: session)  │ verdict into hand-off
                            └──────────── hooks: spec_guard · data_guard · post_edit_check · gates_on_stop
/task-close UCF-T07 ─► statuses, gap register, dashboard, traceability, spec tree ─► G1
```

## Components and files
| File | Role | Phase |
|---|---|---|
| `spec/templates/agent.md`, `spec/agents/*.md` | Agent template and specs | 1 ✅ |
| `spec/contracts/*.schema.json`, `spec/contracts/README.md` | Hand-off contracts | 1 ✅ |
| `spec/templates/handoff.md`, `spec/handoffs/README.md` | Hand-off template and folder | 1 ✅ |
| `spec/scripts/spec_lint.py` | Checks 10–13 | 1 ✅ |
| `.claude/agents/spec-author.md` | The one subagent, linked to its agent spec (CR-20261121-1) | 2 |
| `.claude/hooks/*.py`, `.claude/settings.json` | Hooks and permission deny-list | 2 |
| `.claude/skills/*/SKILL.md` | Workflow skills | 2 |
| `tests/hooks/test_*.py` | Hook tests | 2 |
| `.github/workflows/review.yml` | Headless review | 5 |

## Interfaces

**Agent spec metadata** (checked by lint check 10):
```markdown
# Agent: Writer
- **ID:** AGENT-WRITER
- **Version:** 1.0.0
- **Kind:** runtime            # runtime | evaluation | development
- **Spec:** [022-ai-account-brief](../specs/022-ai-account-brief/)
## Purpose · ## Inputs · ## Outputs · ## Tools · ## Model · ## Guardrails · ## Done when · ## Failure · ## Requirements · ## Implementation
```

**Prompt / subagent header** (check 11), within the first 20 lines, after any front matter:
```markdown
<!-- agent-spec: AGENT-WRITER@1.0.0 · requirements: AIB-CITE-002, AIB-FMT-001 -->
```

**Hand-off front matter** (check 12; contract `task-handoff.v1`):
```yaml
---
contract: task-handoff.v1
task: UCF-T07
agent: session
covers: [UCF-EDIT-002]
files_changed: [src/components/customers/UseCaseForm.tsx, src/hooks/useUseCases.ts]
tests: [tests/unit/useCaseForm.test.ts]
gates: {G1: pass, G3: pass, G4: pass}
verdict: pending
reviewer: session        # or human
---
```

**Contract metadata** (check 13): `"x-contract": { "name": "writer-draft", "version": 1, "from": "AGENT-WRITER", "to": "code:guard" }`.
An endpoint is an agent ID, `code:<step>`, `session`, `human` or `ui` (DEVA-SPEC-004). Retired agents are listed in
`spec/agents/README.md`; hand-offs may name them, contracts and headers may not (DEVA-SPEC-005).

**Tool limits.** A Claude Code subagent's `tools` field restricts tool *names* only. Finer limits in the agent specs
are enforced as follows: code edits need a 🔄 task (spec-guard hook, all agents); secrets and workbooks are
protected (data-guard hook, all agents); path limits such as "spec-author edits only `spec/**`" and command limits
on Bash are instructions in the subagent file, visible in the CR's file list and checked when the owner reviews. Hooks apply to subagents as well as the main session.

**Loading.** Claude Code reads `.claude/settings.json` hooks and `.claude/agents/` at session start; after changing
them, restart the session (or review them in `/hooks`) before relying on them.

## Data and state
No app data. Hand-off files are committed with the task's code. Lint keeps a map task → Covers IDs to check hand-offs.

## Flows
Lint order: checks 1–9 (existing) → 10 agent specs (collect IDs, versions, requirements, contracts) → 13 contracts
(need agent IDs) → 11 prompt headers (need agent versions and requirements) → 12 hand-offs (need tasks and agents).

## Error handling
Each check reports `file:line: message` like checks 1–9 and makes G1 exit 1. Checks 11 and 12 pass when their
folders do not exist yet, so the gate stays green until Phase 2 adds files.

## Testing approach
Lint checks verified with probe files (a broken agent spec, a prompt with version drift, a hand-off covering an ID
outside its task, a contract with a wrong `$id`), each rejected and then removed; the result is recorded in DEVA-T03.
Hook tests (DEVA-GUARD-004) in Phase 2.

## Alternatives considered
- **Agent specs as YAML:** easier to parse, but the rest of the spec set is Markdown that people read; lint parses
  the few metadata lines instead.
- **Generate `.claude/agents/*.md` fully from specs:** attractive, but subagent files need tool lists and prose in
  Claude Code's format; linking by header and checking with lint keeps both readable.

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Hooks enforce "no code without a task"; lint enforces spec ↔ prompt links. ✅ |
| II Workbook is truth | Data guard blocks agent writes to workbooks. ✅ |
| III Safe by default | Deny-list and data guard protect secrets. ✅ |
| IV Valid by construction | Hand-offs validated against task-handoff.v1. ✅ |
| V Clear feedback | Block messages say which rule and what to do. ✅ |
| VI Theme & responsive | n/a (no UI). ✅ |
| VII Accessible | n/a (no UI). ✅ |
| VIII Simple & local-first | Python standard library only for lint and hooks. ✅ |
| IX Layered architecture | n/a (tooling). ✅ |
| X Testable & traceable | Hand-offs make each agent task auditable; hooks tested. ✅ |
| XI Performance budget | Post-edit checks run on the edited file only. ✅ |
| XII AI agents & data | This spec puts XII.1 and XII.2 into practice for development agents. ✅ |

**Exceptions:** none.
