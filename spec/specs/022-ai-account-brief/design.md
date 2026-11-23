# Design — AI Account Brief

## Overview
The browser asks the local server to start a brief run; the server runs a **code-controlled pipeline** of four steps
([ADR-0008](../../adr/0008-orchestration-pattern.md); the Critic was removed by CR-20261121-1) and returns a sanitised, cited draft. Since CR-20261120-1 the
run starts **automatically** when a customer without a saved summary is selected (AIB-GEN-021), or on *Regenerate
with AI* (AIB-GEN-017); since CR-20261120-2 progress and the unsaved draft are shown in the Executive Summary
**dialog** that opens on selection (002 LAY-R7), and the user saves it as is, edits it in the existing `RichTextEditor`
first, or discards it. The run belongs to the customer, not to the dialog: closing the dialog keeps the run going and
the top-bar *Executive summary* button shows its progress or "draft ready" (AIB-HUMAN-010, AIB-HUMAN-011). Saving
uses the summary endpoint from the executive-summary spec (SUM-T07..T10, done). The orchestration, failure handling and traces are specified in
[024-agent-ops](../024-agent-ops/design.md); this design covers the feature, the API and the step contents.

```
Customers.tsx (useAutoBrief) ─► useBriefRun (hook) ─► lib/aiBrief.ts ─► POST /api/ai/brief ─► orchestrator (server/ai)
                                                          ◄─ SSE /api/ai/runs/:id/events (progress)
                                                          ◄─ GET /api/ai/runs/:id  (brief-draft.v1)
Retriever ─fact-sheet.v1─► Analyst ─analyst-to-writer.v1─► Writer ─writer-draft.v1─► Guard ─brief-draft.v1─► UI
   (code)                  (LLM + read-only tools)          (LLM)                   (code: citation checks, HTML)
```

## Components and files
| File | Role |
|---|---|
| `server/ai/routes.ts` | `/api/ai/status`, `/api/ai/brief`, `/api/ai/runs/:id`, `/api/ai/runs/:id/events` (registered by the Vite plugin next to `/api/workbook`) |
| `server/ai/steps/retriever.ts` | Fact sheet from the `Store` read model; fact IDs; allow-list and redaction ([ai-data-policy](../../steering/ai-data-policy.md)) |
| `server/ai/steps/analyst.ts`, `writer.ts` | LLM steps, one per agent spec |
| `server/ai/steps/guard.ts` | Citation checks (AIB-CITE-003; failures make the draft `unverified` with issues), builds HTML from sentences, appends `[UC-…]` markers, sanitises, counts words, final schema check |
| `server/ai/prompts/*.v1.md` | Prompts; each starts with a header citing its agent spec and requirement IDs (lint check 11) |
| `server/ai/contracts.ts` | zod schemas matching `spec/contracts/*.schema.json` |
| `src/lib/aiBrief.ts` | Fetchers: `getAiStatus`, `startBrief`, `getRun`, `subscribeRun` (EventSource) |
| `src/hooks/useAiBrief.ts` | `useAiStatus`, `useStartBrief`, `useBriefRun`, and `useAutoBrief` (automatic start and cancel per selection, AIB-T10); called from `pages/Customers.tsx`, not from the dialog, so a run outlives the dialog content (CONV-004 unmounts closed dialogs) |
| `src/components/customers/CustomerDetails.tsx` | The dialog content: *Regenerate with AI*, progress line, cancel, error, draft view with *Save* / *Edit* / *Discard*, unverified banner, confirm replace; receives the run state as props |
| `src/components/customers/AiDraftBanner.tsx` | "AI draft — not saved" and "Unverified draft" banners and the reopen-button indicator (spinner, "AI draft ready — not saved" badge) |

Agents: [analyst](../../agents/analyst.md) · [writer](../../agents/writer.md). Retriever, Guard and the orchestrator
are code steps without agent specs (CR-20261121-1).

## Interfaces
```ts
// GET /api/ai/status → { enabled: boolean; available: boolean; reason?: "disabled" | "breaker_open" | "no_credentials";
//                       auto_draft: boolean }  // false on the gateway route (AIB-GEN-022, CR-20261123-1)
// POST /api/ai/brief { customerId: number } → 202 { runId: string } | 404 | 503
// GET /api/ai/runs/:id → { runId, status: "running" | "succeeded" | "unverified" | "failed" | "cancelled",
//                          step?: StepName, revision?: number, draft?: BriefDraftV1, error?: string }
// GET /api/ai/runs/:id/events → text/event-stream; data: { step, revision, status } … final { status }
// POST /api/ai/runs/:id/cancel → 204

type StepName = "retrieve" | "analyse" | "write" | "guard";
```
Contracts: [fact-sheet.v1](../../contracts/fact-sheet.v1.schema.json) ·
[analyst-to-writer.v1](../../contracts/analyst-to-writer.v1.schema.json) ·
[writer-draft.v1](../../contracts/writer-draft.v1.schema.json) ·
[brief-draft.v1](../../contracts/brief-draft.v1.schema.json).

