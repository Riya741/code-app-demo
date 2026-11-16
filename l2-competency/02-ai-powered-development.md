# Topic 2 — AI-Powered Development (max 30)

**Top marks (25–30):** *Advanced Claude Code / Copilot (agent modes, CLI, skills) delivering working software.*

**Today: 8–12 (Developing). Target: 26–29.**

## 1. Where you stand

The specs were reverse-engineered from code with AI help, and the spec tree came from the `sdd-spectree` Claude
Code skill. But an assessor cannot see any of that: there is no git history, no `CLAUDE.md`, no `.claude/` folder and
no tests. Topic 2 is mostly about **making advanced use visible and making it ship working software**.

The rubric rewards three things: *advanced features* (agent modes, CLI, skills), used in a *repeatable workflow*,
that *delivers working software*. Plan for all three.

---

## 2. Workstreams

### 2.1 Foundations that make AI work verifiable  *(Phase 0)*

| Task | Spec ID | Why it matters for Topic 2 |
|---|---|---|
| `git init`, `.gitignore` (exclude `*.xlsx`, `dist/`, `node_modules/`, `.env*`, `ai-runs/`) | SEC-T02 | Commits tagged with task IDs (`UCF-T07: …`) are the timeline of agent-delivered work |
| Bind the dev server to localhost | SEC-T01 | Quick first win; closes a High gap |
| `npm run typecheck` (`tsc --noEmit` for app and server) | QA-T05 | Agents need fast, objective feedback |
| Vitest + Testing Library; first tests named by requirement ID | QA-T01, QA-T02 | Turns "it works" into proof; activates G4 |
| Server integration harness on a **fixture workbook** | QA-T03, DATA-T09 | Safe data for agents, tests and evals |

### 2.2 `CLAUDE.md`: the project's operating manual for agents  *(Phase 0)*

Keep it short and point to the specs rather than copying them. Suggested sections:

1. **What this is** (2 lines) and the commands: `npm run dev | lint | typecheck | test`, `py spec/scripts/spec_lint.py`, `npm run eval:smoke`.
2. **The rule:** follow [spec/workflow.md](../spec/workflow.md). No code change without a task set to 🔄; commit messages start with the task ID.
3. **Architecture rules** that agents most often break: Article IX layering (component → hook → lib → API), soft delete, atomic writes, sanitise HTML.
4. **Definition of done:** gates G1, G3, G4 (and G7 for AI changes) pass; hand-off file written; statuses updated.
5. **Never:** read or write `../data/*.xlsx` directly, commit secrets, edit `spectree/` generator files, or weaken a test to make it pass.

### 2.3 Subagents  *(Phase 2)*

`.claude/agents/`, one per development agent spec in `spec/agents/` (Topic 1). Give each one the fewest tools it needs.

| Subagent | Tools | Job | Hand-off out |
|---|---|---|---|
| `spec-author` | Read, Grep, Glob, Edit (only `spec/**`) | Change request → requirements → design → tasks; runs G1 | CR + spec diff |
| `implementer` | Read, Edit, Write, Bash (npm, py lint) | Implements **one** task; writes tests named by requirement ID | `spec/handoffs/<TASK>.md` |
| `test-writer` | Read, Edit (only `**/*.test.*`, `tests/**`), Bash (npm test) | Adds missing tests for `Covers:` IDs | test list |
| `reviewer` | Read, Grep, Bash (gates only), no Edit | Checks the diff against criteria, constitution and layering; returns pass/fail with findings | review verdict |
| `eval-analyst` | Read, Bash (`npm run eval*`) | Runs evals and explains score changes | eval summary |

### 2.4 Project skills (slash commands)  *(Phase 2)*

`.claude/skills/<name>/SKILL.md`; detailed design in [Topic 5](05-tool-integration-extensibility.md).

| Skill | What it automates |
|---|---|
| `/spec-change <idea>` | Fill the CR template, add requirement blocks with new IDs, design + constitution check, tasks; run G1 |
| `/task-implement <TASK-ID>` | Set task 🔄 → plan mode → `implementer` → `test-writer` → gates → `reviewer` → hand-off file |
| `/task-close <TASK-ID>` | Task ✅ `[x]`, requirements ✅, gap-register row closed, Summary line, README dashboard, traceability, spectree regenerated |
| `/gap-report` | Ranked open gaps with suggested next tasks (reads the gap register) |
| `/eval-run [smoke\|full]` | Run the eval suite and compare with the baseline |

