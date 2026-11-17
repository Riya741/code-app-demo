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

## 2. Evidence map (what the assessor should open)

| Topic | Primary evidence | Supporting |
|---|---|---|
| 1 SDD | `spec/constitution.md` v1.1.0 (Art. XII), `spec/agents/`, `spec/contracts/`, `spec/handoffs/`, specs 022–026 | spec_lint checks 10–12, spec tree, traceability walkthrough |
| 2 AI dev | Git log of task-ID commits, `CLAUDE.md`, `.claude/`, `ai-dev-log.md` | CI headless review comments, closed High gaps, working app demo |
| 3 Eval | `evals/reports/…`, judge calibration, ADR-0007 | G7 in CI, 3B comparison (if done) |
| 4 Agents/Ops | `server/ai/`, ADR-0008, failure-mode tests, chaos report | Run Inspector, runbook, resume demo |
| 5 Tools | `.claude/hooks/`, `.claude/skills/`, `mcp/workbook-mcp/`, `plugins/sdd-toolkit/` | Security tests, second-repo install |

## 3. Demo script (10–12 minutes)

| Min | Segment | Shows |
|---|---|---|
| 0–1 | The problem and the app | Context; the High gaps at the start (README dashboard "before") |
| 1–3 | **SDD governs agents** | Constitution Art. XII → agent spec → contract → prompt header; spec lint catching a broken contract reference |
| 3–5 | **Claude Code workflow** | `/task-implement EVF-T07` in plan mode; spec-guard hook blocks an edit before the task starts; subagents; hand-off file; `/task-close` |
| 5–7 | **AI Account Brief** | Click *Draft with AI* → step progress → cited draft → edit → Save (SUM-EDIT-001 closed) |
| 7–8 | **Failure & recovery** | Fault injection on: retries visible; kill the server mid-run → resume; breaker opens → graceful message |
| 8–9 | **Observability** | Run Inspector waterfall, tokens and cost per step, trace to run ID from a toast |
| 9–11 | **Evaluation** | Report: model × prompt × critic comparison, judge–human κ, error taxonomy, ADR-0007 decision; G7 failing a deliberately worse prompt |
| 11–12 | **Extensibility** | MCP tool call from Claude Code; plugin installed in a second repo; close with the "after" dashboard |

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

- [ ] `py spec/scripts/spec_lint.py` → 0 errors; `py spectree/build_spectree.py --verify` passes
- [ ] `npm run lint && npm run typecheck && npm test && npm run eval:smoke` all green, and CI green on main
- [ ] README dashboard and gap register current; High gaps moved to Closed
- [ ] No secrets or real customer data in the repo or the evidence folder (`git grep` for emails, keys)
- [ ] Demo video recorded on the fixture workbook
- [ ] Self-assessment written; projected total ≥ 125 / 150 (pass mark 70, ≥ 3 topics)