## Data and state
- **No workbook change.** The run reads through the existing `Store`; the draft is saved by the summary endpoint.
- Run state and checkpoints live in `../data/ai-runs/` (outside the repo; AOPS-REC-001).
- Client: the run ID and step are component state; `useBriefRun` keeps the EventSource open until the final event, then
  fetches the run once. No AI data goes into the TanStack cache for customers.

## Flows — dialog states (CR-20261120-1, revised by CR-20261120-2)
```
customer selected ─► summary dialog opens (LAY-DLG-001, any AI setting); the run state below belongs to the customer
  ├─ AI not enabled ─────────────────────────► plain summary (spec 003), no AI UI, no button indicator (AIB-GEN-019)
  ├─ breaker open ───────────────────────────► summary or empty state; Regenerate disabled+tooltip   (AIB-GEN-012)
  ├─ saved summary ──────────────────────────► view(stored) + [Regenerate with AI]                   (AIB-GEN-017)
  └─ no saved summary, AI available ─auto────► running                                               (AIB-GEN-021)

view ──Regenerate (confirm if editor dirty, AIB-GEN-011)──► running(step, revision)                  (AIB-GEN-018)
running ──succeeded──► draft(view, "AI draft — not saved", [Save] [Edit] [Discard])                   (AIB-HUMAN-009)
        ──unverified─► draft(view, + Unverified banner and failed checks)                             (AIB-HUMAN-012)
        ──failed─────► view(stored or empty) + "Could not draft the summary: … (run abc123)" [Try again] (AIB-GEN-004)
        ──Cancel / user opens the editor (AIB-GEN-015)──► view(stored or empty) / editing(stored)
draft ──Save──► SUM-EDIT-001 path with the draft HTML (pending, toast, error keeps the draft; success closes the dialog, LAY-DLG-009)  (AIB-HUMAN-005)
draft ──Edit / click / Enter──► editing(draft, "AI draft — not saved") ──Save──► SUM-EDIT-001 path  (AIB-HUMAN-006)
                                                                     └─Cancel──► view(stored)       (AIB-HUMAN-003)
draft ──Discard──► view(stored or empty); nothing written                                           (AIB-HUMAN-007)
dialog ──closed (× / Esc / overlay; confirm first if the editor is dirty, LAY-DLG-007)──► run and draft keep going/waiting (AIB-HUMAN-010)
button ──shows spinner while running, "AI draft ready — not saved" while a draft waits               (AIB-HUMAN-011)
any state ──customer changes or selection cleared──► run cancelled, draft dropped, no confirm          (AIB-GEN-008, AIB-HUMAN-007)
```

