# Code App Demo — Spec-Driven Development

This folder is the source of truth for the Code App Demo. Every change starts here: **requirements → design → tasks
→ code → verify**. The specs were reverse-engineered from the code on 2026-11-11; implemented behaviour is marked ✅
and everything still to do is a task with a status.

## Structure

```
spec/
├─ constitution.md                 non-negotiable principles (Articles I–XI)
├─ workflow.md                     how a change moves: propose → specify → design → plan → build → verify → close
├─ steering/                       shared context every spec relies on
│  ├─ product.md                   purpose, users, scope, principles
│  ├─ tech.md                      stack, commands, configuration, constraints
│  ├─ structure.md                 repo/spec layout, naming, code conventions
│  ├─ glossary.md                  domain terms
│  └─ constitution-mapping.md      article ↔ spec ↔ requirement matrix, exceptions
├─ adr/                            0001 … 0005 architecture decision records
├─ specs/NNN-<name>/
│  ├─ requirements.md              user stories + one block per EARS criterion (ID, Status, Criterion, Source)
│  ├─ design.md                    architecture, interfaces, planned changes, constitution check
│  └─ tasks.md                     implementation tasks, each with a status and the requirements it covers
├─ gates/
│  ├─ validation-gates.md          G1 spec lint … G6 CI
│  └─ gap-register.md              every ❌ Gap / ⚠️ Partial requirement and the tasks that close it
├─ scripts/spec_lint.py            gate G1 (run: py spec/scripts/spec_lint.py)
├─ templates/                      requirements, design, tasks, change-request, adr
├─ traceability.md                 spec → source files, cross-spec task links
└─ id-migration.md                 old IDs (SRCH-012) → new IDs (SRCH-RANK-003)
```

## Status dashboard (2026-11-16)

Requirements: ✅ Implemented · ⚠️ Partial · ❌ Gap · 📝 Planned. Tasks: ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked.

| Spec | Prefix | Reqs | ✅ | ⚠️ | ❌ | 📝 | Tasks | ✅ | 🔄 | ⬜ | ⛔ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Features** | | | | | | | | | | | |
| [001-customer-search](specs/001-customer-search/) | SRCH | 20 | 19 | 0 | 1 | 0 | 9 | 7 | 0 | 2 | 0 |
| [002-workspace-layout](specs/002-workspace-layout/) | LAY | 17 | 15 | 2 | 0 | 0 | 8 | 6 | 0 | 2 | 0 |
| [003-executive-summary](specs/003-executive-summary/) | SUM | 14 | 11 | 1 | 1 | 1 | 11 | 6 | 0 | 4 | 1 |
| [004-use-cases-panel](specs/004-use-cases-panel/) | UCP | 21 | 20 | 1 | 0 | 0 | 9 | 7 | 0 | 2 | 0 |
| [005-use-case-form](specs/005-use-case-form/) | UCF | 20 | 17 | 0 | 2 | 1 | 10 | 6 | 0 | 4 | 0 |
| [006-use-case-bulk](specs/006-use-case-bulk/) | UCB | 25 | 24 | 1 | 0 | 0 | 11 | 8 | 0 | 3 | 0 |
| [007-events-panel](specs/007-events-panel/) | EVP | 13 | 12 | 1 | 0 | 0 | 9 | 6 | 0 | 3 | 0 |
| [008-event-form](specs/008-event-form/) | EVF | 10 | 7 | 0 | 2 | 1 | 9 | 5 | 0 | 3 | 1 |
| [009-data-grid](specs/009-data-grid/) | GRID | 19 | 18 | 0 | 1 | 0 | 7 | 5 | 0 | 2 | 0 |
| [010-export](specs/010-export/) | EXP | 11 | 9 | 1 | 0 | 1 | 7 | 4 | 0 | 3 | 0 |
| [011-rich-text](specs/011-rich-text/) | RTX | 21 | 20 | 1 | 0 | 0 | 7 | 5 | 0 | 2 | 0 |
| **Data & backend** | | | | | | | | | | | |
| [012-data-model](specs/012-data-model/) | DATA | 19 | 17 | 1 | 1 | 0 | 9 | 7 | 0 | 1 | 1 |
| [013-workbook-storage](specs/013-workbook-storage/) | STO | 18 | 16 | 1 | 0 | 1 | 7 | 5 | 0 | 2 | 0 |
| [014-workbook-api](specs/014-workbook-api/) | API | 22 | 20 | 0 | 1 | 1 | 11 | 8 | 0 | 3 | 0 |
| [015-client-data-layer](specs/015-client-data-layer/) | CDL | 15 | 14 | 1 | 0 | 0 | 7 | 5 | 0 | 1 | 1 |
| [016-data-pipeline](specs/016-data-pipeline/) | PIPE | 28 | 28 | 0 | 0 | 0 | 8 | 5 | 0 | 3 | 0 |
| **Cross-cutting** | | | | | | | | | | | |
| [017-design-system](specs/017-design-system/) | DS | 16 | 14 | 1 | 0 | 1 | 8 | 5 | 0 | 3 | 0 |
| [018-accessibility](specs/018-accessibility/) | A11Y | 15 | 10 | 2 | 3 | 0 | 6 | 1 | 0 | 5 | 0 |
| [019-security](specs/019-security/) | SEC | 9 | 6 | 1 | 1 | 1 | 6 | 3 | 0 | 3 | 0 |
| [020-performance-reliability](specs/020-performance-reliability/) | PERF/REL/COMP/DT | 23 | 16 | 4 | 1 | 2 | 7 | 2 | 0 | 5 | 0 |
| [021-quality](specs/021-quality/) | QA | 15 | 10 | 0 | 0 | 5 | 10 | 4 | 0 | 6 | 0 |
| **Total** | | **371** | **323** | **19** | **14** | **15** | **176** | **110** | **0** | **62** | **4** |

## Suggested next tasks (highest value first)
Done in Phase 0 (2026-11-16): SEC-T02 git, SEC-T01 localhost, QA-T05 typecheck, QA-T01 unit tests, SRCH-T07/T09,
EXP-T07, PIPE-T07 demo data generator, DATA-T09 test fixture.

1. **UCF-T07 / UCF-T08**, **EVF-T06** save edits
2. **API-T09 → SUM-T08 → SUM-T09 → SUM-T10** persist the executive summary
3. **QA-T02 → QA-T03** component tests and server integration harness (fixture: DATA-T09)
4. **API-T08** validate references · **PERF-T03** date display fix
5. **LAY-T07** refresh everything
6. **SEC-T03 → SEC-T04** remove unused dependencies, then `npm audit` (8 findings after the first install)
7. **QA-T07** CI once a GitHub remote exists

## Workflow
See [workflow.md](workflow.md): **propose → specify → design → plan → build → verify → close**, with the
[validation gates](gates/validation-gates.md) G1–G6. Run `py spec/scripts/spec_lint.py` before every review.

Rule: **if code and spec disagree, one of them is a defect** (Constitution, Article I).
