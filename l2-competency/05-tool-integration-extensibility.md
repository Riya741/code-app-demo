# Topic 5 — AI Tool Integration & Extensibility (max 30)

**Top marks (25–30):** *Extended agents via MCP servers, hooks, or custom skills/tools — secure and reusable.*

**Status 2026-11-24: estimate 23–26. Target: 26–29.** Evidence:
[security/security-evidence.md](evidence/security/security-evidence.md),
[mcp-workbook-server.md](evidence/mcp-workbook-server.md), [mcp/workbook-mcp/](../mcp/workbook-mcp/src/),
[spec 025](../spec/specs/025-mcp-tooling/requirements.md) (17/17 ✅).

## 1. Where you stand

The `sdd-spectree` Claude Code skill generated [spectree/](../spectree/), which shows skill *use*. But the skill lives
outside the repo, and the project has no MCP server, hooks or skills of its own. The rubric says "MCP servers,
hooks, **or** custom skills/tools". Doing **all three**, sharing code between them, with security designed in, is
what lifts this into the top band.

---

## 2. Workstreams

### 5.1 Hooks that enforce the spec  *(Phase 2)*

Configure in `.claude/settings.json`. Scripts go in `.claude/hooks/` as Python (the repo already uses Python for
tooling; run with `python -I`). Each hook is small, unit-tested and fails safe.

| Hook | Event / matcher | Behaviour | Spec |
|---|---|---|---|
| `spec_guard.py` | `PreToolUse` · `Edit\|Write` | Blocks edits under `src/`, `server/`, `scripts/` unless some task in `spec/specs/*/tasks.md` is 🔄 In progress. The block message names the rule and the command to start a task. | DEVA-GUARD-001, Art. I |
| `data_guard.py` | `PreToolUse` · `Read\|Edit\|Write\|Bash` | Blocks access to `../data/*.xlsx`, `.env*`, `~/.claude/.credentials.json`, and Bash commands that touch them; allows the fixture workbook | DEVA-GUARD-002, Art. II, III |
| `post_edit_check.py` | `PostToolUse` · `Edit\|Write` | `spec/**` changed → run `spec_lint.py`; `*.ts(x)` changed → `eslint <file>`. Returns findings to the agent so it fixes them in the same turn. | DEVA-GATE-001 |
| `gates_on_stop.py` | `Stop` | Runs G1 + typecheck + affected tests; if a gate fails, tells the agent to continue instead of stopping. | DEVA-GATE-002 |
| `session_context.py` | `SessionStart` | Injects the current 🔄 task, its `Covers:` IDs and the count of open High gaps. | DEVA-CTX-001 |

Plus a **permission deny-list** in the same settings file: `Read(../data/**)`, `Read(**/.env*)`, `Bash(git push --force*)`,
`Bash(rm -rf*)`, `WebFetch` off by default.

Test the hooks: `tests/hooks/test_spec_guard.py` feeds sample hook JSON on stdin and checks allow/block decisions.
Record one demo where the hook blocks an out-of-spec edit and the agent then follows the workflow.

### 5.2 Custom skills  *(Phase 2)*

`.claude/skills/<name>/SKILL.md`, plus any helper scripts the skill needs. These encode the
[spec workflow](../spec/workflow.md) so it is repeatable by any developer or agent.

| Skill | Inputs | Steps it encodes | Output |
|---|---|---|---|
| `spec-change` | idea text | CR from template → requirement blocks with next free IDs → design + constitution check → tasks → G1 | CR + spec diff |
| `task-implement` | task ID | set 🔄 → plan → `implementer` subagent → `test-writer` → gates → `reviewer` → hand-off file | code + `spec/handoffs/<TASK>.md` |
| `task-close` | task ID | status updates, gap register, README dashboard, traceability, spectree regeneration, G1 | consistent spec set |
| `gap-report` | — | parse gap register → rank by severity and dependency | prioritised list |
| `eval-run` | `smoke` / `full` | run evals → compare with baseline → summarise score changes | report link |

Write each `SKILL.md` description so the skill triggers reliably, and test that with the `skill-creator` skill's eval
loop (a small trigger eval doubles as Topic 3 evidence).

### 5.3 MCP server: `workbook-mcp`  *(built 2026-11-24, MCP-T01..T06)*

> **As built:**
> - **Data tools:** `search_customers`, `get_customer_facts`, `list_use_cases` and `list_events`, plus `get_use_case`
>   and `get_event` for a full note by ID. The record tools are the runtime agents' `server/ai/tools.ts` definitions,
>   run through `runTool`; `get_customer_facts` is the Retriever's `retrieve`.
> - **Spec tools:** `get_requirement`, `list_open_gaps`, `trace_requirement` and `run_spec_lint`.
> - **Write tool:** `propose_change_request`, registered only when `MCP_ALLOW_WRITE=1`.
> - **Also:** 2 resources and the `draft-account-brief` prompt. Resource reads and prompt requests are audited too.
>
> **Two differences from the table below:**
> - The audit line has no "caller" field, because stdio has one client per process.
> - The evidence is an MCP Inspector CLI transcript and a Claude Code session, not a screenshot.

