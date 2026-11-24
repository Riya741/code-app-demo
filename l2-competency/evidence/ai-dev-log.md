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

## Owner decisions and the summary dialog (2026-11-20)

| Task | What | Review | Commit |
|---|---|---|---|
| API-T13 | CR-20261120-1 approved: Article II.4 amended, a summary band with an AI auto-draft specified | owner | `bcbd04e` |
| API-T14, LAY-T10 | A summary save without text is rejected (API-SUMM-002). CR-20261120-2 replaces the band with a dialog | reviewer subagent: pass | `b16dec2` |
| LAY-T08, LAY-T09, LAY-T11, LAY-T12, SUM-T13 | The executive summary opens in a dialog over full-width grids; split sizes persist | reviewer subagent: pass | `6461ba7` |

## Phase 3: AI pipeline (2026-11-21 to 2026-11-23, branch `phase-3-ai-pipeline`, merged into `main`)

**Workflow change (CR-20261121-1, owner-approved 2026-11-21).** Every subagent started cold and re-read the context
the main session already held, so the owner kept only the Analyst, Writer and Spec author agents.
- Nine agents were retired, including the implementer, test-writer, reviewer and the runtime Critic.
- Since then, tasks are delivered in the main session through the `task-implement` and `task-close` skills. The review
  is recorded in the hand-off.
- The Stop hook runs only the tests related to changed files (DEVA-T17). The full suite runs at task close.

| Task | What | Hand-off verdict | Commit |
|---|---|---|---|
| AIB-T01, AIB-T02, AOPS-T01, AOPS-T02, AOPS-T11, DEVA-T16, DEVA-T17, EVAL-T14 | Pipeline skeleton: AI config (off by default), contracts validated at every hand-off, Retriever, read-only tools with an agent allow-list, traces; the Critic removed; the eval-only judge specified (CR-20261121-2) | session: pass | `76a8dd6` |
| AIB-T03 | Analyst and Writer steps with prompts v1; prompt headers cite their agent specs | session: pass | `ab3f1ac` |
| AOPS-T12 | CR-20261123-1: the Perficient Portkey gateway route (ADR-0009). Per-route keys from the environment only, route fields in traces, bulk-run guard. The AIB-T03 live check ran through the gateway | session: pass | `1f0eb77`, `8b56489` |
| AIB-T04, AIB-T05 | Guard step (citations, HTML from sentences, sanitising, word budget) and the `/api/ai` routes | session: pass | `5386c7c` |
| AIB-T06, AIB-T09, AIB-T10, AIB-T07 | Client fetchers and hooks, auto-draft, the AI brief in the summary dialog, and component tests per dialog state | session: pass; AIB-T07 human (owner G5, 2026-11-24) | `c416e14`, `8879d4b` |

## Phase 4: evaluation (2026-11-23)

| Task | What | Hand-off verdict | Commit |
|---|---|---|---|
| EVAL-T01, EVAL-T02, EVAL-T04, EVAL-T08 | 32-case dataset in 8 categories with machine-checkable expectations; 6 deterministic graders; `eval:smoke` / `eval:full` / `eval:compare` with replay; thresholds and gate G7 | session: pass | `73fa176` |
| QA-T07 | GitHub Actions CI: spec lint, lint, typecheck and tests on every push and PR (G6). Made gateway test paths platform-neutral so CI passed on Linux | CI green | `7d7a5b1`, `f3d7fcc` |

## Phase 5 and 6: quality, High gaps, MCP (2026-11-24, one branch per task, each merged into `main`)

**Scope decision (CR-20261123-2, owner-approved 2026-11-24).** The hardening and research tasks were deferred so the
remaining time goes to the High gaps, the MCP server and the submission:
- AOPS-T03..T10;
- EVAL-T06, T07 and T09..T13;
- DEVA-T14 and API-T11.

They stay as open tasks, not as done. AIB-T08 was closed with a note: the existing tests already covered it.