### 2.5 Advanced Claude Code features to use on purpose (and record)

| Feature | Where to use it in this project | Evidence to capture |
|---|---|---|
| **Plan mode** | Before every task with more than one file (e.g. SUM-T07..T10) | Screenshot of plan → approval → result |
| **Subagents, in parallel** | `implementer` + `test-writer` on one task; `reviewer` after | Session log |
| **Git worktrees** | Two independent tasks in parallel (e.g. EVF-T06 and UCF-T07) in separate worktrees, merged after review | Branch graph |
| **Hooks** | spec-guard, lint-on-edit, gates-on-stop (Topic 5) | Hook blocking an out-of-spec edit |
| **MCP** | `workbook-mcp` server for safe data/spec queries (Topic 5) | Tool call in a session |
| **Headless CLI** (`claude -p`) | CI job: spec-compliance review of each PR against the tasks it names; output posted as a PR comment | Actions log + PR comment |
| **`/code-review`, `/security-review`** | Before merging each AI-pipeline PR | Findings and fixes |
| **Workflows / multi-agent runs** | One larger batch, e.g. closing all the A11Y gaps, run as an orchestrated workflow with a verify step | Workflow summary |
| **Copilot agent mode** *(optional, D3)* | Same task done by Copilot for the scored comparison in Topic 3 §3B | Comparison table |

### 2.6 Deliver working software: the task list  *(Phases 2–5)*

Use the agent workflow (§2.4) on real gaps. Prioritise the High gaps; they are visible user value.

| Order | Tasks | Closes | Notes |
|---|---|---|---|
| 1 | SEC-T01, SEC-T02 | SEC-EXPO-001, SEC-SUPPLY-001 | Day 1 |
| 2 | QA-T05, QA-T01, QA-T02, QA-T03 | QA-TEST-001..003, QA-TEST-005 | Activates G3 and G4 |
| 3 | UCF-T07, UCF-T08, UCF-T10 | UCF-EDIT-002, UCF-EDIT-004 (High) | Save use case edits |
| 4 | EVF-T06, EVF-T09 | EVF-EDIT-002 (High) | Save event edits |
| 5 | API-T09/SUM-T07, SUM-T08, SUM-T09, SUM-T10, SUM-T11 | SUM-EDIT-001 (High), SUM-EDIT-005/006 | **Required by the AI Brief** |
| 6 | API-T08, API-T11 | API-WRITE-008 (High) | Server reference validation |
| 7 | PERF-T03, UCP-T08, EVP-T07 | DT-TIME-003 (High) | Date off-by-one west of UTC |
| 8 | Specs 022–025 tasks | AI Account Brief, ops, MCP | Topics 3–5 |
| 9 | QA-T07 (CI), SEC-T03/T04 | QA-GATE-003, SEC-SUPPLY-003/004 | CI + dependency hygiene |

**Target:** all 7 High gaps closed and ≥ 30 tasks moved to ✅, each with a commit, a hand-off file and tests.

### 2.7 Measure it

Keep `l2-competency/evidence/ai-dev-log.md` with one row per task:

| Task | Feature(s) used | Agent time | Human fix-ups | Tests added | Gates | Commit |
|---|---|---|---|---|---|---|

At the end, summarise: tasks closed, gaps closed, tests written, how often reviewer or hooks caught a defect, and your
honest view of where the agent needed help. Assessors value candour about limits.

## Evidence checklist for Topic 2

- [ ] Git history with task-ID commits; PRs if using GitHub
- [ ] `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json`
- [ ] ≥ 3 recorded sessions: plan mode, parallel subagents, worktrees
- [ ] Headless `claude -p` review running in CI
- [ ] 7 High gaps closed; app demo of the working features
- [ ] `ai-dev-log.md` with metrics
- [ ] *(Optional)* Claude Code vs Copilot scored comparison
