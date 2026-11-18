# AI-assisted development log

One row per task delivered with Claude Code (Topic 2 evidence). "Fix-ups" counts the times the agent had to
correct its own work, or a human had to step in, before the gates passed.

## Before Phase 0 (2026-11-16)

| Work | Claude Code features used | Outcome |
|---|---|---|
| Competency plan (`l2-competency/`) | Repo survey, spec lint run, `claude-api` skill for current model/SDK facts | 7 plan files; current-state score estimate |
| Fictional data workbook | Python generator written and iterated with the owner; ExcelJS load test mirroring `server/workbook.ts`; real-name leak check | `scripts/generate_demo_workbook.py`; real data removed from the project (ADR-0006) |

## Phase 0: foundations (2026-11-16, branch `phase-0-foundations`)

| Task | What | Features used | Fix-ups | Tests | Gates | Commit |
|---|---|---|---|---|---|---|
| SEC-T02 | git, `.gitignore`, `.gitattributes`; staged files reviewed for `.xlsx`/secrets before commit | Bash, spec edits | 0 | — | G1 | `5a63140` |
| QA-T08 | 4 lint errors surfaced by the first locked install, fixed without behaviour change | Lint triage, byte-level check of the NBSP fix | 2 (a shell escape turned `\u00a0` into `00a0`; caught by diff and fixed before commit) | — | G1, G3 | `b1f1d6d` |
| SEC-T01 | Dev/preview on localhost, `HOST` opt-in | netstat proof on both settings; first API run on the demo data | 0 | — | G1, G3 | `2564226` |
| QA-T05 | `npm run typecheck` (app + server) | — | 0 | — | G1, G3 | `8212078` |
| QA-T07 | Unblocked CI task (git now exists) | Spec consistency check | 0 | — | G1 | `53fac5f` |
| QA-T01, SRCH-T07, EXP-T07 | Vitest + 19 tests named by requirement ID; spec lint now enforces test titles | Test-first: tests written from the EARS criteria, not the code | 1 (literal BOMs in a regex, caught by lint) | 19 | G1, G3, G4 | `6dbfd30` |
| SRCH-T09 | **Defect found by the new tests**: an exact parent ID ranked 4, the spec says 0 | Spec-vs-code resolution under Article I | 0 | 1 | G1, G3, G4 | `6dbfd30` |
| PIPE-T07, DATA-T09 | Generator recorded in the spec after the fact (8 requirements), ADR-0006, three data-quality gaps closed | Retroactive spec, honest deviation note | 0 | — | G1 | `43b0eda` |
| Close-out | Dashboard recount, `CLAUDE.md`, spec tree regenerated, QA-T09 logged (spec tree ignores TS tests) | — | 1 (`CLAUDE.md` rule relaxed: reading fictional data is fine) | — | G1 | close-out commit |

**Phase 0 totals:** 14 tasks closed (dashboard: 96 → 110 done), 6 gaps closed (1 High: SEC-EXPO-001; 3 Medium:
DATA-QUAL-001, -002, -004; 2 Low: SEC-SUPPLY-001, API-GEN-005), 1 latent defect found and fixed by tests,
19 tests, gates G1 + G3 + G4 active.

**Where the agent needed correcting:** writing escape sequences (`\u00a0`, `\ufeff`) through the file tools produced
literal characters twice. Lint caught both, and the rule now lives in `CLAUDE.md`. The data generator was built
before its spec at the owner's request; it is recorded as a deviation in PIPE-T07.

## Phase 1: specify the AI work (2026-11-17, branch `phase-1-specify-ai`)

| Task | What | Features used | Fix-ups | Tests | Gates | Commit |
|---|---|---|---|---|---|---|
| DEVA-T01 | CR-20261117-1; constitution v1.1.0 with Article XII; AI data policy; specs 022–026 (119 requirements, 48 tasks); ADR-0007 (Proposed), ADR-0008 | Spec authoring from the topic plans; constitution re-check of all 21 existing designs | 1 (the Article XII review found a second conflict, VIII.3 "no external services", beyond the III.3 one the plan named; resolved as XII.8) | — | G1 | `074d6b5` |
| DEVA-T02, DEVA-T04 | 12 agent specs (6 runtime, 1 evaluation, 5 development); 6 JSON Schema contracts; agent and hand-off templates | Contract design: the Writer returns plain-text sentences with citations and the Guard builds the HTML, so citations are checkable per sentence and no model text becomes markup | 0 | — | G1 | `074d6b5` |
| DEVA-T03 | Spec lint checks 10–13 (agent specs, prompt headers, hand-offs, contracts) | Probe-file verification of the gate: 29 seeded defects across the 4 checks all rejected; a valid prompt and hand-off accepted; probes removed | 0 | probe run | G1, G3, G4 | `4dc86a1` |
| Close-out | Dashboard (26 specs, 490 requirements, 224 tasks), traceability, mapping, steering, spec tree config + regeneration | `build_spectree.py --verify` (26/490 on both sides) | 1 (the spec tree generator crashed on a wrapped bullet in `workflow.md`; worked around and logged in QA-T09, because the generator may only change in its skill) | — | G1 | close-out commit |