| Task | What | Fix-ups | Tests | Gates | Commit |
|---|---|---|---|---|---|
| AIB-T11 | CR-20261124-1: Writer prompt v2 and a 3-marker cap per sentence in the Guard, measured with one `eval:smoke` run through the gateway (G7 passed, $0.35) | 2: the owner's PowerShell rejected a `!` command prefix, and `node --env-file` found no settings file. Replaced with plain environment variables. The CR's "compared with the baseline" was corrected: this is the first baseline | +3 | G1, G3, G4, G7 | `4e06131`, `4f8c80b` |
| API-T08 | Writes check references and allowed solution values; closes the High gap API-WRITE-008 | 1: raw ExcelJS could not read the generated fixture, so the test edits a temp copy through the server's own `Store` | +5 (4 failed on the old code) | G1, G3, G4 | `82d97a1` |
| UCP-T08 (+ EVP-T07, PERF-T03) | One `src/lib/dates.ts` helper shows date-only values on the stored calendar day; closes the High gap DT-TIME-003 | 2: `vi.mock` hoisting (mock data moved into `vi.hoisted`); the hand-off schema allows no "pending" gate, so G5 was left out until the owner ran it | +10 (component tests failed on the old code; time zones UTC−10 to UTC+14) | G1, G3, G4, G5 (owner) | `2e5af83`, `4dcf0ca` |
| MCP-T01 | `workbook-mcp` over stdio, `.mcp.json`, controls: string cap, zod schemas, path allow-list (real path, junctions), result cap, audit log (fails closed) | 1: one unexplained failure in the first full run after `npm install`. The output was cut off and the next 8 runs passed; recorded in the hand-off rather than guessed at | +19 | G1, G3, G4 | `2e142dc` |
| MCP-T03 | Spec tools, resources and the `draft-account-brief` prompt; `run_spec_lint` via `execFile`, no shell | 2: the post-edit hook rejected literal fixture IDs in the test file (built at run time instead); a static check matched `RegExp.exec` and was tightened | +15 | G1, G3, G4 | `7cd7b92` |
| MCP-T02 | Data tools that wrap `server/ai/tools.ts` and the Retriever, with redaction; full notes only by ID | 0. A deliberate mutation (removing the note cut) confirmed the test fails | +11 | G1, G3, G4 | `695b8d7` |
| MCP-T04 | `propose_change_request` behind `MCP_ALLOW_WRITE=1`; fenced free text; unknown IDs refused so spec lint stays green | 2: a test caught an accent bug in the slug (NFKD left combining marks); a readonly-array type error in a test helper | +8 | G1, G3, G4 | `452de32` |
| MCP-T05 | A coverage guard (every tool has a test) and a hostile-input sweep over every tool and field | 1: a test helper used a UC- ID for `get_event` | +6 | G1, G3, G4 | `c22fc56` |
| MCP-T06 | Evidence from MCP Inspector (CLI) and a Claude Code session using the `mcp__workbook__` tools | 0 | — | G1 | `c22fc56`, `9aab8d0` |

**Where the agent needed correcting in this batch**
- **Shell and quoting:** escape sequences inside Python heredocs broke twice; the scripts were moved to scratch files.
  The data guard blocked two commands that named the secrets-file pattern, and both were rewritten, not bypassed.
- **First-pass test helpers:** the tests themselves caught their own wrong assumptions (a fixture folder that didn't
  exist, a wrong ID prefix) before any code was trusted.
- **Honest gaps:** where a result could not be explained (the one flaky run) or a step needed the owner (G5, the
  Claude Code session), the task stayed open or the hand-off said so.

**Totals at 2026-11-24:**
- **Tasks:** 174 of 244 done, up from 96 at the start.
- **Requirements:** 450 of 529 ✅.
- **High gaps:** 0 open, down from 7.
- **Tests:** 474 Vitest tests and 18 hook tests.
- **Gates:** G1, G3, G4, G6 and G7 active.

See [before-after.md](before-after.md).
