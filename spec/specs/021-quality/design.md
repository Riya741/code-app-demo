# Design — Quality, Testing and Definition of Done

## Test pyramid
| Level | Tool | Targets |
|---|---|---|
| Unit | Vitest + jsdom | `score`, `detectKey`, `exportCsv`/`exportFileName`, `htmlToText`, `sanitizeHtml`, `fmtUtc`, `formatDay`, `commaList`, `statusPill`; server helpers `num`, `text`, `bool`, `ids`, `nextId`, `norm`, `clean`, `filterRows` |
| Server integration | Vitest (node env) + fixture workbook | every endpoint, error code, atomic save, mtime reload, 423 |
| Component | Testing Library | SearchBox, DataGrid, UseCaseForm, UseCaseBulkForm, EventForm, ConfirmDelete |
| E2E | Playwright + `@axe-core/playwright` | search → add use case; clone to all departments; add/delete event; exports; a11y scans |

## Layout
```
tests/
  fixtures/mini.xlsx
  unit/…            *.test.ts
  server/…          *.test.ts   (environment: node)
  component/…       *.test.tsx
e2e/…               *.spec.ts
```

## Scripts
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"typecheck": "tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit"
```

## Strict TypeScript migration
Enable `strictNullChecks` first, fix per folder (`lib` → `hooks` → `components`), then `strict: true`.

## Manual smoke test (until E2E exists)
1. `npm run dev`; search by name and by parent ID; open via keyboard.
2. Check counts/tallies; sort and filter both grids; clear filters.
3. Add a use case (verify cascades); confirm in Excel.
4. Clone to every department of another subsidiary.
5. Add and delete an event; confirm `deleted = TRUE` in Excel.
6. Export both grids and the summary.
7. Open the workbook in Excel and save from the app → lock message.
8. Repeat a visual pass in dark mode and at < 1024px.

## Constitution check
| Article | Compliance |
|---|---|
| I | Process in place. ✅ |
| X | No automated tests yet. ⚠️ Exit plan: QA-T01..T05 |
