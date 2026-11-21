# Tasks — AI Account Brief

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 2 · 🔄 0 · ⬜ 8 · ⛔ 0

Build order and dependencies: [024-agent-ops tasks](../024-agent-ops/tasks.md) build the orchestrator these steps run in.

- [x] **AIB-T01** zod contracts in `server/ai/contracts.ts`, checked against `spec/contracts/*.schema.json` by a test.
  - Status: ✅ Done · Covers: AIB-CITE-001, AOPS-ORCH-002 · Files: `server/ai/contracts.ts`, `tests/unit/contracts.test.ts`
  - Verified 2026-11-20: 21 tests in `tests/unit/contracts.test.ts` compare each zod schema with its JSON Schema (structure and accept/reject behaviour); G1, G3, G4 (full suite: 18 files, 198 passed + 1 expected fail) pass; review pass ([hand-off](../../handoffs/AIB-T01.md)). Both requirements stay ⚠️ Partial: fact IDs from the workbook `id` come with AIB-T02, orchestrator validation with AOPS-T01.
- [x] **AIB-T02** Retriever step: fact sheet with fact IDs, field allow-list, redaction, data wrapping.
  - Status: ✅ Done · Covers: AIB-CITE-001, AIB-SAFE-001, AIB-SAFE-003, AIB-FAITH-003 · Files: `server/ai/steps/retriever.ts`, `server/ai/tools.ts` (redaction, field builders), `tests/integration/retriever.test.ts`, `tests/unit/redaction.test.ts`, `tests/integration/tools.test.ts` (one AOPS-ORCH-005 test for the `result_too_large` backstop, from the AOPS-T02 review)
  - Verified 2026-11-21: 18 retriever, 27 redaction and 16 tools tests (fact IDs from the workbook `id`, allow-listed fields only, every string field redacted and capped with an exact tally, planted instructions only inside the escaped data block, sparse and empty customers, output valid against fact-sheet.v1, workbook byte-identical, linear-time patterns on 32 767-character cells); G1, G3, G4 (full suite: 24 files, 300 passed + 1 expected fail; the one failure in that run (a hard-coded agent version after the retriever spec bump) fixed and re-run) pass; review failed once (event `stage` and lookup names sent unredacted), passed on the second round ([hand-off](../../handoffs/AIB-T02.md)). Retriever agent spec bumped to 1.0.1.
- [ ] **AIB-T03** Analyst and Writer steps with prompts v1 (headers cite their agent specs).
  - Status: ⬜ Not started · Covers: AIB-CITE-002, AIB-FAITH-001, AIB-FAITH-002, AIB-FMT-001 · Files: `server/ai/steps/`, `server/ai/prompts/` · Depends on: AOPS-T01 · Re-scoped by CR-20261121-1 (no Critic; citation checks moved to AIB-T04)
