---
contract: task-handoff.v1
task: AIB-T05
agent: session
covers: [AIB-API-001, AIB-API-002, AIB-API-003, AIB-API-004, AIB-GEN-022]
files_changed: [server/ai/routes.ts, server/workbook.ts, tests/integration/harness.ts, tests/integration/ai-routes.test.ts, tests/integration/orchestrator.test.ts]
tests: [tests/integration/ai-routes.test.ts, tests/integration/orchestrator.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T05 AI routes

## What changed
- **`server/ai/routes.ts`:** `createAiRoutes` serves:
  - `GET /status`: `{ enabled, available, reason?, auto_draft }`, where `auto_draft` is true only on the direct route;
  - `POST /brief`: returns 202, 400, 404 or 503;
  - `GET /runs/:id`: returns the status, the step, and the draft once the run ends `succeeded` or `unverified`;
  - `GET /runs/:id/events`: SSE with the full event history, then live events, ending after the final `{ status }`;
  - `POST /runs/:id/cancel`: returns 204.

  Runs are kept in memory, newest 50. The config and client are built on the first AI request. Run error codes map
  to catalog reasons (`errorReason`), and no raw error text is ever returned.
- **`server/workbook.ts`:** `workbookPlugin(file, { ai? })` mounts `/api/ai` beside `/api/workbook` on the same file.
- **Test harness:** supports both mounts, SSE bodies, and `reopen(options)` for a plugin with other AI settings.
- **Messages catalog §5:** new rows for the route texts and the reasons.
- **022 design:** the interface now includes the 400 response and the cancel route.

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| AIB-API-001 | `tests/integration/ai-routes.test.ts`: "AIB-API-001 returns 202 with a run ID, 404 … and 503 'AI is not enabled' …" |
| AIB-API-002 | "AIB-API-002 streams one event per step change and a final event with the outcome" |
| AIB-API-003 | "AIB-API-003 returns the status and, once finished, the brief-draft.v1 draft …", "AIB-API-003 a failed run returns a catalog reason, never the raw error text" |
| AIB-API-004 | "AIB-API-004 returns enabled and available without calling the model" |
| AIB-GEN-022 | "AIB-GEN-022 reports auto_draft false on the gateway route …", "AIB-GEN-022 on the gateway route a run still starts on the user's request" |

Also covered on the way:
- AOPS-REC-002: the cancel test.
- AOPS-FAIL-007: the existing test now also reads `/api/ai/status` from a fresh plugin, with AI off and with a broken setting.

**Manual smoke check (2026-11-23).** `npm`/`vite` dev server with `AI_ENABLED=true AI_MODEL_MODE=replay`, so no model
client is built and nothing goes over the network:
- the status came back, a run started, and the events streamed;
- the run failed at analyse with `model_unavailable`, after `loadPrompt` had loaded the prompt. This confirms that
  `import.meta.url` works under the Vite config bundle (the open question from AIB-T03);
- the reason shown was "AI is unavailable right now".

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 28 files passed, 1 skipped; 355 passed, 1 expected fail, 1 skipped |

## Open questions
- Runs are lost on server restart; checkpoints and resume are AOPS-T05.

## Review
**Verdict: pass** (session, 2026-11-23).
- Article V: every route text is a catalog row.
- Article IX: the client fetchers are AIB-T06.
- AOPS-OBS-002: the console gets the run line and the config errors, which name variables only.
