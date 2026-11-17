# Tasks — AI Account Brief

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 9 tasks — ✅ 0 · 🔄 0 · ⬜ 7 · ⛔ 2

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
- [ ] **AIB-T06** Client fetchers and hooks.
  - Status: ⬜ Not started · Covers: AIB-GEN-001, AIB-GEN-002 · Files: `src/lib/aiBrief.ts`, `src/hooks/useAiBrief.ts` · Depends on: AIB-T05
- [ ] **AIB-T07** UI: button, progress, cancel, error, confirm replace, AI-draft and unverified banners; messages catalog.
  - Status: ⛔ Blocked by SUM-T09 (an accepted draft must be savable) · Covers: AIB-GEN-001..006, AIB-HUMAN-001..003, AIB-CITE-004 · Files: `src/components/customers/CustomerDetails.tsx`, `src/components/customers/AiDraftBanner.tsx`

## Test tasks
- [ ] **AIB-T08** Unit and integration tests (replayed model, fixture workbook).
  - Status: ⬜ Not started · Covers: AIB-CITE-001, AIB-CITE-003, AIB-SAFE-002, AIB-SAFE-003, AIB-FMT-002, AIB-API-001..004 · Depends on: QA-T03
- [ ] **AIB-T09** Component tests for every UI state.
  - Status: ⛔ Blocked by QA-T02 · Covers: AIB-GEN-001..006, AIB-HUMAN-001..003
