# L2 AI Competency — Case Study Plan: `code-app-demo`

**Candidate role:** Developer · **Case study:** Code App Demo (customer-success workspace: Vite + React + TypeScript,
Excel-workbook data store, full SDD spec set) · **Plan created:** 2026-11-16

The rubric scores 5 topics from 0 to 30 each (150 in total). You must demonstrate at least 3 topics and score at
least 70 / 150 to pass. **This plan aims for all 5 topics at Distinction (25–30)**, which gives a large margin over
the 70-point pass mark.

| # | Topic | What earns top marks (25–30) | Plan |
|---|---|---|---|
| 1 | Spec-Driven Development | Spec discipline governs agent behaviour and hand-offs, not just a single file | [01-spec-driven-development.md](01-spec-driven-development.md) |
| 2 | AI-Powered Development | Advanced Claude Code / Copilot (agent modes, CLI, skills) delivering working software | [02-ai-powered-development.md](02-ai-powered-development.md) |
| 3 | LLM Evaluation & Interpretability | Objective evaluation (LLM-as-judge, scored comparisons); data-grounded decisions | [03-llm-evaluation.md](03-llm-evaluation.md) |
| 4 | Agent Design, Orchestration & Ops | Multi-agent / multi-step orchestration with failure handling, recovery, observability | [04-agent-orchestration-ops.md](04-agent-orchestration-ops.md) |
| 5 | AI Tool Integration & Extensibility | Extended agents via MCP servers, hooks, or custom skills/tools — secure and reusable | [05-tool-integration-extensibility.md](05-tool-integration-extensibility.md) |
| — | Submission pack | Evidence map, demo script, self-assessment | [06-submission-evidence.md](06-submission-evidence.md) |

---

## 1. What the repo has (updated 2026-11-24, `main` `e3793a4`)

The evidence for each line is indexed in [evidence/README.md](evidence/README.md). Start-versus-now counts are in
[evidence/before-after.md](evidence/before-after.md).

| Asset | Where | State |
|---|---|---|
| Constitution v1.1.2, 12 articles, incl. **Article XII (AI agents and data)**; 8 change requests, all owner-approved | [spec/constitution.md](../spec/constitution.md), [spec/changes/](../spec/changes/) | ✅ Strong |
| Steering docs (product, tech, structure, glossary, constitution mapping, **AI data policy**) | [spec/steering/](../spec/steering/) | ✅ Strong |
| 26 specs, **529 EARS requirements (450 ✅)**, **244 tasks (174 done)**; specs 022–026 cover the AI brief, evals, agent ops, MCP and dev agents | [spec/specs/](../spec/specs/), [spec/README.md](../spec/README.md) | ✅ Strong · 025 MCP 17/17 · 022 AI brief 32/36 |
| 4 agent specs (Analyst, Writer, Spec author, Eval judge; 9 retired by CR-20261121-1), 6 versioned hand-off contracts, **45 task hand-offs** with gate results and review verdicts | [spec/agents/](../spec/agents/README.md), [spec/contracts/](../spec/contracts/README.md), [spec/handoffs/](../spec/handoffs/README.md) | ✅ Enforced at runtime (contracts validated at every step) and by lint |
| 9 ADRs (0007 model choice *Proposed*, decided by EVAL-T07, which is deferred; 0008 orchestration; 0009 gateway route) | [spec/adr/](../spec/adr/) | ✅ |
| Gates G1–G7, gap register, traceability | [spec/gates/](../spec/gates/), [spec/traceability.md](../spec/traceability.md) | ✅ G1, G3, G4, G5, G6 (CI) and G7 (eval smoke) active · **0 open High gaps** (7 at the start) |
| Spec lint (G1): 13 checks, **0 errors** (26 specs / 580 requirement headings / 244 tasks / 4 agents / 6 contracts / 3 prompts / 45 hand-offs) | [spec/scripts/spec_lint.py](../spec/scripts/spec_lint.py) | ✅ |
| Working app: search, use cases, events, bulk add, export, rich text, summary dialog with **AI Account Brief** | [src/](../src/), [server/](../server/) | ✅ Runs on fictional data |
| **AI pipeline:** retrieve → analyse → write → guard; contracts at every hand-off; read-only tools with an allow-list; traces; direct or Perficient-gateway route | [server/ai/](../server/ai/), [evidence/ops/trace-sample.md](evidence/ops/trace-sample.md) | ✅ Core done · resilience, checkpoints, breaker and Run Inspector deferred (CR-20261123-2) |
| **Eval harness:** 32 cases, 6 deterministic graders, `eval:smoke` with gate G7 (passed 2026-11-24, $0.35) | [evals/](../evals/README.md), [evidence/eval/](evidence/eval/smoke-2026-11-24.md) | ✅ Smoke and gate · judge, κ, experiment and ADR-0007 deferred |
| **`workbook-mcp` MCP server:** 10 read tools (data tools shared with the runtime agents) + 1 opt-in write tool, 2 resources, 1 prompt; allow-list, validation, no shell, redaction, audit | [mcp/workbook-mcp/](../mcp/workbook-mcp/src/), [.mcp.json](../.mcp.json), [evidence/mcp-workbook-server.md](evidence/mcp-workbook-server.md) | ✅ 59 tests; used from MCP Inspector and Claude Code |
| CI on GitHub Actions (spec lint, lint, typecheck, tests) | [.github/workflows/ci.yml](../.github/workflows/ci.yml) | ✅ G6 · headless `claude -p` review not done |
| **474 tests** (unit, component, integration, MCP) + 18 hook tests; every title names its requirement | [tests/](../tests/) | ✅ |
| `.claude/`: 1 subagent (spec author), 5 skills, 5 hooks (tested), settings deny-list; `CLAUDE.md` | [.claude/](../.claude/README.md), [CLAUDE.md](../CLAUDE.md) | ✅ Delivered every task since Phase 2 |
| Git on GitHub (private), task-ID commits, one branch per task merged into `main` | `Riya741/code-app-demo` | ✅ `main` is ahead of `origin` until the final push |

