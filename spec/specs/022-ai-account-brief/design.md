# Design — AI Account Brief

## Overview
The browser asks the local server to start a brief run; the server runs a **code-controlled pipeline** of five steps
([ADR-0008](../../adr/0008-orchestration-pattern.md)) and returns a sanitised, cited draft. Since CR-20261120-1 the
run starts **automatically** when a customer without a saved summary is selected (AIB-GEN-007), or on *Regenerate
with AI* (AIB-GEN-009); progress and the unsaved draft are shown in the Executive Summary **band** above the grids
(002 LAY-R6), and the user saves it as is, edits it in the existing `RichTextEditor` first, or discards it. Saving
uses the summary endpoint from the executive-summary spec (SUM-T07..T10, done). The orchestration, failure handling and traces are specified in
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
| `src/hooks/useAiBrief.ts` | `useAiStatus`, `useStartBrief`, `useBriefRun`, and `useAutoBrief` (automatic start and cancel per selection, AIB-T10) |
| `src/components/customers/CustomerDetails.tsx` | The band: *Regenerate with AI*, progress line, cancel, error, draft view with *Save* / *Edit* / *Discard*, unverified banner, confirm replace, collapsed-header indicator |
| `src/components/customers/AiDraftBanner.tsx` | "AI draft — not saved" and "Unverified draft" banners and the collapsed-header badge |

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

## Flows — band states (CR-20261120-1)
```
customer selected (workspace mounts, keyed by customer — LAY-STATE-002)
  ├─ AI not enabled ─────────────────────────► plain summary band (spec 003), no AI UI            (AIB-GEN-013)
  ├─ breaker open ───────────────────────────► summary or empty state; Regenerate disabled+tooltip (AIB-GEN-012)
  ├─ saved summary ──────────────────────────► view(stored) + [Regenerate with AI]                (AIB-GEN-009)
  └─ no saved summary, AI available ─auto────► running                                            (AIB-GEN-007)

view ──Regenerate (confirm if editor dirty, AIB-GEN-011)──► running(step, revision)               (AIB-GEN-010)
running ──succeeded──► draft(view, "AI draft — not saved", [Save] [Edit] [Discard])                (AIB-HUMAN-004)
        ──unverified─► draft(view, + Unverified banner and issues)                                 (AIB-HUMAN-002)
        ──failed─────► view(stored or empty) + "Could not draft the summary: … (run abc123)" [Try again] (AIB-GEN-004)
        ──Cancel / user opens the editor (AIB-GEN-015)──► view(stored or empty) / editing(stored)
draft ──Save──► SUM-EDIT-001 path with the draft HTML (pending, toast, error keeps the draft)       (AIB-HUMAN-005)
draft ──Edit / click / Enter──► editing(draft, "AI draft — not saved") ──Save──► SUM-EDIT-001 path  (AIB-HUMAN-006)
                                                                     └─Cancel──► view(stored)       (AIB-HUMAN-003)
draft ──Discard──► view(stored or empty); nothing written                                         (AIB-HUMAN-007)
any state ──customer changes or selection cleared──► workspace unmounts: run cancelled, draft dropped (AIB-GEN-008, AIB-HUMAN-007)
```

**Automatic start, once per selection (AIB-GEN-007, `useAutoBrief`).** The hook lives inside the customer-keyed
workspace, so a new selection is a new mount. It waits for `useAiStatus` to resolve, then starts one run if
`enabled && available` and the stored summary is empty (the same emptiness test as SUM-VIEW-003). It starts at most
once per mount: a later refetch of the customer row, a Discard, a Cancel or a failure does not start another
(*Regenerate with AI* or *Try again* does). Selecting the same customer again later is a new selection and, if it still
has no saved summary, drafts again (owner decision: auto-draft whenever there is no saved summary).

**Cancel on customer change (AIB-GEN-008).** The hook's effect cleanup closes the EventSource and calls
`POST /api/ai/runs/:id/cancel` for a run that has not finished; AOPS-REC-002 aborts in-flight model calls. Because the
state is component state inside the keyed workspace, no progress, draft or error can leak into the next customer.

**Opening the editor during a run (AIB-GEN-015).** Click/Enter on the band while running cancels the run first, then
opens the editor on the stored summary, so a finishing run never overwrites typing.

**Grids stay usable (AIB-GEN-014).** Nothing AI-related is modal; the only dialog is the AIB-GEN-011 confirm, which a
user action opens. The band's height cap (LAY-BAND-004) keeps the draft from pushing the grids off screen.

**Collapsed band (AIB-HUMAN-008).** The band body stays mounted when collapsed (002 design), so a run continues; the
header shows the step text or the "AI draft — not saved" badge and the band does not expand by itself.

**Export** exports the stored summary only (SUM-WORD-001); an unsaved draft is never exported.

