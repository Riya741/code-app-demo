# Design — AI Account Brief

## Overview
The browser asks the local server to start a brief run; the server runs a **code-controlled pipeline** of five steps
([ADR-0008](../../adr/0008-orchestration-pattern.md)) and returns a sanitised, cited draft. The UI opens the draft in the
existing `RichTextEditor`; saving uses the summary endpoint from the executive-summary spec (SUM-T07..T10), which is
therefore a prerequisite. The orchestration, failure handling and traces are specified in
[024-agent-ops](../024-agent-ops/design.md); this design covers the feature, the API and the step contents.

```
CustomerDetails ─► useBriefRun (hook) ─► lib/aiBrief.ts ─► POST /api/ai/brief ─► orchestrator (server/ai)
                                                          ◄─ SSE /api/ai/runs/:id/events (progress)
                                                          ◄─ GET /api/ai/runs/:id  (brief-draft.v1)
Retriever ─fact-sheet.v1─► Analyst ─analyst-to-writer.v1─► Writer ─writer-to-critic.v1─► Critic ─critic-verdict.v1─►
   (code)                  (LLM + read-only tools)          (LLM)    ◄── issues, ≤ 2 revisions ──┘ (code + LLM)
                                                                                     Guard (code) ─brief-draft.v1─► UI
```

## Components and files
| File | Role |
|---|---|
| `server/ai/routes.ts` | `/api/ai/status`, `/api/ai/brief`, `/api/ai/runs/:id`, `/api/ai/runs/:id/events` (registered by the Vite plugin next to `/api/workbook`) |
| `server/ai/steps/retriever.ts` | Fact sheet from the `Store` read model; fact IDs; allow-list and redaction ([ai-data-policy](../../steering/ai-data-policy.md)) |
| `server/ai/steps/analyst.ts`, `writer.ts`, `critic.ts` | LLM steps, one per agent spec |
| `server/ai/steps/guard.ts` | Builds HTML from sentences, appends `[UC-…]` markers, sanitises, counts words, final schema check |
| `server/ai/prompts/*.v1.md` | Prompts; each starts with a header citing its agent spec and requirement IDs (lint check 11) |
| `server/ai/contracts.ts` | zod schemas matching `spec/contracts/*.schema.json` |
| `src/lib/aiBrief.ts` | Fetchers: `getAiStatus`, `startBrief`, `getRun`, `subscribeRun` (EventSource) |
| `src/hooks/useAiBrief.ts` | `useAiStatus`, `useStartBrief`, `useBriefRun` |
| `src/components/customers/CustomerDetails.tsx` | Button, progress line, cancel, error, unverified banner, confirm replace |
| `src/components/customers/AiDraftBanner.tsx` | "AI draft, not saved" and "Unverified draft" banners |

Agents: [orchestrator](../../agents/orchestrator.md) · [retriever](../../agents/retriever.md) ·
[analyst](../../agents/analyst.md) · [writer](../../agents/writer.md) · [critic](../../agents/critic.md) ·
[guard](../../agents/guard.md).

## Interfaces
```ts
// GET /api/ai/status → { enabled: boolean; available: boolean; reason?: "disabled" | "breaker_open" | "no_credentials" }
// POST /api/ai/brief { customerId: number } → 202 { runId: string } | 404 | 503
// GET /api/ai/runs/:id → { runId, status: "running" | "succeeded" | "unverified" | "failed" | "cancelled",
//                          step?: StepName, revision?: number, draft?: BriefDraftV1, error?: string }
// GET /api/ai/runs/:id/events → text/event-stream; data: { step, revision, status } … final { status }
// POST /api/ai/runs/:id/cancel → 204

type StepName = "retrieve" | "analyse" | "write" | "critique" | "guard";
```
Contracts: [fact-sheet.v1](../../contracts/fact-sheet.v1.schema.json) ·
[analyst-to-writer.v1](../../contracts/analyst-to-writer.v1.schema.json) ·
[writer-to-critic.v1](../../contracts/writer-to-critic.v1.schema.json) ·
[critic-verdict.v1](../../contracts/critic-verdict.v1.schema.json) ·
[brief-draft.v1](../../contracts/brief-draft.v1.schema.json).

