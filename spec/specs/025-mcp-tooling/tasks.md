# Tasks — MCP Tooling (`workbook-mcp`)

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 6 tasks — ✅ 2 · 🔄 0 · ⬜ 3 · ⛔ 1

- [x] **MCP-T01** Server scaffold, `.mcp.json`, controls wrapper (validation, allow-list, caps, audit).
  - Status: ✅ Done · Covers: MCP-SRV-001, MCP-SEC-001, MCP-SEC-003, MCP-SEC-007, MCP-AUD-001, MCP-AUD-002 · Files: `mcp/workbook-mcp/`, `.mcp.json`
  - Verified 2026-11-24: `createServer` + `withControls` + `PathGuard` + `AuditLog` in `mcp/workbook-mcp/src/`, stdio entry `main.ts` registered in `.mcp.json`; 19 tests in `tests/mcp/{guard,server}.test.ts` (junction escape, `..`, oversize string, unknown fields, unknown tool, audit without values, real stdio start from `.mcp.json`); no tools registered yet (MCP-T02..T04); G1, G3, G4 pass; G5 n/a (no UI) ([hand-off](../../handoffs/MCP-T01.md)).
- [ ] **MCP-T02** Data tools over `server/ai/tools.ts` with redaction.
  - Status: ⛔ Blocked by AOPS-T02 (shared tools) · Covers: MCP-SRV-002, MCP-SRV-004, MCP-SEC-005, MCP-SEC-006
- [x] **MCP-T03** Spec tools, resources, prompt; `run_spec_lint` via `execFile`.
  - Status: ✅ Done · Covers: MCP-SRV-003, MCP-SRV-005, MCP-SEC-004 · Files: `mcp/workbook-mcp/src/specTools.ts`
  - Verified 2026-11-24: 4 spec tools, 2 resources (plus template) and the `draft-account-brief` prompt registered in `createServer`; 15 tests in `tests/mcp/specTools.test.ts` on a fixture spec set and the real one (range and cross-spec Covers, gap rows, trace, `execFile` with fixed argv and `shell: false`, shell metacharacters refused before running, real lint run, hostile resource URIs and prompt arguments refused and audited); G1, G3, G4 pass; G5 n/a (no UI) ([hand-off](../../handoffs/MCP-T03.md)).
- [ ] **MCP-T04** Change-request tool behind `MCP_ALLOW_WRITE`.
  - Status: ⬜ Not started · Covers: MCP-SRV-006, MCP-SEC-002

## Test tasks
- [ ] **MCP-T05** Tool tests and hostile-input tests per control.
  - Status: ⬜ Not started · Covers: MCP-TEST-001 · Depends on: MCP-T01
- [ ] **MCP-T06** MCP Inspector and Claude Code session evidence.
  - Status: ⬜ Not started · Covers: MCP-TEST-002 · Depends on: MCP-T03
