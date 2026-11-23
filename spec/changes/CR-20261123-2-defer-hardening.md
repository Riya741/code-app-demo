# Change Request: Defer the hardening and research tasks (competency scope)

- **ID:** CR-20261123-2
- **Author / date:** Project owner (direction), drafted with Claude Code · 2026-11-23
- **Type:** Scope change (task plan only; no requirement text, behaviour, API, UI or Constitution change)
- **Specs affected:** specs/024-agent-ops, specs/023-ai-evaluation, specs/022-ai-account-brief, specs/026-dev-agents,
  specs/014-workbook-api, specs/020-performance-reliability (tasks only); gates/gap-register.md (notes)
- **Constitution articles affected:** none amended; compliance unchanged (the deferred tasks harden or measure; no rule
  depends on them being done now)
- **Status:** Proposed 2026-11-23 · waiting for the owner's approval · branch `aib-t06-t10-t07-client`

## 1. Problem
This is a competency project, not a client deliverable. The owner asked on 2026-11-23 to finish "ASAP with minimal
token usage" and to use the Portkey gateway as little as possible. Several open tasks harden the AI pipeline for
production, or run paid experiments. They are not needed to show the spec-driven workflow end to end.

## 2. Proposed behaviour
The tasks below stay in the plan as ⬜, each with a note `Deferred by CR-20261123-2`. They are not started in this
phase, and their requirements keep their current status: no requirement is marked implemented by this CR.

| Task | Why it can wait |
|---|---|
| AOPS-T03 resilience, AOPS-T04 repair retry, AOPS-T06 budgets and breaker | Production hardening; a failed run already ends cleanly with a catalog reason (AIB-T05) |
| AOPS-T05 checkpoints and resume | Runs live in memory; a restart loses only an unsaved draft |
| AOPS-T07 metrics, AOPS-T08 Run Inspector, AOPS-T09 replay, AOPS-T10 chaos run | Operations tooling; AOPS-T10 needs bulk gateway calls |
| EVAL-T06 experiment, EVAL-T07 ADR-0007 | Four configurations × repetitions = bulk gateway calls; the agent-spec model stays |
| EVAL-T11, EVAL-T12, EVAL-T13 eval judge and human labels | Judge calls plus owner labelling time |
| EVAL-T09 eval CI job | Follows QA-T07 CI; can be added later |
| EVAL-T10 grader unit tests | Folded into EVAL-T02 (graders are written with their tests) |
| AIB-T08 extra unit/integration tests | Already met by `tests/unit/ai-guard.test.ts`, `tests/integration/ai-routes.test.ts`, `retriever.test.ts` and `analyst-writer.test.ts`; close it with a note when this CR is approved |
| DEVA-T14 skill trigger evals | Research on the dev tooling, not the app |
| API-T11 tests for every endpoint and error code | Most endpoints already have integration tests; the High gaps go first (API-T08) |
| PERF-T03 `formatDay` everywhere | Cosmetic consistency |

**Kept in scope:** MCP-T01..T06 (owner: "MCP is required"), EVAL-T01, EVAL-T02, EVAL-T04 (with
`gatewayBulkRefusal`), EVAL-T08, QA-T07 CI, API-T08, UCP-T08, and the L2 evidence and documents.

## 3. Spec impact
- Tasks files: a `Deferred by CR-20261123-2` note on each task above; Summary lines unchanged (still ⬜).
- Gap register: rows whose fix task is deferred get the same note; severities stay.
- No requirement, design, contract, agent spec, prompt or catalog change.

## 4. Risks and rollout
- **Partial requirements stay partial** (e.g. AOPS-ROUTE-008 until EVAL-T04; AOPS-FAIL-* until AOPS-T03). This is
  visible in the dashboard and is the honest state.
- **Undo:** remove the notes; nothing else changes.

## 5. Review
- [ ] Owner approves the deferral list (or strikes tasks to keep)