**Where the state lives.** The dialog content is unmounted whenever the dialog is closed (CONV-004), but a run and its
unsaved draft must survive that (AIB-HUMAN-010). `useAutoBrief(customerKey, row)` is therefore called from
`pages/Customers.tsx`, next to the `summaryOpen` state of 002's design, and hands `{ status, step, revision, draft,
error, start, cancel, discard }` to the dialog content and `{ running, draftReady }` to the reopen button. The customer
key resets it. Nothing about AI is in `SummaryDialog`'s own logic, which is why the dialog is complete with AI off
(AIB-GEN-019, Article XII.8).

**Automatic start, once per selection (AIB-GEN-021, `useAutoBrief`).** A selection is the user action that also opens
the dialog (002 design: the selection handler, never an effect on the row). The hook waits for `useAiStatus` to
resolve, then starts one run if `enabled && available && auto_draft` (`auto_draft` is false on the gateway route,
AIB-GEN-022) and the stored summary is empty (the same emptiness test as
SUM-VIEW-003). It starts at most once per customer key per selection: a refetch of the customer row, closing and
reopening the dialog, a Discard, a Cancel or a failure does not start another (*Regenerate with AI* or *Try again* does).
Selecting the same customer again later is a new selection and, if it still has no saved summary and no run or draft is
already there, drafts again (owner decision: auto-draft whenever there is no saved summary).

**Cancel on customer change (AIB-GEN-008).** The hook's effect cleanup, run when the customer key changes or the
selection is cleared, closes the EventSource and calls `POST /api/ai/runs/:id/cancel` for a run that has not finished;
AOPS-REC-002 aborts in-flight model calls. Because the state is keyed by the customer, no progress, draft or error can
leak into the next customer. Closing the dialog is **not** a cleanup trigger: the hook is not mounted by the dialog.

**Unsaved draft and customer change (AIB-HUMAN-007).** The waiting draft is dropped when the customer changes, with no
confirmation. The modal dialog makes the top bar inert while it is open, so anything the user has typed is still in the
editor, which cannot be left without the discard confirm of LAY-DLG-007; what is dropped later is only an AI draft
nobody has edited, which costs at most one run to recreate (AOPS-BUDG-001). Choosing *Discard* in that confirm while
editing an AI draft closes the dialog; the unedited draft keeps waiting.

**Opening the editor during a run (AIB-GEN-015).** Click/Enter on the summary in the dialog while running cancels the
run first, then opens the editor on the stored summary, so a finishing run never overwrites typing. Closing the dialog
during a run does **not** cancel it (AIB-HUMAN-010).

**Grids stay usable (AIB-GEN-020).** A run never opens the dialog by itself after the automatic open at selection, and
never moves focus: a run that finishes while the dialog is closed only updates the button's indicator and a polite
live region. The only modals are the dialog itself, which the user can close at any time, and the AIB-GEN-011 and
LAY-DLG-007 confirms, which user actions open.

**Reopen-button indicator (AIB-HUMAN-011).** A spinner (`aria-hidden`) while running; a small dot badge while a draft
waits, with the title and accessible description "AI draft ready — not saved"; an `aria-live="polite"` region next to
the button announces "AI draft ready — not saved" once when a run finishes while the dialog is closed. Failure has no
indicator (out of scope): the message appears in the dialog when it is reopened.

**Export** exports the stored summary only (SUM-WORD-001); an unsaved draft is never exported.

**Why sentences, not HTML, from the Writer.** The Writer returns plain-text sentences, each with its fact IDs; the
Guard builds the HTML. Citation checks then work per sentence (AIB-CITE-002, -003), and no model text is ever inserted
as markup (AIB-SAFE-002).

**Injection defence (AIB-SAFE-001).** The Retriever redacts and caps every free-text field (notes in `text`, plus `value_snippet`, event `stage` and lookup names) and sends the whole fact sheet as one escaped `<fact_sheet>` data block that a note cannot close,
and the prompts state that fact-sheet text is data. There is no Critic (CR-20261121-1), so a followed injection is caught
by the eval grader (EVAL-CODE-005, `injection_followed`), not at run time. Eval category "prompt injection in notes" measures it.

## Error handling
| Failure | User sees | Message catalog |
|---|---|---|
| Run failed (any step, after retries) | Inline error in the dialog with *Try again*; grids unaffected; if the dialog was closed, the message shows when it is reopened | "Could not draft the summary: <reason> (run <id>)" |
| Unverified (Guard's citation checks failed) | Draft in the dialog + banner listing the failed checks | "Unverified draft: check the points below before saving" |
| AI disabled | The dialog opens as the plain summary; no automatic run, no AI action, no button indicator | — |
| Gateway route (AIB-GEN-022) | The dialog opens; no automatic run; *Regenerate with AI* works as usual | — |
| Breaker open | The dialog opens; no automatic run; *Regenerate with AI* disabled + tooltip | "AI is temporarily unavailable. Try again in a few minutes." |
| Unsaved edits on Regenerate | Confirm dialog | "Replace your unsaved changes with an AI draft?" |
| Closing the dialog with unsaved edits | Confirm dialog (002, LAY-DLG-007) | "Discard your unsaved summary changes?" |
| Cancelled, customer changed, editor opened during a run | Returns to view, no message | — |
| Dialog closed during a run or with a draft waiting | Nothing is cancelled or dropped; the button shows the state | — |
| Saving the draft fails | Draft kept, as for a summary edit; the dialog stays open | "Could not save: <message>" |

## Testing approach
- **Unit:** Retriever fact IDs, allow-list and redaction (AIB-CITE-001, AIB-SAFE-003); Guard HTML building and
  sanitising (AIB-SAFE-002, AIB-FMT-002); citation checker (AIB-CITE-003).
- **Integration:** routes against the fixture workbook with a **recorded model** (`AI_MODEL_MODE=replay`), so tests
  never call the API (AIB-API-001..004).
- **Component:** automatic start only without a saved summary, once per selection (not again on reopen or refetch),
  cancel on customer change and on opening the editor but **not** on closing the dialog, *Regenerate with AI*
  visibility, busy, cancel, error, breaker, AI off (dialog still opens, no indicator), draft *Save* / *Edit* /
  *Discard*, unverified banner, confirm replace, waiting draft shown on reopen, reopen-button indicator and live
  announcement (AIB-GEN-004, AIB-GEN-008, AIB-GEN-011, AIB-GEN-012, AIB-GEN-015, AIB-GEN-017..021, AIB-HUMAN-003, AIB-HUMAN-012,
  AIB-HUMAN-005..007, AIB-HUMAN-009..011), with the AI fetchers stubbed at `fetch` and EventSource.
- **Evaluation:** deterministic graders: citation validity and coverage, hallucinated entities, numbers, injection (023-ai-evaluation) for AIB-CITE-002, AIB-FAITH-001..003, AIB-SAFE-001.

## Alternatives considered
- **Browser calls the model directly:** rejected; exposes the key and breaks Article IX.
- **One prompt, no pipeline:** simplest, but no place to verify citations or retry a bad section.
- **A Critic step with up to two revisions (CR-20261117-1):** removed by CR-20261121-1 to cut tokens per run; the
  Guard's deterministic citation checks keep Article XII.5, and the eval measures quality per model (EVAL-EXP-006).
- **Autonomous agent loop:** rejected in [ADR-0008](../../adr/0008-orchestration-pattern.md).
- **A *Draft with AI* button (CR-20261117-1):** replaced by the owner on 2026-11-20 (CR-20261120-1) with an automatic
  draft for customers without a summary and *Regenerate with AI* for the rest. Cost: one run per such selection
  (≤ the AOPS-BUDG-001 budget each, cut short by cancel on customer change).
- **Opening the draft straight in the editor (old AIB-HUMAN-001):** replaced by a read-only draft view in the dialog, so
  a user who ignores the draft is never left in an edit mode they did not open.
- **A summary band above the grids (CR-20261120-1, AIB-GEN-007 and friends):** replaced by the owner on 2026-11-20 with a
  dialog over full-width grids (CR-20261120-2); never built.
- **Cancel the run when the dialog closes:** simpler (the run would live and die with the dialog content) but a user
  who dismisses the auto-opened dialog to reach the grids would silently lose the draft the system just paid for;
  rejected as the proposed default (CR-20261120-2 open question d).
- **Confirm before dropping an unsaved AI draft on customer change:** rejected as the proposed default: user-typed
  text cannot be lost this way (LAY-DLG-007), so the confirm would only guard an untouched machine draft
  (CR-20261120-2 open question e).

## Constitution check
| Article | Compliance |
|---|---|
| I Spec first | Specified before any code (CR-20261117-1); trigger and draft display re-specified by CR-20261120-1 with the replaced IDs Deprecated. ✅ |
| II Workbook is truth | No agent writes; the automatic run only drafts; the user saves through SUM-EDIT-001. ✅ |
| III Safe by default | HTML built by code and sanitised; data allow-list and redaction. ✅ |
| IV Valid by construction | Contracts validate every hand-off. ✅ |
| V Clear feedback | Progress, error with retry, unverified, empty (AIB-FAITH-003), "AI draft — not saved" label, reopen-button indicator; messages catalogued. ✅ |
| VI Theme & responsive | Dialog content, banners and the button indicator use tokens; checked in both themes and widths, dialog open and closed (G5). ✅ |
| VII Accessible | *Regenerate with AI*, *Cancel*, *Save* / *Edit* / *Discard* keyboard-operable with names; progress in an `aria-live` region; no focus is moved by a run, and a finished draft is announced politely (AIB-HUMAN-011). ✅ |
| VIII Simple & local-first | Optional; with AI off the dialog is the plain summary (AIB-GEN-019, XII.8). ✅ |
| IX Layered architecture | component → hook → `lib/aiBrief.ts` → `/api/ai`. ✅ |
| X Testable & traceable | Unit/integration with replayed model, plus eval metrics per requirement. ✅ |
| XI Performance budget | Editor stays lazy; run budget 60 s wall clock (AOPS-BUDG-001). ✅ |
| XII AI agents & data | Agent specs, contracts, draft-only (an automatic run never saves, XII.3), policy (the old summary is still not sent, ai-data-policy), citations, eval, traces. ✅ |

**Exceptions:** none.
