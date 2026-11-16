# Code App Demo

Customer-success workspace: search a parent customer, then view and edit its executive summary, use cases and events.
React 18 + TypeScript + Vite 7; data in an Excel workbook served by a Vite plugin (`server/workbook.ts`).
The specs in `spec/` are the source of truth. Start with [spec/README.md](spec/README.md).

## Commands
| Command | What |
|---|---|
| `npm run dev` | App + API on `localhost:3000` (data: `../data/code-app-data.xlsx`, override with `WORKBOOK_PATH`) |
| `npm run lint` · `npm run typecheck` · `npm test` | Gates G3 and G4 |
| `py spec/scripts/spec_lint.py` | Gate G1: spec format, IDs, links, test titles |
| `py -I scripts/generate_demo_workbook.py <out.xlsx> [--customers 8]` | Fictional data workbook; `--customers 8` is the test fixture |
| `py spectree/build_spectree.py --verify` (from `spectree/`) | Regenerate the spec tree page |

## How every change works
Follow [spec/workflow.md](spec/workflow.md): propose → specify → design → plan → build → verify → close.
1. No behaviour change without a requirement and a task. Set the task to 🔄 before editing code.
2. Requirement IDs are permanent (`PREFIX-AREA-NNN`); tasks are `PREFIX-Tnn`.
3. Every test title starts with the requirement ID it proves: `it("SRCH-RANK-003 ranks …")`. Pin a known gap with `it.fails`.
4. Commit messages start with the task ID: `UCF-T07: save use case edits`. Work on a branch, not `main`.
5. Close: task ✅ `[x]`, requirement status, gap register, Summary line, README dashboard, traceability.
6. If code and spec disagree, one of them is a defect: fix the code or change the spec on purpose, never leave both.

## Done means
`npm run lint` (0 errors), `npm run typecheck`, `npm test` and `py spec/scripts/spec_lint.py` all pass, plus manual
checks for UI changes in light and dark themes, at ≥ 1024px and < 1024px (gate G5), recorded in the task.

## Architecture rules that are easy to break
- Data access goes component → hook (`src/hooks`) → fetcher (`src/lib`) → `/api/workbook`. Components never call `fetch` (Article IX).
- Mutations live in hooks and invalidate the queries they affect.
- Writes are atomic and serialised; use cases and events are soft-deleted, never removed (Article II).
- Sanitise any HTML from data before rendering or exporting; CSV export keeps the formula guard (Article III).
- Every user-facing message is in the [messages catalog](spec/specs/017-design-system/messages-catalog.md) (Article V).
- Colours come from design tokens; both themes must work (Article VI).

## Never
- Commit any `.xlsx` (SEC-SUPPLY-001) or bring real customer data into the project. The workbook is fictional demo
  data (ADR-0006): change it by regenerating it, not by hand. Tests generate their own fixture.
- Commit secrets or `.env*` files.
- Edit `spectree/build_spectree.py` or `spectree/template.html` (generated from the `sdd-spectree` skill).
- Weaken or delete a test to make it pass; change the spec through the workflow instead.

## Windows notes
Run Python as `py -I`. Line endings are LF everywhere (`.gitattributes`). Write regex escapes such as `\u00a0` as
escapes, never as the literal character (lint rejects irregular whitespace).
