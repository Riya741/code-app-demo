# Design — Data Pipeline

## build_workbook.py stages
```
load export (openpyxl, data_only)
 ├─ Use cases sheet  → uc_src (int ids)
 ├─ Executive Summary → customers (multi-row rejoin)
 ├─ derive lookups: subsidiaries, departments, stakeholders, solutions, types, statuses, sol↔type
 ├─ Use case History → statuses + history rows
 ├─ personnel / content types / link tables from concat columns
 ├─ Events sheet → 3-layout recovery → events + notes (take() with priority)
 ├─ solution_ids() greedy match, subsidiary backfill
 ├─ table definitions T[name] = (cols, rows)
 └─ write: README (+ stats) then sheets as styled Excel tables
```

## Recovery priority
`take(ev_id, priority, fields)` keeps the lowest priority number per field: 0 clean, 1 end row, 2 start row.

## Event layouts
| Layout | Signature |
|---|---|
| clean | int `[id]`, bool `[deleted]`, parsable `[event_date]`, str `[stage]` |
| start | A int, C int, E str (first note line); fields in F..T when the note is one line |
| end | P int (event id), B date, C int, D str; note lines spilled in column A above |

## Stats
`collections.Counter` named counters, written to README and stdout, e.g. "events dropped (no date or stage)".

## apply_use_case_notes.py
Walks the `use case note` sheet once, building `notes[id] -> lines`, then writes `note` per use case row.

## Constitution check
| Article | Compliance |
|---|---|
| II | Produces the single source of truth with documented gaps. ✅ |
| X | Every recovery decision counted and logged. ✅ |

## Risks
- Scripts have no tests; a changed export layout silently changes counts. Mitigation: PIPE-T05.