### Honest current-score estimate (2026-11-24)
These are estimates against the rubric, not an assessment. The self-assessment
([06 §4](06-submission-evidence.md#4-self-assessment-template)) sets the final numbers.

| Topic | Today | Why | Target |
|---|---|---|---|
| 1 Spec-Driven Development | **27–29** (Distinction) | Specs govern agents, prompts, contracts and hand-offs, and lint enforces it (13 checks). 45 reviewed hand-offs. Every scope change went through an approved CR, including the deferrals. There is a live [traceability walkthrough](evidence/traceability-walkthrough.md) | 27–30 |
| 2 AI-Powered Development | **22–25** (Advanced) | Working software delivered task by task through skills and hooks: all 7 High gaps closed, the AI brief, the MCP server, and CI. A [dev log](evidence/ai-dev-log.md) records fix-ups honestly. Not done: headless `claude -p` review in CI, recorded plan-mode or worktree sessions, a Copilot comparison | 26–29 |
| 3 LLM Evaluation & Interpretability | **11–15** (Developing) | Dataset, deterministic graders and gate G7 work, and one prompt change was measured with real data (CR-20261124-1). Not done (deferred): the LLM judge, κ calibration, the model comparison and the ADR-0007 decision, which the top band asks for | 25–28 |
| 4 Agent Design, Orchestration & Ops | **12–16** (Developing) | A multi-step pipeline with contract validation, an allow-listed tool loop, an unverified state instead of silent fixes, full traces with cost and route, and a second model route. Not done (deferred): retries, checkpoints and resume, budgets and breaker, Run Inspector, chaos run | 25–28 |
| 5 AI Tool Integration & Extensibility | **23–26** (Advanced–Distinction) | A secure, tested MCP server reusing the runtime tools; hooks and skills that enforced the workflow live; [security evidence](evidence/security/security-evidence.md) maps every control to a hostile test. Not done: skill trigger evals (deferred), the `sdd-toolkit` plugin | 26–29 |
| **Total** | **≈ 95–111 / 150** | **Above the 70 pass mark with a margin, all 5 topics demonstrated.** The fastest route to more marks is the deferred Topic 3 and Topic 4 work (judge and experiment, resilience and Run Inspector) | **≈ 130 / 150** |

---

## 2. The unifying idea: one feature, five lenses

Rather than five unrelated demos, add **one AI capability** to the app and build it in a way that exercises every topic:

> **AI Account Brief.** In the Executive Summary panel, a *Draft with AI* button runs a multi-agent pipeline over the
> customer's use cases and events. It produces a cited, sanitised draft summary that the user reviews in the existing
> rich-text editor and then saves. This also closes the open High gap **SUM-EDIT-001** (persist the summary).

```
                      ┌──────────── Topic 1: specs 022–026, agent specs, hand-off contracts, Article XII ────────────┐
                      │                                                                                             │
 Developer ─▶ Claude Code (Topic 2: CLAUDE.md, subagents, skills, plan mode, worktrees, headless CI review)          │
                      │        ▲ hooks + skills + MCP (Topic 5: spec-guard hooks, sdd-toolkit plugin, workbook MCP)  │
                      ▼        │                                                                                     │
               App: "Draft with AI" ──▶ Orchestrator (Topic 4) ──▶ Retriever → Analyst → Writer → Guard              │
                                               │  contracts at every hand-off · traces (built) · retries, breaker,   │
                                               │  checkpoints, budgets (deferred)                                    │
                                               ▼                                                                     │
                                  Eval harness (Topic 3): golden set, code graders, G7 smoke gate (built);           │
                                  eval-only judge, calibration, model comparison → ADR-0007 (deferred) ──────────────┘
```

> **Changed since the plan:** CR-20261121-1 removed the Critic (Writer ⇄ Critic loop) to cut tokens. The Guard's
> deterministic citation check marks a draft *unverified* instead. CR-20261121-2 made the LLM judge eval-only.
> CR-20261123-2 deferred the hardening and research tasks. The sections below still describe the original plan where
> they mention those parts.

The same tool functions (search customer, list use cases, list events, get requirement) are written once in
`server/ai/tools.ts` and exposed two ways: to the runtime agents through the Anthropic SDK, and to Claude Code
through the MCP server. That shared code is the "reusable" evidence for Topic 5.

---

## 3. Roadmap

No submission deadline was given, so the plan is sized as roughly 4 weeks of part-time work. Compress or stretch the
phases to fit your date. Phases are ordered by dependency, and every phase ends with something demonstrable.

| Phase | When (suggested) | Deliverables | Topics |
|---|---|---|---|
| **0 · Foundations** | Week 1, days 1–2 | `git init` + `.gitignore` (SEC-T02); localhost bind (SEC-T01); `typecheck` script (QA-T05); Vitest (QA-T01); anonymised **fixture workbook** for tests/evals (DATA-T09); `CLAUDE.md` | 2, 1 |
| **1 · Specify the AI work** | Week 1 | CR-20261117-1 + **Constitution Article XII (AI agents & data)** v1.1.0; specs **022–026**; agent specs + hand-off JSON schemas; spec-lint extension (G1+) | 1 |
| **2 · Agentic dev setup** | Week 1–2 | `.claude/` subagents, project skills, hooks (spec-guard, lint-on-edit, gate-on-stop); settings with permission deny-list; first tasks closed by the agent workflow (UCF-T07/T08, EVF-T06, SUM-T07..T10) | 2, 5, 1 |
| **3 · Build the agent pipeline** | Week 2 | `server/ai/` orchestrator + 4 roles + deterministic guard; failure handling; checkpoints/resume; traces + Run Inspector; fault-injection tests | 4 |
| **4 · Evaluate** | Week 3 | `evals/` dataset (≥ 30 cases), code graders, LLM judge, human calibration (κ), experiment matrix (3 models × 2 prompts × critic on/off), report, **ADR-0007**, gate **G7** | 3 |
| **5 · Extend & automate** | Week 3–4 | `mcp/workbook-mcp` server; `plugins/sdd-toolkit` packaging hooks + skills + agents; GitHub Actions running G1/G3/G4/G7 + headless `claude -p` spec-compliance review | 5, 2 |
| **6 · Evidence & submit** | Week 4 | Evidence pack, 10–12 min demo video, self-assessment, regenerated spec tree | All |

### Critical path
`SEC-T02 git` → `QA-T01 Vitest` + `fixture workbook` → `spec 022–026` → `SUM-T07 persist summary` → `AI pipeline` →
`eval harness` → `ADR-0007` → `CI gates` → `submission`.

---

## 4. Decisions

| # | Decision | Status (2026-11-17) | Why it matters |
|---|---|---|---|
| D1 | **Which Claude API access?** | ✅ **Anthropic API key**, plus since CR-20261123-1 (ADR-0009) the **Perficient Portkey gateway** to Claude on AWS Bedrock. One `server/ai/client.ts` factory picks the route; every live run so far used the gateway. | The runtime pipeline (Phase 3) and the evals (Phase 4) need API access. Claude Code itself is enough for Topics 1, 2 and 5. |
| D2 | **Can real customer data go to an LLM?** | ✅ **No real data at all.** The workbook is fictional ([ADR-0006](../spec/adr/0006-fictional-demo-dataset.md)), so the pipeline and evals use it freely. Article XII must still say this explicitly. | Constitution Article III.3 says internal customer data must not leave the machine. Resolving that conflict on purpose is evidence for Topic 1. |
| D3 | **Include a Copilot comparison?** | ⬜ Open, optional stretch: one task done with Claude Code and with Copilot agent mode, both scored by the spec-compliance judge (Topic 3, §3B). | The rubric names "Claude Code / Copilot", and a scored comparison feeds Topics 2 and 3 at once. |
| D4 | **Hosting for CI** | ✅ GitHub, **private** repo, GitHub Actions. | Needed for G6 and the headless `claude -p` review job. |

---

## 5. Folder map (this folder)

```
l2-competency/
├─ README.md                          this file: assessment, roadmap, decisions
├─ 01-spec-driven-development.md      Topic 1 plan
├─ 02-ai-powered-development.md       Topic 2 plan
├─ 03-llm-evaluation.md               Topic 3 plan
├─ 04-agent-orchestration-ops.md      Topic 4 plan
├─ 05-tool-integration-extensibility.md Topic 5 plan
├─ 06-submission-evidence.md          evidence map, demo script, self-assessment template
└─ evidence/                          evidence pack (index: evidence/README.md)
```

## 6. Progress tracker

Tick as you go; each line maps to a section in the topic files.

- [x] Phase 0 — git, `.gitignore`, localhost bind, typecheck, Vitest, fixture workbook, `CLAUDE.md` (2026-11-16, merged into `main` 2026-11-17; see [evidence/ai-dev-log.md](evidence/ai-dev-log.md))
- [x] Phase 1 — CR + Article XII, specs 022–026, agent specs, hand-off schemas, lint extension (2026-11-17, branch `phase-1-specify-ai`; DEVA-T01..T04)
- [x] Phase 2 — subagents, skills, hooks, settings; High gaps closed via the agent workflow (2026-11-18, branch `phase-2-agentic-dev`; 19 tasks closed, including UCF-T07, EVF-T06, SUM-T09 and SUM-T10 after the owner's G5 check; 4 High gaps closed)
- [x] Phase 3 — AI pipeline (2026-11-21..24, merged into `main`): retrieve → analyse → write → guard, contracts,
  tools, traces, gateway route, the AI brief in the summary dialog (owner G5 2026-11-24). Failure handling,
  checkpoints, Run Inspector and chaos tests deferred by CR-20261123-2
- [x] Phase 4 — eval dataset (32 cases), 6 code graders, harness, G7 (2026-11-23; smoke passed 2026-11-24). Judge
  calibration, experiment matrix and ADR-0007 deferred by CR-20261123-2
- [x] Phase 5 — CI on GitHub Actions (QA-T07) and the `workbook-mcp` MCP server (MCP-T01..T06, 2026-11-24). Not done:
  `sdd-toolkit` plugin (optional), headless Claude review in CI
- [ ] Phase 6 — High gaps closed (API-T08, UCP-T08, 2026-11-24) ✅ · evidence pack ✅ (2026-11-24) · demo video and screenshots ✅ (2026-11-25) ·
  self-assessment · final checks and push
