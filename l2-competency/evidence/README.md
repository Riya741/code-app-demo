# Evidence pack

This is what an assessor should open, by topic. It follows the layout in
[06-submission-evidence.md §1](../06-submission-evidence.md#1-evidence-folder).

All data in this folder is the project's fictional demo data ([ADR-0006](../../spec/adr/0006-fictional-demo-dataset.md)).
There are no real customers, people or notes. Last updated **2026-11-24** at `main` `e3793a4`.

| Path | Topic | What it shows | State |
|---|---|---|---|
| [ai-dev-log.md](ai-dev-log.md) | 2 | One row per task delivered with Claude Code: features used, fix-ups, tests, gates, commit (Phases 0–6) | ✅ |
| [before-after.md](before-after.md) | all | Dashboard counts at the start (2026-11-16) and now: requirements, tasks, gaps, tests, gates | ✅ |
| [traceability-walkthrough.md](traceability-walkthrough.md) | 1 | AIB-CITE-002 traced through each layer: requirement → agent spec → contract → prompt header → code → tests → eval grader → trace span. Pulled live through the project's own MCP tools | ✅ |
| [eval/smoke-2026-11-24.md](eval/smoke-2026-11-24.md) | 3 | The G7 smoke run through the gateway: 8 cases, per-case grades, thresholds, cost; what is deferred | ✅ (smoke) · experiment, judge and κ deferred |
| [ops/trace-sample.md](ops/trace-sample.md) | 4 | A real run trace: 7 spans, tokens, cost, latency, route, outcome; no free text | ✅ (sample) · chaos run, Run Inspector, resume deferred |
| [security/security-evidence.md](security/security-evidence.md) | 5 | Hook tests (18), MCP security tests (59) mapped to each control, audit-log sample, secrets and real-data scan | ✅ |
| [mcp-workbook-server.md](mcp-workbook-server.md) | 5 | `workbook-mcp` exercised from MCP Inspector and from a Claude Code session, with audit lines | ✅ |
| [sessions/README.md](sessions/README.md) | 2, 5 | Index of recorded sessions, and what is still to capture (screenshots, demo video) | ⚠️ partly: screen recordings are the owner's step |

## What is deliberately not here
CR-20261123-2 (owner-approved 2026-11-24) deferred the hardening and research tasks. They are listed as open tasks
in the specs, not presented as done:
- **Topic 3:** the four-setup model experiment and its report (EVAL-T06), the ADR-0007 decision (EVAL-T07), the
  eval-only judge, human labels and κ calibration (EVAL-T11..T13), the CI grader job (EVAL-T09), and grader unit
  tests (EVAL-T10).
- **Topic 4:** retries and fault injection (AOPS-T03), repair retry (T04), checkpoints and resume (T05), budgets and
  breaker (T06), metrics (T07), Run Inspector and runbook (T08), replay-based fault tests (T09), and the chaos run
  (T10).
- **Topic 5:** skill trigger evals (DEVA-T14).
