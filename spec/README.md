# Code App Demo — Spec-Driven Development

This folder is the source of truth for the Code App Demo. Every change starts here: **requirements → design → tasks
→ code → verify**. The specs were reverse-engineered from the code on 2026-11-11; implemented behaviour is marked ✅
and everything still to do is a task with a status.

## Structure

```
spec/
├─ constitution.md                 non-negotiable principles (Articles I–XII), v1.1.0
├─ workflow.md                     how a change moves: propose → specify → design → plan → build → verify → close
├─ steering/                       shared context every spec relies on
│  ├─ product.md                   purpose, users, scope, principles
│  ├─ tech.md                      stack, commands, configuration, constraints
│  ├─ structure.md                 repo/spec layout, naming, code conventions
│  ├─ glossary.md                  domain terms
│  ├─ constitution-mapping.md      article ↔ spec ↔ requirement matrix, exceptions
│  └─ ai-data-policy.md            what data may reach a model, redaction, retention (Article XII.4)
├─ adr/                            0001 … 0008 architecture decision records
├─ changes/                        change requests (CR-20261117-1: AI agents, Article XII)
├─ agents/                         12 agent specs: 6 runtime, 1 evaluation, 5 development (Article XII.1)
├─ contracts/                      6 versioned JSON Schemas for agent hand-offs (Article XII.2)
├─ handoffs/                       one hand-off file per task delivered by a development agent
├─ specs/NNN-<name>/
│  ├─ requirements.md              user stories + one block per EARS criterion (ID, Status, Criterion, Source)
│  ├─ design.md                    architecture, interfaces, planned changes, constitution check
│  └─ tasks.md                     implementation tasks, each with a status and the requirements it covers
├─ gates/
│  ├─ validation-gates.md          G1 spec lint … G6 CI, G7 AI eval (planned)
│  └─ gap-register.md              every ❌ Gap / ⚠️ Partial requirement and the tasks that close it
├─ scripts/spec_lint.py            gate G1, checks 1–13 (run: py spec/scripts/spec_lint.py)
├─ templates/                      requirements, design, tasks, change-request, adr, agent, handoff
├─ traceability.md                 spec → source files, cross-spec task links
└─ id-migration.md                 old IDs (SRCH-012) → new IDs (SRCH-RANK-003)
```

## Status dashboard (2026-11-17)

Requirements: ✅ Implemented · ⚠️ Partial · ❌ Gap · 📝 Planned. Tasks: ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked.

