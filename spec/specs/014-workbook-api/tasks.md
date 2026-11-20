# Tasks — Workbook HTTP API

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 14 tasks — ✅ 10 · 🔄 0 · ⬜ 4 · ⛔ 0

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
- [ ] **API-T12** Refuse updates to soft-deleted use cases and events (409, like `softDelete`), so an edit saved in one tab cannot bring back a row deleted in another.
  - Status: ⬜ Not started · Covers: API-WRITE-001, API-WRITE-006 · Files: `server/workbook.ts` · Found 2026-11-18 in the EVF-T06 review. Needs a new requirement through /spec-change first.
- [x] **API-T13** Resolve Article II.4 vs API-WRITE-004 (link rows replaced on edit). Owner decision 2026-11-20 (D1): amend Article II.4 so that an edit updates the record in place and replaces that record's own link rows; soft delete unchanged. Spec-only: constitution v1.1.1, exception rows removed from steering/constitution-mapping.md §3 and the 005/008 designs; no code change (the server already does this).
  - Status: ✅ Done · Covers: API-WRITE-004 · Files: `spec/constitution.md`, `spec/steering/constitution-mapping.md`, `spec/specs/005-use-case-form/design.md`, `spec/specs/008-event-form/design.md` · Edited on branch `cr-owner-decisions-summary-band` by CR-20261120-1; Closed 2026-11-20 when the owner approved that CR. Verification: G1 only (no code).
- [ ] **API-T14** Reject a summary POST without a string `executive_summary` (400, summary and file unchanged); an explicit empty string still clears it.
  - Status: ⬜ Not started · Covers: API-SUMM-002 · Files: `server/workbook.ts`, `tests/integration/summary.test.ts` · Owner decision D3, CR-20261120-1
  - Step: Add the presence and type checks in `saveSummary` (design: "Planned design — API-SUMM-002"); do not reuse `required()`
  - Step: Integration tests titled `API-SUMM-002 …`: body `{}` → 400 `Missing: executive_summary`; `{ executive_summary: 5 }` and `{ executive_summary: null }` → 400 `executive_summary must be a string.`; in each case the re-read file still holds the old summary and timestamp; `{ executive_summary: "" }` → 200, summary null
  - Step: Messages catalog: mark the new 400 text as implemented
