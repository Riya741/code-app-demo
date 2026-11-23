---
contract: task-handoff.v1
task: AIB-T06
agent: session
covers: [AIB-GEN-017, AIB-GEN-012, AIB-GEN-019, AIB-API-004]
files_changed: [src/lib/aiBrief.ts, src/hooks/useAiBrief.ts]
tests: [tests/component/AiBrief.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T06 Client fetchers and hooks

## What changed
- **`src/lib/aiBrief.ts`:**
  - `getAiStatus` never throws: any failure counts as AI off (`AI_OFF`, AIB-GEN-019).
  - `startBrief`, `getRun` and `cancelRun`; an error answer becomes `AiRequestError`, carrying the server's catalog
    text or `AI_FAILED`.
  - `subscribeRun` uses EventSource and closes after the final event or a stream error.
  - `shortRunId`.
- **`src/hooks/useAiBrief.ts`:**
  - `useAiStatus`, which is a query with no retry and `staleTime` 30 s.
  - `useStartBrief`, which is a mutation.
  - `useBriefRun(customerId)`. Its state is keyed by the customer, so a change of customer shows `idle` at once, and
    cleanup closes the stream and cancels an unfinished run. It returns `start`, `cancel` and `discard`. Nothing goes
    into the customers query cache.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| AIB-API-004 | "AIB-API-004 the status fetcher treats any failure as AI off" |
| AIB-GEN-017, -012, -019 | Hooks used by the dialog tests ("AIB-GEN-017 …", "AIB-GEN-012 …", "AIB-GEN-019 …"); the UI is AIB-T07 |

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean · G4 29 files passed, 1 skipped; 380 passed, 1 expected fail, 1 skipped.

## Review
**Verdict: pass** (session, 2026-11-23).
- Article IX: only the fetchers call `fetch`.
- Article V: the error texts come from the server catalog or `AI_FAILED`.
