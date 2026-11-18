# Tasks — Development Agents

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 15 tasks — ✅ 10 · 🔄 1 · ⬜ 3 · ⛔ 1

### Phase 1: specify and check
- [x] **DEVA-T01** CR-20261117-1, constitution v1.1.0 (Article XII), AI data policy, specs 022–026, ADR-0007 and ADR-0008.
  - Status: ✅ Done · Covers: — (governance) · Files: `spec/changes/CR-20261117-1-ai-agents.md`, `spec/constitution.md`, `spec/steering/ai-data-policy.md`, `spec/specs/022-ai-account-brief/`..`026-dev-agents/`, `spec/adr/0007-model-and-prompt-choice.md`, `spec/adr/0008-orchestration-pattern.md`
- [x] **DEVA-T02** Agent template and 12 agent specs (6 runtime, 1 evaluation, 5 development).
  - Status: ✅ Done · Covers: DEVA-SPEC-001 · Files: `spec/templates/agent.md`, `spec/agents/`
- [x] **DEVA-T03** Spec lint checks 10–13 (agent specs, prompt headers, hand-off files, contracts).
  - Status: ✅ Done · Covers: DEVA-SPEC-001..003, DEVA-HAND-002 · Files: `spec/scripts/spec_lint.py`, `spec/gates/validation-gates.md`
  - Verified 2026-11-17: see the probe results in [l2-competency/evidence/ai-dev-log.md](../../../l2-competency/evidence/ai-dev-log.md#phase-1-specify-the-ai-work-2026-11-17-branch-phase-1-specify-ai).
- [x] **DEVA-T04** Six hand-off contracts and the hand-off template.
  - Status: ✅ Done · Covers: DEVA-SPEC-003, DEVA-HAND-002 · Files: `spec/contracts/`, `spec/templates/handoff.md`, `spec/handoffs/README.md`

### Phase 2: enforce while working
- [x] **DEVA-T05** Subagents in `.claude/agents/`, each with the header for its agent spec.
  - Status: ✅ Done · Covers: DEVA-SUB-001, DEVA-SUB-002, DEVA-SPEC-002 · Files: `.claude/agents/`
  - Verified 2026-11-17: 5 subagents in `.claude/agents/`; spec lint check 11 passes on all 5 headers (reviewer at AGENT-REVIEWER@1.1.0 after its spec was aligned with DEVA-SUB-002); reviewer and eval-analyst have no Edit/Write tool.
- [x] **DEVA-T06** Spec-guard and data-guard hooks, settings with the deny-list.
  - Status: ✅ Done · Covers: DEVA-GUARD-001..003 · Files: `.claude/hooks/spec_guard.py`, `.claude/hooks/data_guard.py`, `.claude/settings.json`
  - Verified 2026-11-17: `npm run test:hooks` (DEVA-GUARD-001/-002 cases) passes; hook commands run from Git Bash exactly as configured; deny-list in `.claude/settings.json`. Seen live 2026-11-17: the data guard blocked one of this session's own shell commands (it named a secrets-file pattern) without a restart.
- [x] **DEVA-T07** Post-edit check and gates-on-stop hooks.
  - Status: ✅ Done · Covers: DEVA-GATE-001, DEVA-GATE-002 · Files: `.claude/hooks/post_edit_check.py`, `.claude/hooks/gates_on_stop.py`
  - Verified 2026-11-17: hook tests pass; a real gate run on this branch found and fixed a parsing defect (first `git status` path lost its first character), now covered by a test.
- [x] **DEVA-T08** Session-start context hook.
  - Status: ✅ Done · Covers: DEVA-CTX-001 · Files: `.claude/hooks/session_context.py`
  - Verified 2026-11-17: run against the repo, it listed the 7 🔄 tasks and the 6 open High gaps.
- [ ] **DEVA-T09** Skills `spec-change`, `task-implement`, `task-close`, `gap-report`, `eval-run`, and their trigger-eval sets.
  - Status: 🔄 In progress · Covers: DEVA-SKILL-001, DEVA-HAND-001 · Files: `.claude/skills/`, `spec/scripts/dashboard.py`
- [x] **DEVA-T10** Lint check: a ✅ task with a hand-off needs `verdict: pass` and a reviewer.
  - Status: ✅ Done · Covers: DEVA-HAND-003 · Files: `spec/scripts/spec_lint.py`
  - Verified 2026-11-17: probe hand-off for a ✅ task rejected with `verdict: pending` and with no reviewer, accepted with `verdict: pass` + reviewer; probe removed.
- [ ] **DEVA-T11** First five tasks delivered through `/task-implement` with hand-off files (start with UCF-T07, UCF-T08, EVF-T06).
  - Status: ⬜ Not started · Covers: DEVA-HAND-001, DEVA-HAND-003 · Depends on: DEVA-T05, DEVA-T09

### Phase 5: headless review
- [ ] **DEVA-T12** Headless `claude -p` spec-compliance review on pull requests.
  - Status: ⛔ Blocked by QA-T07 · Covers: DEVA-CI-001 · Files: `.github/workflows/review.yml`

- [ ] **DEVA-T14** Run the skill trigger evals (`.claude/skills/trigger-evals.json`) with the skill-creator eval loop; record results; tune descriptions that misfire.
  - Status: ⬜ Not started · Covers: DEVA-SKILL-002 · Depends on: DEVA-T09

- [ ] **DEVA-T15** Enforce the implementer's Bash limits (gate commands and read-only git only): its `tools` field allows any command, so it could write files through Bash and skip the spec-guard and post-edit hooks (seen once in SUM-T08, self-reported). Options: a PreToolUse Bash hook that refuses file-writing commands under protected folders, or permission rules if subagent-scoped rules become available.
  - Status: ⬜ Not started · Covers: DEVA-SUB-001, DEVA-GUARD-001 · Files: `.claude/hooks/`, `.claude/agents/implementer.md` · Found 2026-11-18 in the SUM-T08 review.

## Test tasks
- [x] **DEVA-T13** Hook tests (allow and block cases, fail-open and fail-closed).
  - Status: ✅ Done · Covers: DEVA-GUARD-004 · Files: `tests/hooks/` · Depends on: DEVA-T06
  - Verified 2026-11-17: 15 tests, all pass (`npm run test:hooks`).