## Data and state
- **No workbook change.** The run reads through the existing `Store`; the draft is saved by the summary endpoint.
- Run state and checkpoints live in `../data/ai-runs/` (outside the repo; AOPS-REC-001).
- Client: the run ID and step are component state; `useBriefRun` keeps the EventSource open until the final event, then
  fetches the run once. No AI data goes into the TanStack cache for customers.

## Flows
```
idle ──click (confirm if dirty)──► running(step, revision) ──succeeded──► editing(draft, "AI draft, not saved")
  ▲                                   │  └─unverified──► editing(draft, Unverified banner + issues)
  │                                   ├─failed──► idle + error "Could not draft the summary: … (run abc123)"
  └───────────── cancel ◄─────────────┘
editing ──Save──► SUM-EDIT-001 path · editing ──Cancel──► view (stored summary)
```

**Why sentences, not HTML, from the Writer.** The Writer returns plain-text sentences, each with its fact IDs; the
Guard builds the HTML. Citation checks then work per sentence (AIB-CITE-002, -003), and no model text is ever inserted
as markup (AIB-SAFE-002).

**Injection defence (AIB-SAFE-001).** The Retriever puts every free-text field inside the fact sheet's `text` fields,
the prompts state that fact-sheet text is data, and the Critic flags any sentence that follows an instruction from data
(`injection_followed`). Eval category "prompt injection in notes" measures it.

## Error handling
| Failure | User sees | Message catalog |
|---|---|---|
| Run failed (any step, after retries) | Inline error under the header with *Try again* | "Could not draft the summary: <reason> (run <id>)" |
| Unverified after 2 revisions | Draft + banner listing issues | "Unverified draft: check the points below before saving" |
| AI disabled | No button | — |
| Breaker open | Disabled button + tooltip | "AI is temporarily unavailable. Try again in a few minutes." |
| Unsaved edits | Confirm dialog | "Replace your unsaved changes with an AI draft?" |
| Cancelled | Returns to view, no message | — |

## Testing approach
- **Unit:** Retriever fact IDs, allow-list and redaction (AIB-CITE-001, AIB-SAFE-003); Guard HTML building and
  sanitising (AIB-SAFE-002, AIB-FMT-002); citation checker (AIB-CITE-003).
- **Integration:** routes against the fixture workbook with a **recorded model** (`AI_MODEL_MODE=replay`), so tests
  never call the API (AIB-API-001..004).
- **Component:** button visibility, busy, cancel, error, unverified banner, confirm replace (AIB-GEN-001..006, AIB-HUMAN-001..003).
- **Evaluation:** faithfulness, coverage, citation validity, injection (023-ai-evaluation) for AIB-CITE-002, AIB-FAITH-001..003, AIB-SAFE-001.

## Alternatives considered
- **Browser calls the model directly:** rejected; exposes the key and breaks Article IX.
- **One prompt, no pipeline:** simplest, but no place to verify citations or retry a bad section; kept as the
  *critic off* baseline in the eval (EVAL-EXP-001).
- **Autonomous agent loop:** rejected in [ADR-0008](../../adr/0008-orchestration-pattern.md).

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Specified before any code (CR-20261117-1). ✅ |
| II Workbook is truth | No agent writes; the user saves through SUM-EDIT-001. ✅ |
| III Safe by default | HTML built by code and sanitised; data allow-list and redaction. ✅ |
| IV Valid by construction | Contracts validate every hand-off. ✅ |
| V Clear feedback | Progress, error with retry, unverified, empty (AIB-FAITH-003); messages catalogued. ✅ |
| VI Theme & responsive | Banners use tokens; checked in both themes and widths (G5). ✅ |
| VII Accessible | Button and Cancel keyboard-operable; progress in an `aria-live` region. ✅ |
| VIII Simple & local-first | Optional; with AI off the app is unchanged (XII.8). ✅ |
| IX Layered architecture | component → hook → `lib/aiBrief.ts` → `/api/ai`. ✅ |
| X Testable & traceable | Unit/integration with replayed model, plus eval metrics per requirement. ✅ |
| XI Performance budget | Editor stays lazy; run budget 60 s wall clock (AOPS-BUDG-001). ✅ |
| XII AI agents & data | Agent specs, contracts, draft-only, policy, citations, eval, traces. ✅ |

**Exceptions:** none.