**Phase 1 totals:** 4 tasks closed (dashboard: 110 → 114 done), 119 new requirements (4 ✅ lint checks, 115 📝 planned),
48 new tasks, 12 agent specs, 6 contracts, G1 extended from 9 to 13 checks, G7 specified.

**Where the agent needed correcting:** a shell heredoc preceded by a stray `cat >` waited on input and had to be
stopped; the edit was redone with the file tools. No spec content needed a human fix-up before the gates passed, but
the CR's review boxes are left for the owner to tick at merge, because approving a constitution amendment is the
owner's decision, not the agent's.

## Phase 2: agentic development setup and first deliveries (2026-11-17/18, branch `phase-2-agentic-dev`)

**Tooling (DEVA-T05..T10, T13; `83a1308`, `5553dc5`)**
- 5 subagents, 5 hooks, 5 skills, a settings deny-list and 17 hook tests.
- `spec/scripts/dashboard.py` recounts the README dashboard.
- Spec lint gained the hand-off review rules.

**Deliveries:** every task went implementer subagent → gates → independent reviewer subagent → verdict in `spec/handoffs/<TASK>.md`. Wave 1 ran 2 implementers in parallel, wave 2 ran 3.

| Task | What | Review | Fix-ups | Tests | Commit |
|---|---|---|---|---|---|
| QA-T02 | Testing Library + component tests | pass, 2 rounds (titles over-claiming; vacuous assertion) | 2 rounds, plus a QA-T01 defect the stop hook found (below) | 10 | `4a915d7` |
| QA-T03 | Server test harness on a generated fixture, `WORKBOOK_PATH` | pass (3 titles over-claimed; cwd-dependent path) | 1 | 20 | `4a915d7` |
| API-T09 / SUM-T07 | `POST /customers/:id/summary` | **fail → pass** (scope: the orchestrator's catalog entries described unbuilt behaviour as done) | 1 (orchestrator) | 6 | `4a915d7` |
| UCF-T08 | Edits keep target fields | pass | 0 | 3 | `329d2b1` |
| UCF-T07 | Save use case edits | **fail → pass** (data loss: `premium_credit` erased when Save beat the lookup) | 2 rounds; the reviewer mutation-tested the fix | 5 | `329d2b1` |
| EVF-T06 | Save event edits | pass (found an Article II.4 conflict, now a recorded exception) | 0 | 6 | `329d2b1` |
| SUM-T08..T11 | Summary save client, UI states, interim code removed, tests | pass ×4 | 0 | 19 | `329d2b1` |

**What the agent workflow caught that a single session would likely have missed**
- **Reviewer, data loss:** a real data-loss defect in UCF-T07, before commit.
- **Stop hook, Windows test failure:** the suite failed whenever it was started from a lower-case `c:` directory, as VS Code terminals are. It dated from QA-T01, and Vitest loaded twice. Fixed in `vitest.config.ts`; QA-T10 tracks removing the workaround.
- **Stop hook, its own bug:** the hook's own test run dropped the first character of `git status` paths. Fixed and tested.
- **Data guard, live block:** it blocked one of this session's own commands that named a secrets-file pattern. The hooks loaded mid-session, without a restart.
- **Data guard, false positive:** it once blocked a commit command (a workbook name and a redirect in unrelated parts of one command). Fixed to judge each command on its own.
- **Lint, review rule:** DEVA-HAND-003 rejected the orchestrator's own close of UCF-T08 before its review was recorded. It then exposed an empty-review loophole, now closed in check 12.
- **Reviewers, spec questions:** 4 owner decisions, now tracked as API-T12, API-T13, SUM-T12 and DEVA-T15.

**Where the agents needed correcting**
- One implementer wrote two files through Bash, which bypassed the hooks. It reported this itself and redid them with the Write tool; DEVA-T15 closes the gap.
- Wave 2 stopped once on the 5-hour usage limit. The agents were resumed with their work intact.
- Project subagent types are registered only at session start, so wave 1 used general-purpose agents loading the subagent file.

**Not done by agents**
- The G5 manual UI checks (light and dark themes, ≥ 1024px and < 1024px) for UCF-T07, EVF-T06, SUM-T09 and SUM-T10 are for the owner. Those 4 tasks stay 🔄 until they are recorded.

**G5:** the owner ran the manual checks for UCF-T07, EVF-T06, SUM-T09 and SUM-T10 on 2026-11-18 and reported them passed; those tasks are now closed.

**Phase 2 totals:**
- **Tasks:** 19 closed in this phase (dashboard 114 → 133 done).
- **Tests:** 19 → 89 unit, component and integration tests, plus 17 hook tests.
- **High gaps:** 4 closed (UCF-EDIT-004, UCF-EDIT-002, EVF-EDIT-002, SUM-EDIT-001), 6 → 2 open; the remaining two are API-WRITE-008 and DT-TIME-003.