- [ ] **AIB-T04** Guard step: citation checks that set `unverified` with issues, HTML from sentences, citation markers, sanitise, word budget, final schema check.
  - Status: ⬜ Not started · Covers: AIB-SAFE-002, AIB-FMT-002, AIB-CITE-004, AIB-CITE-003 · Files: `server/ai/steps/guard.ts` · Citation checks added by CR-20261121-1 (were the Critic's)
- [ ] **AIB-T05** Routes `/api/ai/status`, `/brief`, `/runs/:id`, `/runs/:id/events`, `/runs/:id/cancel`.
  - Status: ⬜ Not started · Covers: AIB-API-001..004 · Files: `server/ai/routes.ts`, `server/workbook.ts` · Depends on: AOPS-T01
  - Step: before any failed run is shown, add messages-catalog reasons for the orchestrator's run error codes (`invalid_output`, `tool_denied`, `model_error`, `step_failed`, `steps_missing`, `not_found` → a generic drafting failure with the run ID; `model_unavailable`, `workbook_unavailable` → AI unavailable); the route maps codes to catalog texts and never returns raw error text (Article V, AOPS-T01 review).
  - Step: make the AOPS-FAIL-007 "other APIs unchanged" test meaningful once the AI routes are registered (AOPS-T01 review).
- [ ] **AIB-T06** Client fetchers and hooks: `getAiStatus`, `startBrief`, `getRun`, `subscribeRun`, `cancelRun`; `useAiStatus`, `useStartBrief`, `useBriefRun`.
  - Status: ⬜ Not started · Covers: AIB-GEN-017, AIB-GEN-012, AIB-GEN-019, AIB-API-004 · Files: `src/lib/aiBrief.ts`, `src/hooks/useAiBrief.ts` · Depends on: AIB-T05 · Covers changed by CR-20261120-1 (was AIB-GEN-001, AIB-GEN-002, now Deprecated) and CR-20261120-2 (AIB-GEN-009 → AIB-GEN-017, AIB-GEN-013 → AIB-GEN-019)
- [ ] **AIB-T10** `useAutoBrief`: start one run per selection when the customer has no saved summary and AI is available; the run belongs to the customer, so cancel it on customer change, on clearing the selection and when the user opens the editor, but not when the dialog closes.
  - Status: ⬜ Not started · Covers: AIB-GEN-021, AIB-GEN-008, AIB-GEN-015, AIB-HUMAN-010 · Files: `src/hooks/useAiBrief.ts`, `src/pages/Customers.tsx` · Depends on: AIB-T06, LAY-T11 · Added by CR-20261120-1 (owner decision D2); re-scoped by CR-20261120-2 (was Covers AIB-GEN-007, AIB-GEN-008, AIB-GEN-015; keyed by the customer, not by the band); AIB-GEN-016 → AIB-GEN-021 by CR-20261121-1
  - Step: Call the hook from `Customers.tsx` beside `summaryOpen` (not from the dialog content, which is unmounted when closed, CONV-004); key its state by the customer so a customer change resets it
  - Step: Wait for `useAiStatus`; start only if `enabled && available` and the stored summary is empty (SUM-VIEW-003 test); at most once per selection; closing and reopening the dialog or a row refetch must not start another run
  - Step: Effect cleanup on customer change or cleared selection closes the EventSource and calls `cancelRun` for an unfinished run; closing the dialog must not run it
  - Step: Expose `{ status, step, revision, draft, error, start, cancel, discard }` and `{ running, draftReady }` for the reopen button; `cancel()` also serves the editor-open path (AIB-GEN-015)
- [ ] **AIB-T07** UI in the summary dialog and on the reopen button: automatic-run progress, *Regenerate with AI*, cancel, error, breaker, confirm replace, draft view with *Save* / *Edit* / *Discard*, AI-draft and unverified banners, progress and "draft ready" indicator with a polite live announcement; messages catalog.
  - Status: ⬜ Not started · Covers: AIB-GEN-004, AIB-GEN-011, AIB-GEN-012, AIB-GEN-017, AIB-GEN-018, AIB-GEN-019, AIB-GEN-020, AIB-HUMAN-012, AIB-HUMAN-003, AIB-HUMAN-005, AIB-HUMAN-006, AIB-HUMAN-007, AIB-HUMAN-009, AIB-HUMAN-010, AIB-HUMAN-011, AIB-CITE-004 · Files: `src/components/customers/CustomerDetails.tsx`, `src/components/customers/AiDraftBanner.tsx`, `src/pages/Customers.tsx` · Depends on: AIB-T06, AIB-T10, LAY-T11, LAY-T12, SUM-T13 · Updated by CR-20261120-1 (was the *Draft with AI* button in the right-hand panel; it was ⛔ Blocked by SUM-T09, which is done) and re-scoped by CR-20261120-2 (the band becomes the dialog; the collapsed-header badge becomes the reopen-button indicator)
  - Step: Dialog states as in design "Flows — dialog states"; *Regenerate with AI* replaces *Draft with AI*; opening the dialog while a draft waits shows the draft
  - Step: *Save* on the draft goes through `useSaveSummary` (SUM-EDIT-001) with the existing pending and error handling; success closes the dialog (LAY-DLG-009)
  - Step: Reopen button: spinner while running, "AI draft ready — not saved" badge while a draft waits, `aria-live="polite"` announcement when a run finishes while the dialog is closed, no focus move (AIB-HUMAN-011, AIB-GEN-020)
  - Step: G5: both themes, ≥ 1024px and < 1024px, dialog open and closed, with AI on, AI off and breaker open; close the dialog mid-run and reopen it

## Test tasks
- [ ] **AIB-T08** Unit and integration tests (replayed model, fixture workbook).
  - Status: ⬜ Not started · Covers: AIB-CITE-001, AIB-CITE-003, AIB-SAFE-002, AIB-SAFE-003, AIB-FMT-002, AIB-API-001..004 · Depends on: QA-T03
- [ ] **AIB-T09** Component tests for every dialog state, titled with the AIB IDs.
  - Status: ⬜ Not started · Covers: AIB-GEN-004, AIB-GEN-008, AIB-GEN-011, AIB-GEN-012, AIB-GEN-015, AIB-GEN-017..021, AIB-HUMAN-012, AIB-HUMAN-003, AIB-HUMAN-005..007, AIB-HUMAN-009..011 · Depends on: AIB-T07, AIB-T10 · Covers changed by CR-20261120-1 (was AIB-GEN-001..006, AIB-HUMAN-001..003; it was ⛔ Blocked by QA-T02, which is done) and CR-20261120-2 (band IDs → dialog IDs)
