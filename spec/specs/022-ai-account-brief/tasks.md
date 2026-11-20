# Tasks — AI Account Brief

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 10 tasks — ✅ 0 · 🔄 0 · ⬜ 10 · ⛔ 0

Build order and dependencies: [024-agent-ops tasks](../024-agent-ops/tasks.md) build the orchestrator these steps run in.

- [ ] **AIB-T01** zod contracts in `server/ai/contracts.ts`, checked against `spec/contracts/*.schema.json` by a test.
  - Status: ⬜ Not started · Covers: AIB-CITE-001, AOPS-ORCH-002 · Files: `server/ai/contracts.ts`, `tests/unit/contracts.test.ts`
- [ ] **AIB-T02** Retriever step: fact sheet with fact IDs, field allow-list, redaction, data wrapping.
  - Status: ⬜ Not started · Covers: AIB-CITE-001, AIB-SAFE-001, AIB-SAFE-003, AIB-FAITH-003 · Files: `server/ai/steps/retriever.ts`
- [ ] **AIB-T03** Analyst, Writer and Critic steps with prompts v1 (headers cite their agent specs).
  - Status: ⬜ Not started · Covers: AIB-CITE-002, AIB-CITE-003, AIB-FAITH-001, AIB-FAITH-002, AIB-FMT-001 · Files: `server/ai/steps/`, `server/ai/prompts/` · Depends on: AOPS-T01
- [ ] **AIB-T04** Guard step: HTML from sentences, citation markers, sanitise, word budget, final schema check.
  - Status: ⬜ Not started · Covers: AIB-SAFE-002, AIB-FMT-002, AIB-CITE-004 · Files: `server/ai/steps/guard.ts`
- [ ] **AIB-T05** Routes `/api/ai/status`, `/brief`, `/runs/:id`, `/runs/:id/events`, `/runs/:id/cancel`.
  - Status: ⬜ Not started · Covers: AIB-API-001..004 · Files: `server/ai/routes.ts`, `server/workbook.ts` · Depends on: AOPS-T01
- [ ] **AIB-T06** Client fetchers and hooks: `getAiStatus`, `startBrief`, `getRun`, `subscribeRun`, `cancelRun`; `useAiStatus`, `useStartBrief`, `useBriefRun`.
  - Status: ⬜ Not started · Covers: AIB-GEN-009, AIB-GEN-012, AIB-GEN-013, AIB-API-004 · Files: `src/lib/aiBrief.ts`, `src/hooks/useAiBrief.ts` · Depends on: AIB-T05 · Covers changed by CR-20261120-1 (was AIB-GEN-001, AIB-GEN-002, now Deprecated)
- [ ] **AIB-T10** `useAutoBrief`: start one run per selection when the customer has no saved summary and AI is available; cancel it on customer change, on clearing the selection and when the user opens the editor.
  - Status: ⬜ Not started · Covers: AIB-GEN-007, AIB-GEN-008, AIB-GEN-015 · Files: `src/hooks/useAiBrief.ts` · Depends on: AIB-T06 · Added by CR-20261120-1 (owner decision D2)
  - Step: Wait for `useAiStatus`; start only if `enabled && available` and the stored summary is empty (SUM-VIEW-003 test); at most once per mount
  - Step: Effect cleanup closes the EventSource and calls `cancelRun` for an unfinished run (the workspace is keyed by customer, LAY-STATE-002)
  - Step: Expose `cancel()` for the editor-open path (AIB-GEN-015)
- [ ] **AIB-T07** UI in the summary band: automatic-run progress, *Regenerate with AI*, cancel, error, breaker, confirm replace, draft view with *Save* / *Edit* / *Discard*, AI-draft and unverified banners, collapsed-header indicator; messages catalog.
  - Status: ⬜ Not started · Covers: AIB-GEN-004, AIB-GEN-009..014, AIB-HUMAN-002..008, AIB-CITE-004 · Files: `src/components/customers/CustomerDetails.tsx`, `src/components/customers/AiDraftBanner.tsx` · Depends on: AIB-T06, AIB-T10, LAY-T09, SUM-T13 · Updated by CR-20261120-1 (was the *Draft with AI* button in the right-hand panel, Covers AIB-GEN-001..006, AIB-HUMAN-001..003; it was ⛔ Blocked by SUM-T09, which is done)
  - Step: Band states as in design "Flows — band states"; *Regenerate with AI* replaces *Draft with AI*
  - Step: *Save* on the draft goes through `useSaveSummary` (SUM-EDIT-001) with the existing pending and error handling
  - Step: G5: both themes, ≥ 1024px and < 1024px, band collapsed and expanded, with AI on, AI off and breaker open

## Test tasks
- [ ] **AIB-T08** Unit and integration tests (replayed model, fixture workbook).
  - Status: ⬜ Not started · Covers: AIB-CITE-001, AIB-CITE-003, AIB-SAFE-002, AIB-SAFE-003, AIB-FMT-002, AIB-API-001..004 · Depends on: QA-T03
- [ ] **AIB-T09** Component tests for every band state, titled with the AIB IDs.
  - Status: ⬜ Not started · Covers: AIB-GEN-004, AIB-GEN-007..015, AIB-HUMAN-002..008 · Depends on: AIB-T07, AIB-T10 · Covers changed by CR-20261120-1 (was AIB-GEN-001..006, AIB-HUMAN-001..003; it was ⛔ Blocked by QA-T02, which is done)
