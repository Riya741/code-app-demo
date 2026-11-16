# Steering: Structure and Conventions

## Repository layout
```
code-app-demo/
├─ index.html                 page shell, title "Code App Demo"
├─ vite.config.ts             dev/preview server, @ alias, workbook plugin
├─ server/workbook.ts         workbook API + storage engine
├─ scripts/                   Python workbook build/repair tools
├─ src/
│  ├─ main.tsx, App.tsx       bootstrap, providers (theme, query, tooltip, toaster)
│  ├─ pages/Customers.tsx     the single screen
│  ├─ components/customers/   feature components
│  ├─ components/ui/          vendored shadcn primitives
│  ├─ hooks/                  TanStack Query hooks, useMediaQuery
│  ├─ lib/                    API client, fetchers, types, csv, wordDoc, html, utils
│  └─ index.css               tokens, base styles, Quill and scrollbar styles
├─ spec/                      this specification set
└─ spectree/                  sdd-spectree page: config, generator, dist/sdd-explorer.html
../data/                      code-app-data.xlsx (database: fictional demo data from scripts/generate_demo_workbook.py)
```

## Spec layout
```
spec/
├─ constitution.md            principles (Articles I–XI)
├─ workflow.md                how a change moves from idea to done
├─ steering/                  product, tech, structure, glossary, constitution mapping
├─ adr/                       0001-…, one decision per file
├─ specs/NNN-<spec-name>/
│  ├─ requirements.md         user stories + one '#### PREFIX-AREA-NNN: title' block per EARS criterion
│  ├─ design.md               architecture, data, interfaces, error handling, constitution check
│  └─ tasks.md                implementation tasks with status and Covers
├─ gates/                     validation gates, gap register
├─ scripts/spec_lint.py       G1 gate: format, IDs, links, task counts
├─ templates/                 requirements / design / tasks / change-request / ADR templates
├─ traceability.md            spec ↔ source files, shared tasks
└─ id-migration.md            old → new requirement IDs (2026-11-11)
```

## Naming
| Item | Convention |
|---|---|
| Spec folder | `NNN-kebab-noun`: `005-use-case-form`; numbers are never reused |
| User story | `<PREFIX>-R<n>` (`### SRCH-R2 — Match and rank`) |
| Requirement | `<PREFIX>-<AREA>-<nnn>`: PREFIX 2–5 chars (the spec's), AREA 2–6 letters (the story's), nnn per area from 001; heading `#### SRCH-RANK-003: Rank matches` |
| Requirement status | `- **Status:**` ✅ Implemented · ⚠️ Partial · ❌ Gap · 📝 Planned · Deprecated, optional `— note` |
| Requirement source | `- **Source:**` backticked repo paths of the implementing files |
| Task | `<PREFIX>-T<nn>`; next line `  - Status: <emoji> <status> · Covers: <requirement IDs> · Files: …` |
| Task steps | `  - Step: …` (never nested checkboxes) |
| ADR | `adr/NNNN-kebab-title.md`, H1 `ADR-NNNN: Title`, referenced as `ADR-NNNN` |
| Components | PascalCase file = component name |
| Hooks | `useXxx.ts` |
| Workbook columns | snake_case; event POST payload keys PascalCase (legacy) |

Ranges are written `SRCH-RANK-001..004` (same area only).

## Code conventions
| ID | Convention |
|---|---|
| CONV-001 | Feature components in `src/components/customers/`; do not edit `src/components/ui/` for feature work. |
| CONV-002 | Server access only through `src/lib` fetchers (Article IX). |
| CONV-003 | One hook per query/mutation; mutations invalidate affected keys. |
| CONV-004 | Dialogs are mounted only while open. |
| CONV-005 | Pick-list values are `string[]`; convert to numbers when building payloads. |
| CONV-006 | HTML from data → `sanitizeHtml` before `dangerouslySetInnerHTML`. |
| CONV-007 | Comments explain *why*. |
| CONV-008 | Conditional classes via `cn()`. |
| CONV-009 | Dates before year 2000 are placeholders and shown as empty. |
| CONV-010 | Imports use the `@/` alias. |
| CONV-011 | Commit messages reference requirement or task IDs (e.g. `UCF-T08: save edits`). |