| Spec | Prefix | Reqs | ✅ | ⚠️ | ❌ | 📝 | Tasks | ✅ | 🔄 | ⬜ | ⛔ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Features** | | | | | | | | | | | |
| [001-customer-search](specs/001-customer-search/) | SRCH | 20 | 19 | 0 | 1 | 0 | 9 | 7 | 0 | 2 | 0 |
| [002-workspace-layout](specs/002-workspace-layout/) | LAY | 17 | 15 | 2 | 0 | 0 | 8 | 6 | 0 | 2 | 0 |
| [003-executive-summary](specs/003-executive-summary/) | SUM | 13 | 10 | 3 | 0 | 0 | 12 | 9 | 2 | 1 | 0 |
| [004-use-cases-panel](specs/004-use-cases-panel/) | UCP | 21 | 20 | 1 | 0 | 0 | 9 | 7 | 0 | 2 | 0 |
| [005-use-case-form](specs/005-use-case-form/) | UCF | 20 | 18 | 1 | 0 | 1 | 10 | 7 | 1 | 2 | 0 |
| [006-use-case-bulk](specs/006-use-case-bulk/) | UCB | 25 | 24 | 1 | 0 | 0 | 11 | 8 | 0 | 3 | 0 |
| [007-events-panel](specs/007-events-panel/) | EVP | 13 | 12 | 1 | 0 | 0 | 9 | 6 | 0 | 3 | 0 |
| [008-event-form](specs/008-event-form/) | EVF | 10 | 7 | 1 | 1 | 1 | 9 | 5 | 1 | 2 | 1 |
| [009-data-grid](specs/009-data-grid/) | GRID | 19 | 18 | 0 | 1 | 0 | 7 | 5 | 0 | 2 | 0 |
| [010-export](specs/010-export/) | EXP | 11 | 9 | 1 | 0 | 1 | 7 | 4 | 0 | 3 | 0 |
| [011-rich-text](specs/011-rich-text/) | RTX | 21 | 20 | 1 | 0 | 0 | 7 | 5 | 0 | 2 | 0 |
| **Data & backend** | | | | | | | | | | | |
| [012-data-model](specs/012-data-model/) | DATA | 19 | 17 | 1 | 1 | 0 | 9 | 7 | 0 | 1 | 1 |
| [013-workbook-storage](specs/013-workbook-storage/) | STO | 18 | 16 | 1 | 0 | 1 | 7 | 5 | 0 | 2 | 0 |
| [014-workbook-api](specs/014-workbook-api/) | API | 22 | 21 | 0 | 1 | 0 | 13 | 9 | 0 | 4 | 0 |
| [015-client-data-layer](specs/015-client-data-layer/) | CDL | 15 | 14 | 1 | 0 | 0 | 7 | 5 | 0 | 1 | 1 |
| [016-data-pipeline](specs/016-data-pipeline/) | PIPE | 28 | 28 | 0 | 0 | 0 | 8 | 5 | 0 | 3 | 0 |
| **Cross-cutting** | | | | | | | | | | | |
| [017-design-system](specs/017-design-system/) | DS | 16 | 14 | 1 | 0 | 1 | 8 | 5 | 0 | 3 | 0 |
| [018-accessibility](specs/018-accessibility/) | A11Y | 15 | 10 | 2 | 3 | 0 | 6 | 1 | 0 | 5 | 0 |
| [019-security](specs/019-security/) | SEC | 9 | 6 | 1 | 1 | 1 | 6 | 3 | 0 | 3 | 0 |
| [020-performance-reliability](specs/020-performance-reliability/) | PERF/REL/COMP/DT | 23 | 16 | 4 | 1 | 2 | 7 | 2 | 0 | 5 | 0 |
| [021-quality](specs/021-quality/) | QA | 15 | 12 | 0 | 0 | 3 | 11 | 6 | 0 | 5 | 0 |
| **AI & agents** (CR-20261117-1) | | | | | | | | | | | |
| [022-ai-account-brief](specs/022-ai-account-brief/) | AIB | 25 | 0 | 0 | 0 | 25 | 9 | 0 | 0 | 7 | 2 |
| [023-ai-evaluation](specs/023-ai-evaluation/) | EVAL | 32 | 0 | 0 | 0 | 32 | 10 | 0 | 0 | 9 | 1 |
| [024-agent-ops](specs/024-agent-ops/) | AOPS | 27 | 0 | 0 | 0 | 27 | 10 | 0 | 0 | 10 | 0 |
| [025-mcp-tooling](specs/025-mcp-tooling/) | MCP | 17 | 0 | 0 | 0 | 17 | 6 | 0 | 0 | 5 | 1 |
| [026-dev-agents](specs/026-dev-agents/) | DEVA | 18 | 16 | 0 | 0 | 2 | 15 | 12 | 0 | 2 | 1 |
| **Total** | | **489** | **342** | **23** | **10** | **114** | **230** | **129** | **4** | **89** | **8** |

## Suggested next tasks (highest value first)
Done in Phase 0 (2026-11-16): SEC-T02 git, SEC-T01 localhost, QA-T05 typecheck, QA-T01 unit tests, SRCH-T07/T09,
EXP-T07, PIPE-T07 demo data generator, DATA-T09 test fixture.
Done in Phase 1 (2026-11-17): DEVA-T01..T04: Article XII, AI data policy, specs 022–026, 12 agent specs, 6 contracts,
ADR-0007 (Proposed) and ADR-0008, spec lint checks 10–13.
Done in Phase 2 (2026-11-18): DEVA-T05..T11, T13 (subagents, hooks, skills); QA-T02, QA-T03, API-T09/SUM-T07,
UCF-T08, SUM-T08, SUM-T11 through the agent workflow. Review passed, awaiting the owner's G5 check: UCF-T07, EVF-T06,
SUM-T09, SUM-T10.

1. **G5 manual checks** for UCF-T07, EVF-T06, SUM-T09, SUM-T10 (lists in their hand-offs), then `/task-close`
2. **UCF-T07 / UCF-T08**, **EVF-T06** save edits
3. **API-T09 → SUM-T08 → SUM-T09 → SUM-T10** persist the executive summary (also unblocks AIB-T07)
4. **QA-T02 → QA-T03** component tests and server integration harness (fixture: DATA-T09)
5. **API-T08** validate references · **PERF-T03** date display fix
6. **LAY-T07** refresh everything
7. **SEC-T03 → SEC-T04** remove unused dependencies, then `npm audit` (8 findings after the first install)
8. **QA-T07** CI on GitHub Actions (the remote exists since 2026-11-17); unblocks EVAL-T09 and DEVA-T12

## Workflow
See [workflow.md](workflow.md): **propose → specify → design → plan → build → verify → close**, with the
[validation gates](gates/validation-gates.md) G1–G7. Run `py spec/scripts/spec_lint.py` before every review.

Rule: **if code and spec disagree, one of them is a defect** (Constitution, Article I).
