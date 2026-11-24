---
contract: task-handoff.v1
task: API-T08
agent: session
covers: [API-WRITE-008]
files_changed: [server/workbook.ts, spec/specs/017-design-system/messages-catalog.md]
tests: [tests/integration/workbook-api.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: API-T08 Foreign-key and allowed-value validation on writes

## What changed
The API now rejects, with 400 and before any change to the file:
- a use case or event save whose references name no row in their sheet: every single id, plus the personnel,
  content type and solution lists;
- a use case whose status, or use case type when one is given, is not allowed for its solution
  (`solution_status`, `solution_use_case_type`).

The messages are "Unknown <field>: <value>", "Status <id> is not allowed for solution <id>." and "Use case type <id> is
not allowed for solution <id>.", added to the messages catalog. Empty optional references are still accepted. Server
only, so G5 is n/a.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| API-WRITE-008 | `tests/integration/workbook-api.test.ts`: "API-WRITE-008 rejects a use case whose single references name no row, with 400 and the field, file unchanged" |
| API-WRITE-008 | same file: "API-WRITE-008 rejects a use case whose personnel or content type lists hold an unknown id" |
| API-WRITE-008 | same file: "API-WRITE-008 rejects a status or use case type not allowed for the solution, and accepts an allowed pair" (removes the pairs from the test's temp copy, since the fixture may allow every pair, DATA-QUAL-003) |
| API-WRITE-008 | same file: "API-WRITE-008 rejects an event whose subsidiary, event type, contributors or solutions name no row" |
| API-WRITE-008 | same file: "API-WRITE-008 accepts saves whose references all exist, including optional ones left empty" |

The four rejection tests failed against the previous `server/workbook.ts`; all five pass now.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | passed |

## Open questions
- **Alternate keys (DATA-LINK-006, DATA-T04):** references are checked against each sheet's `id`, the agreed key.
  The use case form's `detectKey` could send the alternate `subsidiary_id` / `department_id` key. In the generated
  workbook the two are always equal, so the app is unaffected. A workbook where they differ would now get a 400,
  which matches DATA-LINK-006; DATA-T04 removes `detectKey`.
- **List parsing:** a non-numeric token in a list field (for example `personnel_ids: "abc"`) is still dropped by the
  existing `ids()` parser rather than refused. Single fields refuse it ("Unknown solution_id: abc").
- **Ownership:** that the subsidiary belongs to the customer, or the department to the subsidiary, is not checked.
  No requirement asks for it.

## Review
**Verdict: pass** (session, 2026-11-24). API-WRITE-008: unknown ids and disallowed status/type values get 400, checked
before any mutation inside the storage queue, so the file stays unchanged (Article II, tests compare file hashes).
Article IV (validation) is now ✅ in the design's Constitution check. Article V: the three messages are in the catalog.
CLAUDE.md data-access rule: unchanged (server only).