**Why sentences, not HTML, from the Writer.** The Writer returns plain-text sentences, each with its fact IDs; the
Guard builds the HTML. Citation checks then work per sentence (AIB-CITE-002, -003), and no model text is ever inserted
as markup (AIB-SAFE-002).

**Injection defence (AIB-SAFE-001).** The Retriever puts every free-text field inside the fact sheet's `text` fields,
the prompts state that fact-sheet text is data, and the Critic flags any sentence that follows an instruction from data
(`injection_followed`). Eval category "prompt injection in notes" measures it.

## Error handling
| Failure | User sees | Message catalog |
|---|---|---|
| Run failed (any step, after retries) | Inline error in the band with *Try again*; grids unaffected | "Could not draft the summary: <reason> (run <id>)" |
| Unverified after 2 revisions | Draft in the band + banner listing issues | "Unverified draft: check the points below before saving" |
| AI disabled | No automatic run, no AI action | — |
| Breaker open | No automatic run; *Regenerate with AI* disabled + tooltip | "AI is temporarily unavailable. Try again in a few minutes." |
| Unsaved edits on Regenerate | Confirm dialog | "Replace your unsaved changes with an AI draft?" |
| Cancelled, customer changed, editor opened during a run | Returns to view, no message | — |
| Saving the draft fails | Draft kept, as for a summary edit | "Could not save: <message>" |

## Testing approach
- **Unit:** Retriever fact IDs, allow-list and redaction (AIB-CITE-001, AIB-SAFE-003); Guard HTML building and
  sanitising (AIB-SAFE-002, AIB-FMT-002); citation checker (AIB-CITE-003).
- **Integration:** routes against the fixture workbook with a **recorded model** (`AI_MODEL_MODE=replay`), so tests
  never call the API (AIB-API-001..004).
- **Component:** automatic start only without a saved summary, once per selection, cancel on customer change and on
  opening the editor, *Regenerate with AI* visibility, busy, cancel, error, breaker, AI off, draft *Save* / *Edit* /
  *Discard*, unverified banner, confirm replace, collapsed-header indicator (AIB-GEN-004, AIB-GEN-007..015,
  AIB-HUMAN-002..008), with the AI fetchers stubbed at `fetch` and EventSource.
- **Evaluation:** faithfulness, coverage, citation validity, injection (023-ai-evaluation) for AIB-CITE-002, AIB-FAITH-001..003, AIB-SAFE-001.

## Alternatives considered
- **Browser calls the model directly:** rejected; exposes the key and breaks Article IX.
- **One prompt, no pipeline:** simplest, but no place to verify citations or retry a bad section; kept as the
  *critic off* baseline in the eval (EVAL-EXP-001).
- **Autonomous agent loop:** rejected in [ADR-0008](../../adr/0008-orchestration-pattern.md).
- **A *Draft with AI* button (CR-20261117-1):** replaced by the owner on 2026-11-20 (CR-20261120-1) with an automatic
  draft for customers without a summary and *Regenerate with AI* for the rest. Cost: one run per such selection
  (≤ the AOPS-BUDG-001 budget each, cut short by cancel on customer change).
- **Opening the draft straight in the editor (old AIB-HUMAN-001):** replaced by a read-only draft view in the band, so
  a user who ignores the draft is never left in an edit mode they did not open.

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Specified before any code (CR-20261117-1); trigger and draft display re-specified by CR-20261120-1 with the replaced IDs Deprecated. ✅ |
| II Workbook is truth | No agent writes; the automatic run only drafts; the user saves through SUM-EDIT-001. ✅ |
| III Safe by default | HTML built by code and sanitised; data allow-list and redaction. ✅ |
| IV Valid by construction | Contracts validate every hand-off. ✅ |
| V Clear feedback | Progress, error with retry, unverified, empty (AIB-FAITH-003), "AI draft — not saved" label, collapsed badge; messages catalogued. ✅ |
| VI Theme & responsive | Band, banners and badge use tokens; checked in both themes and widths, collapsed and expanded (G5). ✅ |
| VII Accessible | *Regenerate with AI*, *Cancel*, *Save* / *Edit* / *Discard* keyboard-operable with names; progress in an `aria-live` region; no focus is moved by an automatic run. ✅ |
| VIII Simple & local-first | Optional; with AI off the band is the plain summary (AIB-GEN-013, XII.8). ✅ |
| IX Layered architecture | component → hook → `lib/aiBrief.ts` → `/api/ai`. ✅ |
| X Testable & traceable | Unit/integration with replayed model, plus eval metrics per requirement. ✅ |
| XI Performance budget | Editor stays lazy; run budget 60 s wall clock (AOPS-BUDG-001). ✅ |
| XII AI agents & data | Agent specs, contracts, draft-only (an automatic run never saves, XII.3), policy (the old summary is still not sent, ai-data-policy), citations, eval, traces. ✅ |

**Exceptions:** none.
