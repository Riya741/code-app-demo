# Validation gates

Checks that keep the specs and the code in step. A task may only be marked ✅ Done when every gate that applies to
it passes. Gates marked *planned* become mandatory when their task is done.

| Gate | Check | How | Runs | State |
|---|---|---|---|---|
| G1 | Spec format and integrity | `py spec/scripts/spec_lint.py` | Before review, before commit | ✅ Active |
| G2 | Constitution check | Reviewer reads the design's Constitution check table | Design review | ✅ Active (manual) |
| G3 | Lint and types | `npm run lint` · `npm run typecheck` | Before commit | ✅ Active |
| G4 | Tests cite requirements | `npm test` · tests named `PREFIX-AREA-NNN …` | Before commit | ✅ Active: unit tests (component, integration, E2E planned QA-T02..T04) |
| G5 | Manual verification | Criterion checked in light + dark, ≥ 1024px + < 1024px, note in the task | Before ✅ Done | ✅ Active (manual) |
| G6 | CI | G1, G3, G4 on every push | On push | 📝 Planned (QA-T07) |
| G7 | AI evaluation | `npm run eval:smoke` before merging a prompt or model change (exit 1 on a breached threshold); `npm run eval:grade -- <dir>` re-grades recorded outputs without a model; CI on PRs touching `server/ai/**` or `evals/**` | Before AI merges · on PR (planned) | ✅ Active (manual run, EVAL-T08); CI part 📝 Planned (EVAL-T09) |

## G1 — Spec lint
`spec/scripts/spec_lint.py` fails when:
- a spec folder is not `NNN-slug` or misses `requirements.md`, `design.md` or `tasks.md`;
- a requirement heading is malformed, an ID is duplicated, or a block lacks exactly one Status or a Criterion;
- a requirement or task ID mentioned anywhere in `spec/` does not exist;
- a task has no Status/Covers line, its checkbox disagrees with its status, or the Summary line is wrong;
- a nested checkbox would be counted as a task;
- a Source path or a relative link does not exist;
- a test cites an unknown requirement ID, or a JS/TS test title does not start with a requirement ID (QA-TRACE-001);
- **(10)** an agent spec in `spec/agents/` lacks its metadata or a required section, its ID does not match its file
  name, it cites no requirement, or it names a contract that does not exist (DEVA-SPEC-001);
- **(11)** a prompt or subagent file (`server/ai/prompts/`, `.claude/agents/`) lacks the
  `agent-spec: AGENT-X@<version> · requirements: …` header, cites an old agent version, or cites a requirement its
  agent spec does not list (DEVA-SPEC-002);
- **(12)** a hand-off file in `spec/handoffs/` is not named after an existing task, or its front matter breaks
  [task-handoff.v1](../contracts/task-handoff.v1.schema.json) or covers an ID outside the task, or its `agent` /
  `reviewer` is not an agent ID (active or retired), `session` or (reviewer only) `human` (DEVA-HAND-002, DEVA-HAND-004);
- **(13)** a contract in `spec/contracts/` is not valid JSON, its `$id`/`x-contract` disagree with its file name, or
  an endpoint is not an active agent, `code:<step>`, `session`, `human` or `ui`, or a requirement does not exist
  (DEVA-SPEC-004); a retired agent (listed in `spec/agents/README.md`) appears in a contract or header (DEVA-SPEC-005).

The sdd-spectree page imports the same regexes, so `--verify` proves the page counts what G1 counts.

## G2 — Constitution check
Every `design.md` ends with a table: one row per article, ✅ complies or ⚠️ exception with the reason and the task
that removes it. Exceptions are listed in [constitution-mapping](../steering/constitution-mapping.md).

## G3 — Lint and types
ESLint must pass with no errors, and `npm run typecheck` (`tsc --noEmit` for the app and for server + Vite config) must pass.

## G4 — Tests cite requirements
Each test name starts with the requirement ID it proves (`SRCH-RANK-003 ranks exact name first`). The spec tree
counts a requirement as *tested* when any test cites it.

## G5 — Manual verification
Until G4 covers a criterion, the task records who checked it, when, and how (themes, breakpoints, keyboard).

## G6 — Continuous integration
Runs G1, G3 and G4 on every push once QA-T07 adds the pipeline (the repository is under git since SEC-T02).

## G7 — AI evaluation
Active since EVAL-T08 (2026-11-23) as a manual run: `npm run eval:smoke` runs one case per category through the live pipeline, grades it with
the code graders (`evals/graders/code/`) and fails on any breached threshold; `npm run eval:grade -- <results dir>` re-grades recorded
results without a model. On the gateway route a live run needs `AI_GATEWAY_ALLOW_BULK=1` (AOPS-ROUTE-008). Specified with [023-ai-evaluation](../specs/023-ai-evaluation/requirements.md) (Constitution Article XII.6). Thresholds live in
`evals/thresholds.json`: citation validity ≥ 98%, no hallucinated entity, zero cases following an injected instruction,
and the other deterministic grader thresholds (EVAL-GATE-005; no LLM judge since CR-20261121-1). On every PR that changes `server/ai/**` or `evals/**`, CI runs the code graders on recorded outputs
without calling the model (EVAL-GATE-002); the live `npm run eval:smoke` run is required before merging a prompt or
model change. Lowering a threshold needs a change request that cites a report (EVAL-GATE-003).
