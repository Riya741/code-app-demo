# Submission Pack — Evidence, Demo and Self-Assessment

Assessors score what they can **see**. Collect evidence as you work, not at the end: a screenshot or log taken in
the moment is worth more than a description written later.

## 1. Evidence folder

```
l2-competency/evidence/
├─ ai-dev-log.md              Topic 2: one row per task (features used, time, fix-ups, tests, gates, commit)
├─ sessions/                  Topic 2/5: exported Claude Code session notes and screenshots (plan mode, subagents, hooks)
├─ traceability-walkthrough.md Topic 1: AIB-CITE-002 from requirement to trace span
├─ eval/                      Topic 3: final report, judge-calibration table, ADR-0007 link, scores.csv
├─ ops/                       Topic 4: chaos-run report, trace sample (redacted), Run Inspector screenshots, resume demo
├─ security/                  Topic 5: hook test output, MCP security tests, audit-log sample
└─ before-after.md            dashboard counts: gaps, tasks, tests, gates — at start vs at submission
```

**Never put real customer data in this folder.** Use the fixture workbook for every screenshot and trace sample.

**State (2026-11-24):** built. The index is [evidence/README.md](evidence/README.md):

- `ai-dev-log.md`, `before-after.md` and `traceability-walkthrough.md`;
- `eval/smoke-2026-11-24.md`, `ops/trace-sample.md` and `security/security-evidence.md`;
- `mcp-workbook-server.md` and `sessions/README.md`.

The screenshots and the demo video (recorded 2026-11-25) are in `sessions/` and listed in `sessions/README.md`.

## 2. Evidence map (what the assessor should open)

| Topic        | Primary evidence                                                                                                                                                                                                                                                     | Supporting                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 SDD        | [spec/constitution.md](../spec/constitution.md) v1.1.2 (Art. XII), [spec/agents/](../spec/agents/README.md), [spec/contracts/](../spec/contracts/README.md), [spec/handoffs/](../spec/handoffs/README.md) (45), specs 022–026, [spec/changes/](../spec/changes/) (8 CRs) | spec lint checks 1–13, spec tree, [traceability walkthrough](evidence/traceability-walkthrough.md)                                         |
| 2 AI dev     | Git log of task-ID commits, [CLAUDE.md](../CLAUDE.md), [.claude/](../.claude/README.md), [ai-dev-log.md](evidence/ai-dev-log.md)                                                                                                                                        | CI on GitHub Actions (G6), [before/after](evidence/before-after.md) (7 → 0 High gaps), working app demo                                    |
| 3 Eval       | [evals/](../evals/README.md), [eval/smoke-2026-11-24.md](evidence/eval/smoke-2026-11-24.md), `evals/thresholds.json` (G7)                                                                                                                                            | CR-20261124-1: a prompt change measured with data. Judge, κ, experiment and ADR-0007 deferred                                             |
| 4 Agents/Ops | [server/ai/](../server/ai/), ADR-0008, ADR-0009, [ops/trace-sample.md](evidence/ops/trace-sample.md)                                                                                                                                                                   | Contract and tool-allow-list tests. Resilience, Run Inspector and chaos run deferred                                                       |
| 5 Tools      | [.claude/hooks/](../.claude/hooks/), [.claude/skills/](../.claude/skills/), [mcp/workbook-mcp/](../mcp/workbook-mcp/src/), [.mcp.json](../.mcp.json)                                                                                                                     | [security evidence](evidence/security/security-evidence.md) (18 hook + 59 MCP tests), [MCP client sessions](evidence/mcp-workbook-server.md) |

## 3. Demo script (10–12 minutes)

Updated 2026-11-24 to what is built. Deferred features are named as next steps, not shown. The recording (2026-11-25,
29 min 37 s, longer than planned) is [evidence/sessions/codeappdemo.mp4](evidence/sessions/codeappdemo.mp4).

| Min    | Segment                        | Shows                                                                                                                                                                              |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–1   | The problem and the app        | Context; 7 High gaps at the start, 0 now ([before/after](evidence/before-after.md))                                                                                                 |
| 1–3   | **SDD governs agents**   | Constitution Art. XII → agent spec → contract → prompt header (AIB-CITE-002). Spec lint catching a prompt whose agent version drifted, or a test title with an unknown ID       |
| 3–5   | **Claude Code workflow** | `/task-implement <ID>`: the spec-guard hook blocks an edit before the task is 🔄; post-edit lint feedback; the hand-off file; `/task-close` and the merge                      |
| 5–7   | **AI Account Brief**     | Open a customer → *Draft with AI* → step progress → cited draft (markers) → edit → Save. Show an *unverified* draft with its issue list                                   |
| 7–8   | **Observability**        | The run's trace: steps, tokens, cost, versions and route (gateway) ([ops/trace-sample.md](evidence/ops/trace-sample.md))                                                            |
| 8–10  | **Evaluation**           | `eval:smoke` report: the G7 thresholds, per-case grades, and the prompt v1 → v2 change measured with data. Name what's next: judge, κ, model comparison, ADR-0007              |
| 10–12 | **Extensibility**        | `/mcp` showing `workbook` connected → `trace_requirement` and `get_customer_facts` from Claude Code → a hostile call refused → the audit line. Close with the dashboard |

## 4. Self-assessment template

Fill one block per topic before you submit. Be specific and honest; naming limits shows maturity.

```markdown
### Topic N — <name>        Self-score: __/30   Band: Distinction / Proficient / Developing
**Top-mark criterion:** <quote from rubric>
**How this project meets it:** 3–5 bullets, each linking evidence
**Numbers:** e.g. 34 tasks closed by agent workflow, 7/7 High gaps closed, κ = 0.71, chaos success 97%
**What I would do next / known limits:** 1–3 bullets
```

## 5. Final pre-submission checklist

State on 2026-11-25 at `ac33e51`, after the push of `main`:

- [X] `py spec/scripts/spec_lint.py` → 0 errors; `py spectree/build_spectree.py --verify` passes
- [X] `npm run lint && npm run typecheck && npm test && npm run eval:smoke` all green ✅ locally (eval:smoke passed
  2026-11-24), and CI green on main (run #7 at `ac33e51`, 2026-11-25)
- [X] README dashboard and gap register current; High gaps moved to Closed (0 open)
- [X] No secrets or real customer data in the repo or the evidence folder ([security evidence §3](evidence/security/security-evidence.md#3-repository-scan-no-secrets-no-real-data))
- [X] Demo video recorded on the fictional demo workbook (2026-11-25, [sessions/](evidence/sessions/README.md))
- [ ] Self-assessment written; projected total ≥ 125 / 150 (pass mark 70, ≥ 3 topics)
