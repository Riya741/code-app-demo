# Tasks — Workbook HTTP API

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 11 tasks — ✅ 9 · 🔄 0 · ⬜ 2 · ⛔ 0

- [x] **API-T01** Vite plugin wiring for dev and preview; JSON responses and error mapping.
  - Status: ✅ Done · Covers: API-GEN-001..004 · Files: `server/workbook.ts`, `vite.config.ts`
- [x] **API-T02** `GET /table/:name` with where/orderBy.
  - Status: ✅ Done · Covers: API-READ-001
- [x] **API-T03** Joined reads for use cases and events; parentId validation.
  - Status: ✅ Done · Covers: API-READ-002..004
- [x] **API-T04** Solution mapping reads and health.
  - Status: ✅ Done · Covers: API-READ-005, API-READ-006
- [x] **API-T05** Use case insert/update with links and status history.
  - Status: ✅ Done · Covers: API-WRITE-001..005, API-WRITE-007
- [x] **API-T06** Event insert/update with links.
  - Status: ✅ Done · Covers: API-WRITE-006, API-WRITE-007
- [x] **API-T07** Soft delete with 404/409.
  - Status: ✅ Done · Covers: API-DEL-001, API-DEL-002
- [ ] **API-T08** Foreign-key and allowed-value validation on writes.
  - Status: ⬜ Not started · Covers: API-WRITE-008
  - Step: FK existence checks
  - Step: Solution ↔ status / type checks
  - Step: Add messages to the messages catalog
- [x] **API-T09** `POST /customers/:id/summary`.
  - Status: ✅ Done · Covers: API-SUMM-001, SUM-EDIT-001 · Unblocks: SUM-T09
  - Verified 2026-11-17 via the agent workflow (implementer subagent, read-only reviewer subagent; hand-off `spec/handoffs/API-T09.md`, verdict pass): `POST /customers/:id/summary` in `server/workbook.ts`; 6 integration tests (`tests/integration/summary.test.ts`). Same work as SUM-T07.
- [x] **API-T10** Restrict exposure (see SEC-T01).
  - Status: ✅ Done · Covers: API-GEN-005 · Done by SEC-T01 (the API is served by the dev/preview server, now localhost-only).
- [ ] **API-T11** Integration tests for every endpoint and error code.
  - Status: ⬜ Not started · Covers: API-GEN-001..005, API-READ-001..006, API-WRITE-001..008, API-DEL-001, API-DEL-002, API-SUMM-001 · Depends on: QA-T03, DATA-T09
