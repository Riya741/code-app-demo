---
contract: task-handoff.v1
task: AIB-T09
agent: session
covers: [AIB-GEN-004, AIB-GEN-008, AIB-GEN-011, AIB-GEN-012, AIB-GEN-015, AIB-GEN-017, AIB-GEN-018, AIB-GEN-019, AIB-GEN-020, AIB-GEN-021, AIB-HUMAN-012, AIB-HUMAN-003, AIB-HUMAN-005, AIB-HUMAN-006, AIB-HUMAN-007, AIB-HUMAN-009, AIB-HUMAN-010, AIB-HUMAN-011]
files_changed: [tests/component/AiBrief.test.tsx, tests/component/Customers.test.tsx]
tests: [tests/component/AiBrief.test.tsx, tests/component/Customers.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T09 Component tests for the dialog states (slim)

## What changed
The test set is slim, by owner request (competency scope, 2026-11-23): at least one titled test per Covers ID.
- **Dialog states:** `tests/component/AiBrief.test.tsx` renders `CustomerDetails` with a controller object in the
  hook's shape.
- **Hooks:** they run against `fetch` and EventSource stand-ins.
- **Page:** `tests/component/Customers.test.tsx` gets 3 tests: the reopen-button indicator and announcement, no reopen
  or focus move when a run ends, and the waiting draft on reopen.

## Criteria → evidence
| Requirement | Test titles start with |
|---|---|
| AIB-GEN-004 | "AIB-GEN-004 a failed run shows the reason …", "AIB-GEN-004 a run that fails comes back with the server's catalog reason" |
| AIB-GEN-008 | "AIB-GEN-008 a customer change or a cleared selection …" |
| AIB-GEN-011 | "AIB-GEN-011 Regenerate with unsaved edits asks first …" |
| AIB-GEN-012 | "AIB-GEN-012 while the breaker is open …" |
| AIB-GEN-015 | "AIB-GEN-015 opening the editor while a run is in progress cancels the run" |
| AIB-GEN-017 | "AIB-GEN-017 shows Regenerate with AI …" |
| AIB-GEN-018 | "AIB-GEN-018 while running shows the step in a live region …" |
| AIB-GEN-019 | "AIB-GEN-019 without AI, or with AI off, …" plus the existing page and dialog tests, all with AI off |
| AIB-GEN-020 | "AIB-GEN-020 a run that finishes while the dialog is closed does not reopen it …" |
| AIB-GEN-021 | "AIB-GEN-021 the automatic run on an empty summary …", "AIB-GEN-021 starts one run …", "AIB-GEN-021 no automatic run …" |
| AIB-HUMAN-003, -005, -006, -007, -009, -012 | One test each, titled with the ID |
| AIB-HUMAN-010 | Hook test and page test |
| AIB-HUMAN-011 | "AIB-HUMAN-011 the reopen button shows the run and then the waiting draft …" |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean · G4 29 files passed, 1 skipped; 380 passed, 1 expected fail, 1 skipped.

## Review
**Verdict: pass** (session, 2026-11-23). No existing test was changed or weakened; the page tests only added a
describe block.
