# Sessions

This page lists the Claude Code sessions recorded so far (Topics 2 and 5), and what is still to capture.

## Recorded
| Session | Shows | Where |
|---|---|---|
| Claude Code using `workbook-mcp` (2026-11-24) | The project MCP server loaded from `.mcp.json`; 6 `mcp__workbook__` tool calls (gaps, trace, search, fact sheet, one record by ID); a cited draft brief built from tool data only; matching audit lines | [mcp-workbook-server.md, Part B](../mcp-workbook-server.md#part-b-claude-code-session) |
| MCP Inspector against `workbook-mcp` (2026-11-24) | Tools, resources and prompt listed; read calls; 4 hostile calls refused; audit lines | [mcp-workbook-server.md, Part A](../mcp-workbook-server.md#part-a-mcp-inspector-session) |
| Task delivery with skills and hooks (Phases 0–6) | `/task-implement` and `/task-close`; the spec-guard, data-guard, post-edit lint and stop hooks firing; hand-offs with review verdicts | [ai-dev-log.md](../ai-dev-log.md), [spec/handoffs/](../../../spec/handoffs/README.md) |
| Live AI brief through the gateway (AIB-T07 G5, 2026-11-24) | The owner's manual check of the summary dialog; the run trace | [ops/trace-sample.md](../ops/trace-sample.md) |

## Still to capture (the owner's step)
These need a screen recording or screenshots taken by the owner. They are part of the demo video; follow
[demo-checklist.md](../../demo-checklist.md):
- [ ] **Spec guard blocking an edit:** ask Claude to edit a file under `src/` with no task 🔄, then show the block
  message.
- [ ] **Post-edit lint feedback:** introduce a bad requirement ID in a test title and show the hook's error.
- [ ] **A full task in plan mode:** `/task-implement <ID>` through to `/task-close`.
- [ ] **The AI brief in the app:** *Draft with AI* → progress → cited draft → Save, in light and dark themes.
- [ ] **The MCP server in Claude Code:** the `/mcp` panel showing `workbook` connected with 10 tools, and one tool
  call.
- [ ] *(Optional)* **MCP Inspector browser UI:** run
  `npx @modelcontextprotocol/inspector@2.16.0 --config .mcp.json --server workbook` and capture the Tools tab.

Put screenshots in this folder, named `<yyyy-mm-dd>-<what>.png`. Use the fictional demo workbook only.
