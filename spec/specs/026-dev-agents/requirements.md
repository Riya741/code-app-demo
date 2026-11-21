# Requirements — Development Agents

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| 026-dev-agents | DEVA | ⚠️ Lint, hooks, the spec-author subagent and skills built and used; trigger evals planned (CR-20261117-1, CR-20261121-1) | I, III, X, XII |

## Introduction
How AI agents that *build* this project are governed: every agent has a spec, hands off through a checked file, and
works under hooks that enforce the [workflow](../../workflow.md). The specs live in [spec/agents/](../../agents/README.md);
Claude Code subagents, skills and hooks under `.claude/` implement them. Spec lint (gate G1) checks that the
agent specs, prompt headers, hand-off files and contracts stay consistent. Since CR-20261121-1 the only subagent is
the spec author: implementing, testing, reviewing and running evals happen in the main session, which already holds
the task context (DEVA-SUB-003).

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### DEVA-R1 — Agents are specified
**User story:** As the owner, I want every agent's job, tools and limits written down and checked, so that agents are
governed by reviewed specs rather than by unreviewed prompts.

#### DEVA-SPEC-001: Agent specs are complete
- **Status:** ✅ Implemented
- **Criterion:** EVERY file in `spec/agents/` (except `README.md`) SHALL have the metadata ID, Version, Kind and Spec and the sections Purpose, Inputs, Outputs, Tools, Model, Guardrails, Done when, Failure, Requirements and Implementation; its ID SHALL match its file name and be unique; its Requirements section SHALL cite existing requirement IDs; and spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`, `spec/templates/agent.md`

#### DEVA-SPEC-002: Prompt and subagent files cite their agent spec
- **Status:** ✅ Implemented
- **Criterion:** EVERY file in `server/ai/prompts/`, `.claude/agents/` and `evals/graders/judge/` (Markdown) SHALL contain, in its first 20 lines, the header `agent-spec: AGENT-<NAME>@<version>` naming an existing agent spec at its current version, and `requirements:` citing IDs listed in that spec; spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`, `.claude/agents/spec-author.md`

