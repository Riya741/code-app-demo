# Tasks — MCP Tooling (`workbook-mcp`)

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 6 tasks — ✅ 0 · 🔄 0 · ⬜ 5 · ⛔ 1

- [ ] **MCP-T01** Server scaffold, `.mcp.json`, controls wrapper (validation, allow-list, caps, audit).
  - Status: ⬜ Not started · Covers: MCP-SRV-001, MCP-SEC-001, MCP-SEC-003, MCP-SEC-007, MCP-AUD-001, MCP-AUD-002 · Files: `mcp/workbook-mcp/`, `.mcp.json`
- [ ] **MCP-T02** Data tools over `server/ai/tools.ts` with redaction.
  - Status: ⛔ Blocked by AOPS-T02 (shared tools) · Covers: MCP-SRV-002, MCP-SRV-004, MCP-SEC-005, MCP-SEC-006
- [ ] **MCP-T03** Spec tools, resources, prompt; `run_spec_lint` via `execFile`.
  - Status: ⬜ Not started · Covers: MCP-SRV-003, MCP-SRV-005, MCP-SEC-004 · Files: `mcp/workbook-mcp/src/specTools.ts`
- [ ] **MCP-T04** Change-request tool behind `MCP_ALLOW_WRITE`.
  - Status: ⬜ Not started · Covers: MCP-SRV-006, MCP-SEC-002

## Test tasks
- [ ] **MCP-T05** Tool tests and hostile-input tests per control.
  - Status: ⬜ Not started · Covers: MCP-TEST-001 · Depends on: MCP-T01
- [ ] **MCP-T06** MCP Inspector and Claude Code session evidence.
  - Status: ⬜ Not started · Covers: MCP-TEST-002 · Depends on: MCP-T03
