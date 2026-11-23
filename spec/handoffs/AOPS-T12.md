---
contract: task-handoff.v1
task: AOPS-T12
agent: session
covers: [AOPS-ROUTE-001, AOPS-ROUTE-002, AOPS-ROUTE-003, AOPS-ROUTE-004, AOPS-ROUTE-005, AOPS-ROUTE-006, AOPS-ROUTE-007, AOPS-ROUTE-008, SEC-SUPPLY-005]
files_changed: [server/ai/config.ts, server/ai/client.ts, server/ai/trace.ts, server/ai/orchestrator.ts, tests/unit/ai-gateway.test.ts, tests/integration/analyst-writer.live.test.ts]
tests: [tests/unit/ai-gateway.test.ts, tests/integration/analyst-writer.live.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AOPS-T12 Gateway mode

## What changed
- **Config:** `AI_GATEWAY` (`none` | `portkey`), `AI_GATEWAY_URL` (https gateway root: no `/v1`, no credentials,
  query or fragment, not anthropic.com), `AI_GATEWAY_MODEL_PREFIX` and `AI_GATEWAY_ALLOW_BULK`. Errors name the
  variable, never the value. The direct route reads none of them. `hasCredentials` checks the selected route's key.
- **Client:** the gateway route builds the SDK with the gateway URL, `apiKey: null` and the Portkey key as
  `authToken`, with the same hardening. It sends `prefix + model`, checks the returned model, and hands back the plain
  ID.
- **Traces:** `route`, `gatewayHost` and `gatewayProvider` on the run span and the `llm_call` spans.
- **Bulk guard:** `gatewayBulkRefusal(config)`, to be wired in EVAL-T04 and AOPS-T10.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| AOPS-ROUTE-001..008, SEC-SUPPLY-005 | `tests/unit/ai-gateway.test.ts`: one titled test per ID (10 tests, fake SDK, no network) |
| AOPS-ROUTE-003, -005 live | `tests/integration/analyst-writer.live.test.ts` run once on 2026-11-23 through `https://portkeygateway.perficient.com` with prefix `@aws-bedrock-use2/us.anthropic.`: passed (Analyst and Writer outputs valid, four sections in order) |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 26 files passed, 1 skipped; 340 passed, 1 expected fail, 1 skipped |

## Open questions
- Retries, fallback or cache in the key's gateway configuration: still unknown (CR Q5); the model check covers a
  model switch.

## Review
**Verdict: pass** (session, 2026-11-23). Settled by the live call:
- the gateway root URL works without `/v1`;
- `Authorization: Bearer` alone is enough.

AOPS-ROUTE-005 has a dated note for the `authToken` choice: with both keys `null`, the SDK would read Anthropic
profiles from disk. The live check counts as this task's live check, by owner request (gateway use minimal).