A TypeScript MCP server (`mcp/workbook-mcp/`, `@modelcontextprotocol/sdk`, stdio transport) registered in a
project-scoped `.mcp.json`. It gives Claude Code (and any MCP client, e.g. Copilot agent mode) **safe, structured**
access to the project's data and specs, instead of letting agents open the xlsx or grep raw files.

| Tool | Kind | Returns |
|---|---|---|
| `search_customers(query, limit≤20)` | read | id, name, counts (reuses the app's ranking `score`) |
| `get_customer_facts(customer_id)` | read | fact sheet (same as Retriever step), redacted |
| `list_use_cases(customer_id, filters)` / `list_events(…)` | read | paged rows |
| `get_requirement(id)` | read | requirement block + design/tasks links |
| `list_open_gaps(severity?)` | read | gap-register rows |
| `trace_requirement(id)` | read | requirement → tasks → source files → tests → eval metrics |
| `run_spec_lint()` | exec (fixed argv, no shell) | lint result |
| `propose_change_request(title, problem, behaviour)` | write (spec/changes only) | new CR file path; requires `MCP_ALLOW_WRITE=1` |

Resources: `spec://constitution`, `spec://specs/{nnn}/requirements`. Prompt: `draft-account-brief`.

**Reuse:** the read tools are thin wrappers over `server/ai/tools.ts`, the same functions the runtime Analyst agent
calls. One implementation, two consumers, one set of tests.

**Security design** (spec `025-mcp-tooling`, MCP-SEC-*):

| Control | How |
|---|---|
| Least privilege | Read-only by default; the single write tool is off unless `MCP_ALLOW_WRITE=1`, and writes only under `spec/changes/` |
| Input validation | zod schemas on every tool; length limits; IDs must match patterns; paged results with a hard cap |
| Path safety | Resolve real paths against an allow-list (`spec/`, fixture or configured workbook); reject `..` and symlinks out |
| No shell | `run_spec_lint` uses `execFile` with fixed argv; no user input reaches a command line |
| Data minimisation | Redaction per `steering/ai-data-policy.md`; emails masked; no full notes unless asked for by ID |
| Prompt-injection hygiene | Free text returned inside clearly delimited fields, with a note that it is data |
| Secrets | None needed. Workbook path via env; nothing secret in `.mcp.json` |
| Audit | Every call logged (tool, args hash, caller, duration, result size) to `../data/mcp-audit.jsonl` |
| Tests | Unit tests per tool, path-traversal and injection tests, an MCP Inspector session screenshot |

### 5.4 Package for reuse: `sdd-toolkit` plugin  *(Phase 5)*

Bundle the hooks, skills, subagents and an MCP config template as a Claude Code **plugin** (`plugins/sdd-toolkit/`
with a `plugin.json` and a local marketplace entry) so another Perficient repo that uses the same spec layout can
install it in one step. Prove reuse by installing it in a scratch repo, or a second project, and running `/gap-report` there.

Make the plugin configurable (spec dir, code dirs to guard, gate commands) through a small config file rather than
hard-coded paths, since configurability is what makes it reusable.

### 5.5 *(Optional)* bring `sdd-spectree` in-house

Vendor the skill version you use (or reference it from the plugin) so the spec-tree generator is pinned and
reproducible. The [spectree README](../spectree/README.md) already says the generator should change only in the skill.

## Evidence checklist for Topic 5

- [x] `.claude/settings.json` with hooks + deny-list; hook scripts with tests (18 tests now, `npm run test:hooks`)
- [x] Recording: spec-guard blocks an edit; post-edit lint feeds back a fix (2026-11-25, [screenshots and demo video](evidence/sessions/README.md))
- [ ] 5 project skills ✅ with trigger evals (`.claude/skills/trigger-evals.json` written; the eval run is deferred, DEVA-T14)
- [x] `mcp/workbook-mcp` with 59 tests, `.mcp.json`, MCP Inspector transcript and Claude Code session, audit log sample ([evidence](evidence/mcp-workbook-server.md))
- [x] Security table above, each control linked to a test ([security evidence §2](evidence/security/security-evidence.md#2-workbook-mcp-59-tests-pass-mapped-to-each-control))
- [x] Shared `server/ai/tools.ts` used by both the MCP server and the runtime agent (MCP-SRV-004; a test checks the same schema objects and identical results)
- [ ] `sdd-toolkit` plugin installed and working in a second repo
