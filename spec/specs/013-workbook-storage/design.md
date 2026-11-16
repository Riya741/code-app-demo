# Design — Workbook Storage Engine

## Overview
`class Store` in `server/workbook.ts`.

```
Store
  sheets: Map<name, { cols: string[], rows: Row[] }>
  readme: string[]
  loaded: boolean; mtimeMs: number; file: string
  fresh()  → stat; load() if !loaded or mtime changed
  load()   → JSZip fix table rels → ExcelJS load → sheets/readme
  save()   → ExcelJS new workbook → README + tables → tmp → rename → mtime
  table(name) → sheet or HttpError 404
```

## Types
`Cell = string | number | boolean | null`, `Row = Record<string, Cell>`, `HttpError(status, message)`.

## Normalise / clean
| Function | Rule |
|---|---|
| `norm(v)` | null → null; Date → `toISOString().slice(0,19)`; `{result}` → norm(result); `{richText}` → joined text; `{text}` → text; object → String; `""` → null |
| `clean(v)` | non-string → as-is; strip `[\x00-\x08\x0b\x0c\x0e-\x1f]`; truncate 32,000 |

## Concurrency
```ts
let queue = Promise.resolve();
exclusive(fn) { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; }
```
Each HTTP request runs `fresh()` + handler inside `exclusive`.

## Failure handling
- Save errors: remove tmp, `loaded = false`; lock codes → 423.
- Any non-GET handler error → `loaded = false` (drops half-applied changes).

## Planned design — STO-SAVE-010 backups
Before `renameSync`, copy the current file to `../data/backups/<name>-<yyyymmdd-HHMMss>.xlsx`; keep the newest 10.
Backup failure logs a warning but does not fail the save.

## Scaling
Full rewrite on every change — fine for thousands of rows; revisit above ~50k rows (ADR-0001).

## Constitution check
| Article | Compliance |
|---|---|
| II | Atomic writes, serial queue, reload on external change. ✅ (no backups ⚠️) |
| VIII | No database server. ✅ |
| XI | In-memory reads; scaling limit documented. ✅ |
