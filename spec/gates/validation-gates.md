# Validation gates

Checks that keep the specs and the code in step. A task may only be marked ✅ Done when every gate that applies to
it passes. Gates marked *planned* become mandatory when their task is done.

| Gate | Check | How | Runs | State |
|---|---|---|---|---|
| G1 | Spec format and integrity | `py spec/scripts/spec_lint.py` | Before review, before commit | ✅ Active |
| G2 | Constitution check | Reviewer reads the design's Constitution check table | Design review | ✅ Active (manual) |
| G3 | Lint and types | `npm run lint` · `npm run typecheck` | Before commit | ✅ Active |
| G4 | Tests cite requirements | `npm test` · tests named `PREFIX-AREA-NNN …` | Before commit | 📝 Planned (QA-T01..T03) |
| G5 | Manual verification | Criterion checked in light + dark, ≥ 1024px + < 1024px, note in the task | Before ✅ Done | ✅ Active (manual) |
| G6 | CI | G1, G3, G4 on every push | On push | 📝 Planned (QA-T07, needs SEC-T02) |

## G1 — Spec lint
`spec/scripts/spec_lint.py` fails when:
- a spec folder is not `NNN-slug` or misses `requirements.md`, `design.md` or `tasks.md`;
- a requirement heading is malformed, an ID is duplicated, or a block lacks exactly one Status or a Criterion;
- a requirement or task ID mentioned anywhere in `spec/` does not exist;
- a task has no Status/Covers line, its checkbox disagrees with its status, or the Summary line is wrong;
- a nested checkbox would be counted as a task;
- a Source path or a relative link does not exist;
- a test cites an unknown requirement ID.

The sdd-spectree page imports the same regexes, so `--verify` proves the page counts what G1 counts.

## G2 — Constitution check
Every `design.md` ends with a table: one row per article, ✅ complies or ⚠️ exception with the reason and the task
that removes it. Exceptions are listed in [constitution-mapping](../steering/constitution-mapping.md).

## G3 — Lint and types
ESLint must pass with no errors, and `npm run typecheck` (`tsc --noEmit` for the app and for server + Vite config) must pass.

## G4 — Tests cite requirements
Each test name starts with the requirement ID it proves (`SRCH-RANK-003 ranks exact name first`). The spec tree
counts a requirement as *tested* when any test cites it.

## G5 — Manual verification
Until G4 covers a criterion, the task records who checked it, when, and how (themes, breakpoints, keyboard).

## G6 — Continuous integration
Runs G1, G3 and G4 on every push once the repository is under git (SEC-T02 → QA-T07).
