# `.claude/` — how agents work in this repo

Claude Code configuration that enforces the [spec workflow](../spec/workflow.md) while agents work
(spec [026-dev-agents](../spec/specs/026-dev-agents/requirements.md), Constitution Article XII).
**Restart Claude Code (or review in `/hooks`) after changing anything here**: hooks and subagents load at session start.

## Hooks (`settings.json` → `hooks/`, Python standard library, run as `py -I`)
| Hook | When | Does | Requirement | On hook error |
|---|---|---|---|---|
| `session_context.py` | SessionStart | Tells the agent the 🔄 tasks and open High gaps | DEVA-CTX-001 | silent |
| `spec_guard.py` | Before Edit/Write | Blocks edits to `src/`, `server/`, `scripts/`, `mcp/`, `evals/` unless a task is 🔄 | DEVA-GUARD-001 | allows (fail open) |
| `data_guard.py` | Before file tools and shell | Blocks `.env*` and credential files, and writes to workbooks | DEVA-GUARD-002 | **blocks (fail closed)** |
| `post_edit_check.py` | After Edit/Write | Spec lint for spec/prompt files, ESLint for TS/JS; failures go back to the agent | DEVA-GATE-001 | allows |
| `gates_on_stop.py` | Stop | G1, typecheck and only the tests related to changed files (`vitest related`); failing gates keep the agent working (once) | DEVA-GATE-002 | allows |

Tests: `npm run test:hooks` (DEVA-GUARD-004). Permission deny-list in `settings.json`: `.env*` reads/edits, force
push, `rm -rf`, web fetch (DEVA-GUARD-003). Personal overrides go in `settings.local.json` (git-ignored).

## Subagents (`agents/`), each implementing a spec in [spec/agents/](../spec/agents/README.md)
Only `spec-author` (CR-20261121-1, DEVA-SUB-003): building, testing, reviewing and evals run in the main session,
which already holds the task context. The file starts with `<!-- agent-spec: AGENT-X@<version> · requirements: … -->`;
spec lint check 11 fails on version drift.

## Skills (`skills/`)
| Skill | Use |
|---|---|
| `/spec-change <idea>` | CR + requirements + design + tasks, before code |
| `/task-implement <TASK-ID>` | 🔄 → build with related tests → gates → hand-off → review, all in the main session |
| `/task-close <TASK-ID>` | ✅, requirement statuses, gap register, dashboard (`spec/scripts/dashboard.py`), traceability, spec tree |
| `/gap-report [High]` | Ranked open gaps with the next task to start |
| `/eval-run [smoke\|full]` | Eval suite and G7 thresholds (from Phase 4) |

Trigger-eval prompts for each skill: `skills/trigger-evals.json` (DEVA-SKILL-002, run in DEVA-T14).