#### DEVA-SPEC-003: Contracts are valid and linked
- **Status:** Deprecated — retired by CR-20261121-1: contract endpoints may now be code steps, the session or a person; replaced by DEVA-SPEC-004
- **Criterion:** EVERY `spec/contracts/*.schema.json` SHALL parse as JSON, declare `$schema`, an `$id` ending in its file name, a `title` and an `x-contract` block whose name and version match the file name and whose `from`/`to` agents exist; every contract an agent spec names SHALL exist; and spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`, `spec/contracts/README.md`

#### DEVA-SPEC-004: Contracts are valid and linked (agent, code step or person)
- **Status:** ✅ Implemented
- **Criterion:** EVERY `spec/contracts/*.schema.json` SHALL parse as JSON, declare `$schema`, an `$id` ending in its file name, a `title` and an `x-contract` block whose name and version match the file name and whose `from` and `to` are each an existing agent ID, a pipeline code step written `code:<step>`, `session`, `human` or `ui`; every contract an agent spec names SHALL exist; and spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`, `spec/contracts/README.md`

#### DEVA-SPEC-005: Retired agents
- **Status:** ✅ Implemented
- **Criterion:** WHEN an agent spec is removed THE agent SHALL be listed in the *Retired agents* table of `spec/agents/README.md`; a hand-off file MAY name a retired agent as `agent` or `reviewer`, but a contract endpoint or a prompt or subagent header SHALL NOT; and spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`, `spec/agents/README.md`

### DEVA-R2 — Hand-offs between agents
**User story:** As the reviewer (human or agent), I want each task's hand-off in a fixed shape, so that I can check
what was done against what the task promised.

#### DEVA-HAND-001: Implementer writes a hand-off file
- **Status:** Deprecated — retired by CR-20261121-1: no implementer subagent; replaced by DEVA-HAND-004
- **Criterion:** WHEN the implementer agent finishes a task THE agent SHALL write `spec/handoffs/<TASK-ID>.md` from the hand-off template ([task-handoff.v1](../../contracts/task-handoff.v1.schema.json)): requirements covered, files changed, tests added, gates run with results, open questions.
- **Source:** `spec/templates/handoff.md` (the implementer subagent was deleted by CR-20261121-1)

#### DEVA-HAND-002: Hand-off files are checked
- **Status:** ✅ Implemented
- **Criterion:** EVERY file in `spec/handoffs/` (except `README.md`) SHALL be named after an existing task, have front matter with `contract: task-handoff.v1`, `task` equal to the file name, `covers` listing only IDs from that task's Covers line, a known `agent` and a `verdict` of pending, pass or fail; spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`, `spec/templates/handoff.md`

#### DEVA-HAND-003: Review verdict before Done
- **Status:** ✅ Implemented
- **Criterion:** IF a task with a hand-off file is set to ✅ Done THEN its hand-off SHALL record `verdict: pass` and the reviewer, and spec lint SHALL fail otherwise.
- **Source:** `spec/scripts/spec_lint.py`

#### DEVA-HAND-004: The session writes the hand-off and the verdict
- **Status:** ✅ Implemented
- **Criterion:** WHEN a task is delivered THE main session SHALL write `spec/handoffs/<TASK-ID>.md` from the hand-off template ([task-handoff.v1](../../contracts/task-handoff.v1.schema.json)) with `agent: session`, listing requirements covered, files changed, tests added, gates run with results and open questions, and SHALL record the review verdict with `reviewer: session`, or `reviewer: human` when the owner reviews.
- **Source:** `.claude/skills/task-implement/SKILL.md`, `spec/templates/handoff.md`

### DEVA-R3 — Guards
**User story:** As the owner, I want the workflow enforced while agents work, so that discipline does not depend on
the agent remembering it.

#### DEVA-GUARD-001: No code edits without a task in progress
- **Status:** ✅ Implemented
- **Criterion:** WHILE no task in `spec/specs/*/tasks.md` is 🔄 In progress THE spec-guard hook SHALL block edits to `src/`, `server/`, `scripts/`, `mcp/` and `evals/`, with a message naming the rule and how to start a task.
- **Source:** `.claude/hooks/spec_guard.py`, `.claude/settings.json`

#### DEVA-GUARD-002: Protected files
- **Status:** ✅ Implemented
- **Criterion:** THE data-guard hook SHALL block agent reads and writes of `.env*` files and credential files, writes to any `.xlsx`, and shell commands that touch them.
- **Source:** `.claude/hooks/data_guard.py`, `.claude/settings.json`

#### DEVA-GUARD-003: Permission deny-list
- **Status:** ✅ Implemented
- **Criterion:** THE project `.claude/settings.json` SHALL deny `.env*` reads, `git push --force`, `rm -rf` and web fetches by default.
- **Source:** `.claude/settings.json`

#### DEVA-GUARD-004: Hooks are tested
- **Status:** ✅ Implemented
- **Criterion:** EVERY hook SHALL have tests that feed sample hook input and check the allow or block decision, and SHALL allow the action IF the hook itself fails to run (fail open with a warning), except the data guard, which SHALL fail closed.
- **Source:** `tests/hooks/test_hooks.py`

### DEVA-R4 — Gates inside the loop
**User story:** As a developer, I want the agent to see gate failures while it still has context, so that it fixes them itself.

#### DEVA-GATE-001: Lint after each edit
- **Status:** ✅ Implemented
- **Criterion:** WHEN an agent edits a file under `spec/` THE post-edit hook SHALL run spec lint, and WHEN it edits a `.ts`/`.tsx` file the hook SHALL run ESLint on that file, returning findings to the agent.
- **Source:** `.claude/hooks/post_edit_check.py`

#### DEVA-GATE-002: Gates before stopping
- **Status:** ✅ Implemented
- **Criterion:** WHEN an agent is about to stop THE stop hook SHALL run G1, typecheck and the affected tests, and IF any fails THEN tell the agent to continue with the failures listed.
- **Source:** `.claude/hooks/gates_on_stop.py`
- **Note:** until DEVA-T17 the hook ran the whole test suite; it now runs only the tests related to the changed files (CR-20261121-1). The full suite runs at task close (gate G4).

#### DEVA-CTX-001: Session context
- **Status:** ✅ Implemented
- **Criterion:** WHEN a session starts THE session hook SHALL add the current 🔄 task, its Covers IDs and the number of open High gaps to the agent's context.
- **Source:** `.claude/hooks/session_context.py`

### DEVA-R5 — Subagents and skills
**User story:** As a developer, I want repeatable agent roles and commands for the workflow, so that any developer
or agent follows the same steps.

#### DEVA-SUB-001: Subagents with least privilege
- **Status:** Deprecated — retired by CR-20261121-1: only the spec-author subagent is kept; replaced by DEVA-SUB-003
- **Criterion:** THE project SHALL define the subagents spec-author, implementer, test-writer, reviewer and eval-analyst in `.claude/agents/`, each with only the tools its agent spec lists.
- **Source:** `.claude/agents/spec-author.md` (the implementer, test-writer, reviewer and eval-analyst subagents were deleted by CR-20261121-1)

#### DEVA-SUB-002: Reviewer cannot edit
- **Status:** Deprecated — retired by CR-20261121-1: no reviewer subagent; the session reviews and the owner reviews before merging (DEVA-HAND-004)
- **Criterion:** THE reviewer subagent SHALL have no Edit or Write tool, and its verdict SHALL be pass or fail with findings tied to requirement IDs.
- **Source:** none (the reviewer subagent was deleted by CR-20261121-1)

#### DEVA-SUB-003: Spec author is the only subagent
- **Status:** ✅ Implemented
- **Criterion:** THE project SHALL define only the `spec-author` subagent in `.claude/agents/`, with only the tools its agent spec lists; implementing, testing, reviewing and running evals SHALL happen in the main session without subagents, so the task context is not read again by a cold agent.
- **Source:** `.claude/agents/spec-author.md`, `.claude/skills/task-implement/SKILL.md`, `.claude/skills/eval-run/SKILL.md`

#### DEVA-SKILL-001: Workflow skills
- **Status:** ✅ Implemented
- **Criterion:** THE project SHALL provide the skills `spec-change`, `task-implement`, `task-close`, `gap-report` and `eval-run` in `.claude/skills/`, each encoding its workflow steps and ending with gate G1.
- **Source:** `.claude/skills/task-implement/SKILL.md`, `.claude/skills/task-close/SKILL.md`, `.claude/skills/spec-change/SKILL.md`, `.claude/skills/gap-report/SKILL.md`, `.claude/skills/eval-run/SKILL.md`

#### DEVA-SKILL-002: Skill triggering is evaluated
- **Status:** 📝 Planned
- **Criterion:** EVERY project skill SHALL have a trigger evaluation (prompts that should and should not trigger it) with the results kept in `l2-competency/evidence/`.

### DEVA-R6 — Headless review (retired by CR-20261121-1)
**User story:** As the owner, I want each pull request reviewed against its task by an agent in CI, so that spec
compliance is checked even when I review quickly.

#### DEVA-CI-001: Spec-compliance review in CI
- **Status:** Deprecated — retired by CR-20261121-1: no reviewer agent spec, and a model review on every PR spends tokens; the owner reviews pull requests
- **Criterion:** WHEN a pull request is opened or updated THE CI job SHALL run Claude Code headless (`claude -p`) with the reviewer agent spec, check the diff against the Covers criteria of the tasks named in the commits, and post the verdict as a PR comment.

## Out of scope
- Agents merging pull requests or pushing to `main`.
- Agents working on real customer data (ai-data-policy §5).

## Open questions
- None open.

## Scenarios
- No task is 🔄 → agent tries to edit `src/lib/search.ts` → blocked with "Start a task first (set it to 🔄 in tasks.md)".
- `/task-implement UCF-T07` → the session builds it, runs the related tests and the gates, writes
  `spec/handoffs/UCF-T07.md` (UCF-EDIT-002, files, tests, gates), reviews the diff → `verdict: pass` → task-close marks ✅.
- A prompt file says `agent-spec: AGENT-WRITER@0.9.0` while the spec is 1.0.0 → spec lint fails: version drift.
