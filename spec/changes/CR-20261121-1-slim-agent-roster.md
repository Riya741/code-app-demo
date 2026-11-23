# Change Request: Slim agent roster (Analyst, Writer, Spec author only)

- **ID:** CR-20261121-1
- **Author / date:** Project owner (decision), drafted with Claude Code · 2026-11-21
- **Type:** Behaviour change (AI pipeline and development workflow; nothing was released)
- **Specs affected:** specs/022-ai-account-brief, specs/023-ai-evaluation, specs/024-agent-ops, specs/026-dev-agents;
  `spec/agents/`, `spec/contracts/`, ADR-0008 (amendment note), steering glossary and AI data policy, workflow
- **Constitution articles affected:** none amended (v1.1.1 stays); compliance re-checked for I, X and XII
- **Status:** Approved 2026-11-21 by the project owner · branch `phase-3-ai-pipeline`

## 1. Problem
Too many tokens are spent per agent. Each Claude Code subagent (implementer, test-writer, reviewer, eval-analyst)
starts cold and re-reads the task context that the main session already holds, and the runtime pipeline has two
LLM agents beyond the two that write the brief (Critic, plus the eval Judge). The owner's decision, in the owner's
words: *"Keep only analyst, writer and spec-author and its related contracts. Remove all other agents."* and
*"don't run the full test suite every time"*.

Owner answers to the clarifying questions (2026-11-21):
- **Which agents:** the runtime Analyst and Writer and the development Spec author.
- **Deterministic steps:** Retriever, Guard and the orchestrator stay as plain code (they make no model calls), without
  agent specs. Only the token-using agents go entirely.
- **Tests:** the Stop hook and the workflow run only the tests related to the changed files; the full `npm test` runs at
  task close (gate G4).

## 2. Proposed behaviour
**Agents.** `spec/agents/` keeps AGENT-ANALYST, AGENT-WRITER and AGENT-SPEC-AUTHOR. AGENT-ORCHESTRATOR,
AGENT-RETRIEVER, AGENT-CRITIC, AGENT-GUARD, AGENT-JUDGE, AGENT-IMPLEMENTER, AGENT-TEST-WRITER, AGENT-REVIEWER and
AGENT-EVAL-ANALYST are retired: their files are deleted and they are listed in the README's *Retired agents* table, so
historical hand-offs that name them stay valid. `.claude/agents/` keeps only `spec-author.md`.

**Pipeline.** retrieve → analyse → write → guard, a straight line with no branch. The Critic and its revision loop are
removed. Verification (Article XII.5, AIB-CITE-003) is done by the Guard's deterministic citation checks: if they fail,
the run ends `unverified` and the draft carries the failed checks as `issues`. Retriever, Guard and the orchestrator
are code steps: their trace spans carry the step name and no agent spec ID.

**Contracts.** Kept: `fact-sheet.v1` (code:retriever → Analyst), `analyst-to-writer.v1` (Analyst → Writer),
`brief-draft.v1` (code:guard → ui). `writer-to-critic.v1` is renamed `writer-draft.v1` (Writer → code:guard); same
shape, new name, safe because no producer exists yet (AIB-T03 not started). `critic-verdict.v1` is deleted.
`task-handoff.v1` stays because every delivered task needs a hand-off file (CLAUDE.md). Its endpoints become
`session` → `human`, and `agent` / `reviewer` also accept `session`. That widens the accepted values, so every
existing hand-off still validates. A contract endpoint may be an agent ID, `code:<step>`, `session`, `human` or `ui`.

**Development workflow.** `/task-implement` runs in the main session: it plans, builds, runs the related tests and the
gates, writes the hand-off with `agent: session`, then reviews the diff against the criteria and records the verdict
(`reviewer: session`, or `human` when the owner reviews). `/eval-run` runs in the main session. `/spec-change` keeps the
spec-author subagent.

