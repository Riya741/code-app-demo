---
contract: task-handoff.v1
task: UCP-T08
agent: session
covers: [UCP-GRID-004, DT-TIME-003]
files_changed: [src/lib/dates.ts, src/components/customers/ParentActivity.tsx]
tests: [tests/unit/dates.test.ts, tests/component/ParentActivity.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: human
---
# Hand-off: UCP-T08 Show launch dates on the stored calendar day in all time zones

Shared work, delivered once: UCP-T08 (launch dates), EVP-T07 (event dates, EVP-GRID-003) and PERF-T03 (one helper
everywhere a date-only value is shown). Traceability §3 lists all three for `src/lib/dates.ts`.

## What changed
New `src/lib/dates.ts`:
- `parseDay` reads the first 10 characters (`YYYY-MM-DD`) as a local calendar day. Impossible days and values before
  2000 count as empty.
- `isoDay` gives the day for sorting and filtering.
- `formatDay` shows a short date in the user's locale.

`ParentActivity.tsx` drops its own `validDate`, `fmtDate` and `isoDay`. Before, they read the value as an instant
(UTC midnight), which showed one day early west of UTC. The helper is now used for:
- the Launch Date column;
- the Event Date column;
- the event delete confirmation.

No other date-only value is displayed. `fmtUtc` (summary timestamps, shown in UTC) and the export file name
(DT-TIME-004) are already correct and unchanged.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| UCP-GRID-004 | `tests/component/ParentActivity.test.tsx`: "UCP-GRID-004 shows Launch Date as a short date on the stored day; a pre-2000 placeholder is empty" (TZ America/Los_Angeles) |
| EVP-GRID-003 (EVP-T07) | same file: "EVP-GRID-003 shows Event Date on the stored day, in the grid and in the delete confirmation" |
| DT-TIME-003 | `tests/unit/dates.test.ts`: "DT-TIME-003 shows the stored calendar day in %s" for UTC−10 to UTC+14, plus the empty/invalid, sorting and "old instant-based reading is a day early" tests |

Both component tests failed against the previous `ParentActivity.tsx`; all 10 pass now.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | passed |
| G5 | manual, owner | pass (2026-11-24): the Use Cases and Events grids and the event delete dialog, light and dark, ≥ 1024px and < 1024px; dates as before, e.g. "Nov 11, 2026" (optional: with the OS time zone set to America/Los_Angeles, the stored day is shown) |

## Open questions
- None.

## Review
Session review, 2026-11-24, code and tests: pass.
- **UCP-GRID-004, EVP-GRID-003, DT-TIME-003:** the stored day is shown in every zone tested; sort and filter still use
  `YYYY-MM-DD`; pre-2000 values are empty.
- **CLAUDE.md data access:** unchanged (a pure formatting helper in `src/lib`).
- **Article VI:** no colour change.

Owner G5, 2026-11-24: pass. Verdict `pass`.
