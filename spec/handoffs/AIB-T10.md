---
contract: task-handoff.v1
task: AIB-T10
agent: session
covers: [AIB-GEN-021, AIB-GEN-008, AIB-GEN-015, AIB-HUMAN-010, AIB-GEN-022]
files_changed: [src/hooks/useAiBrief.ts, src/pages/Customers.tsx]
tests: [tests/component/AiBrief.test.tsx, tests/component/Customers.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T10 useAutoBrief

## What changed
`useAutoBrief(customerId, { summaryEmpty, open })` is called from `Customers.tsx`, next to `summaryOpen`.
- **Automatic start:** one run per selection, started when the dialog is open, the summary is empty and the status says
  `enabled && available && auto_draft`.
- **No restart:** reopening the dialog, a refetch or a discard starts nothing new (a `startedFor` ref, reset when the
  selection is cleared).
- **Customer change:** a different customer or a cleared selection cancels the run (`useBriefRun` cleanup).
- **Closing the dialog:** has no effect on the run.
- **Returns** the run plus `ai`, `running` and `draftReady`.

AIB-GEN-015 is the editor path: `CustomerDetails` calls `cancel()` when the editor opens during a run.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| AIB-GEN-021 | "AIB-GEN-021 starts one run when the dialog opens on a customer without a summary; reopening or discarding starts none", "AIB-GEN-021 no automatic run for a customer with a saved summary" |
| AIB-GEN-022 | "AIB-GEN-022 with auto_draft false no automatic run starts, but start() still does" |
| AIB-GEN-008 | "AIB-GEN-008 a customer change or a cleared selection cancels the unfinished run …" |
| AIB-HUMAN-010 | "AIB-HUMAN-010 closing the dialog keeps the run …" and the page test "AIB-HUMAN-010 reopening the dialog after closing it mid-run shows the waiting draft" |
| AIB-GEN-015 | "AIB-GEN-015 opening the editor while a run is in progress cancels the run" |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean · G4 29 files passed, 1 skipped; 380 passed, 1 expected fail, 1 skipped.

## Review
**Verdict: pass** (session, 2026-11-23). The hook is called from the page, not from the dialog content, which is
unmounted when the dialog closes (CONV-004).