**Tests.** The Stop hook runs `vitest related` on the changed `.ts`/`.tsx` files, not the whole suite. This is what
DEVA-GATE-002 already says ("the affected tests"), so the hook was a defect. The full suite runs at task close.

**Evaluation.** Without the Judge, quality is scored by the deterministic graders (EVAL-CODE-001..006) only; the
calibration requirements are retired and the experiment compares models and prompt versions only.

## 3. Spec impact
| File | IDs | Change |
|---|---|---|
| agents/ | 9 agent specs | delete; README roster and *Retired agents* table |
| contracts/ | critic-verdict.v1, writer-to-critic.v1 → writer-draft.v1, fact-sheet.v1, brief-draft.v1, task-handoff.v1 | delete, rename, endpoints |
| specs/022-ai-account-brief/requirements.md | AIB-GEN-016, AIB-HUMAN-002 → AIB-GEN-021, AIB-HUMAN-012 | retire and replace (no critic revision) |
| specs/022-ai-account-brief/tasks.md | AIB-T03, AIB-T04, AIB-T07, AIB-T09, AIB-T10 | re-scope (no Critic; Guard checks citations) |
| specs/023-ai-evaluation/requirements.md | EVAL-JUDGE-001..005, EVAL-CAL-001..004, EVAL-WHY-003 | retire |
| specs/023-ai-evaluation/requirements.md | EVAL-EXP-001, -004, -005, EVAL-GATE-001 → EVAL-EXP-006..008, EVAL-GATE-005 | retire and replace |
| specs/023-ai-evaluation/tasks.md | EVAL-T03, EVAL-T05 (retired); EVAL-T06, EVAL-T07, EVAL-T08, EVAL-T10 | removed (IDs not reused); re-scoped |
| specs/024-agent-ops/requirements.md | AOPS-ORCH-001, AOPS-FAIL-003, AOPS-OBS-001, -003, -004 → AOPS-ORCH-006, AOPS-FAIL-008, AOPS-OBS-007..009 | retire and replace |
| specs/024-agent-ops/tasks.md | AOPS-T11 (new); AOPS-T04, AOPS-T07, AOPS-T08 | new task; re-scope |
| specs/026-dev-agents/requirements.md | DEVA-SUB-001, -002, DEVA-HAND-001, DEVA-SPEC-003, DEVA-CI-001 → DEVA-SUB-003, DEVA-HAND-004, DEVA-SPEC-004, -005 | retire and replace |
| specs/026-dev-agents/tasks.md | DEVA-T16, DEVA-T17 (new); DEVA-T12, DEVA-T15 (retired) | new tasks; removed (IDs not reused) |
| specs/*/design.md (022, 023, 024, 026) | — | design notes and Constitution check |
| adr/0008-orchestration-pattern.md | — | amendment note: critic loop removed (its own reversal trigger) |
| steering/glossary.md, steering/ai-data-policy.md, workflow.md, gates/validation-gates.md | — | wording |

## 4. Risks and rollout
- No workbook, API or UI change; nothing was released. AIB-T01/T02 and AOPS-T01/T02 code is adjusted in AOPS-T11.
- Losing the critic loop may lower draft quality. The Guard's citation checks still mark weak drafts `unverified`, and
  the eval (EVAL-EXP-006) measures quality per model.
- Losing the Judge removes LLM-as-judge scoring and its human calibration from 023. This matters for the L2 evaluation
  evidence (`l2-competency/03-llm-evaluation.md`), which this CR does not edit.
- Self-review in the main session is weaker than an independent reviewer. The owner reviews before merging.

## 5. Review
- [x] requirements.md approved by: project owner, 2026-11-21
- [x] design.md approved by: project owner, 2026-11-21
- [x] tasks.md approved by: project owner, 2026-11-21
- [x] Implementation verified on: 2026-11-21 (DEVA-T16, DEVA-T17, AOPS-T11; G1, G3, G4 pass)
