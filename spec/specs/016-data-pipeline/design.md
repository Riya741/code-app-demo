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

## generate_demo_workbook.py (ADR-0006)
```
demo_catalogue.json -> catalogue sheets (fictional names, original ids and rules, solution weights)
random.Random(seed) -> personnel -> per customer: tier -> subsidiaries -> departments -> stakeholders
                    -> use cases (+ personnel, content types, status history) -> events (+ personnel, solutions)
                    -> executive summary built from the customer's own use cases
check(): keys, cascades, date rules, optional real-name scan (--reference) -> save(): README + styled tables
```
The first 8 customers carry the planted edge cases (PIPE-GEN-006), so `--customers 8` is the smallest useful fixture.

## Constitution check
| Article | Compliance |
|---|---|
| II | Produces the single source of truth with documented gaps. ✅ |
| X | Every recovery decision counted and logged; the generator checks integrity before writing. ✅ |
| III | The project's data is fictional (ADR-0006), so nothing real can leave the machine. ✅ |

## Risks
- Scripts have no tests; a changed export layout silently changes counts. Mitigation: PIPE-T05.
