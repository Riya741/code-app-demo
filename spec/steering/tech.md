# Steering: Technology

## Stack
| Concern | Choice |
|---|---|
| Language | TypeScript ^5.5 |
| UI | React 18 (StrictMode), single page |
| Build / dev server | Vite 7 + `@vitejs/plugin-react-swc` |
| Styling | Tailwind CSS 3, `tailwindcss-animate`, `@tailwindcss/typography` |
| Primitives | shadcn/ui (Radix), `cmdk`, `lucide-react` |
| Server state | `@tanstack/react-query` 5 |
| Tables | `@tanstack/react-table` 8 |
| Layout | `react-resizable-panels` |
| Theme | `next-themes` (class strategy) |
| Toasts | `sonner` |
| Rich text | `quill` 2 (lazy) + `dompurify` |
| Workbook I/O (server) | `exceljs` + `jszip` |
| Lint | ESLint 9 flat config, `typescript-eslint`, `react-hooks`, `react-refresh` |
| Tests | Vitest 5 + jsdom (`tests/unit/`) |
| Data scripts | Python 3 + `openpyxl`, run with `python -I` |

## Runtime topology
Browser SPA → `/api/workbook/*` → Vite plugin `local-workbook` (`server/workbook.ts`) → `../data/code-app-data.xlsx`.
The API exists only under `npm run dev` / `npm run preview` (ADR-0002).

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with API on `localhost:3000` only; opt in to other interfaces with env `HOST` (e.g. `HOST=0.0.0.0`) |
| `npm run build` / `build:dev` | Production / development build to `dist/` |
| `npm run preview` | Serve `dist/` with API (`localhost` only, same `HOST` opt-in) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` for the app and tests, and for server + Vite/Vitest config |
| `npm test` / `npm run test:watch` | Vitest unit tests (jsdom); every test title starts with a requirement ID |
| `python -I scripts/generate_demo_workbook.py ../data/code-app-data.xlsx` | Generate the workbook with fictional demo data (`--customers`, `--seed`); catalogue in `scripts/demo_catalogue.json` |
| `python -I scripts/build_workbook.py <src> <dst>` | Build workbook from a Power BI export (no export is kept in the project) |
| `python -I scripts/apply_use_case_notes.py <xlsx> [out]` | Fill use case notes |

## Configuration
| Setting | Value |
|---|---|
| Workbook path | `../data/code-app-data.xlsx`, override with env `WORKBOOK_PATH` |
| Query defaults | `refetchOnWindowFocus: false`, `retry: 1` |
| Lookup cache | 10 min (`LOOKUP_STALE`) |
| Theme | default light, no system theme |
| Panel memory | `autoSaveId="terra-split-h-v3"` |
| TS | app `strict: false`; `vite.config.ts` + `server/` `strict: true` |

## Technical constraints
- No database server; the workbook is rewritten on every change (ADR-0001).
- No authentication; local single-user use only.
- Browser targets: current Chrome, Edge, Firefox, Safari (ES2020).
- Node version must satisfy Vite 7 (20.19+ / 22.12+).

## Approved decisions
[ADR-0001](../adr/0001-excel-workbook-as-data-store.md) ·
[ADR-0002](../adr/0002-api-as-vite-plugin.md) ·
[ADR-0003](../adr/0003-soft-delete.md) ·
[ADR-0004](../adr/0004-client-side-search.md) ·
[ADR-0005](../adr/0005-tanstack-query.md)
