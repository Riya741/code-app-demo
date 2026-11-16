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
