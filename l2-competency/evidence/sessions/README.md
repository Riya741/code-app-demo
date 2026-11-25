# Sessions

This page lists the Claude Code sessions recorded so far (Topics 2 and 5): the screenshots and the demo video in
this folder, and the sessions written up elsewhere in the evidence pack.

## Demo video
[codeappdemo.mp4](codeappdemo.mp4) (2026-11-25, 29 min 37 s). It runs longer than the 10–12 minute demo script in
[06-submission-evidence.md §3](../../06-submission-evidence.md#3-demo-script-1012-minutes). It was recorded on the
fictional demo workbook only ([ADR-0006](../../../spec/adr/0006-fictional-demo-dataset.md)).

## Screenshots (2026-11-25)
| Screenshot | Shows | Topic |
|---|---|---|
| [spec-guard-block](2026-11-25-spec-guard-block.png) | Claude asked to edit `src/lib/dates.ts` with no task 🔄; the `PreToolUse` spec-guard hook blocks it (DEVA-GUARD-001, Article I) and Claude does not work around it. The terminal shows spec lint catching a prompt whose agent version drifted (`writer.v2.md` cites `AGENT-WRITER@1.1.0`, spec at 1.2.0), then 0 errors | 2, 5 |
| [post-edit-lint](2026-11-25-post-edit-lint.png) | Claude asked to retitle a test to the unknown ID `AB-XYZ-999`; it checks the ID with the workbook MCP tool and explains why spec lint (G1) would reject it before making the change | 1, 2, 5 |
| [ai-draft-light](2026-11-25-ai-draft-light.png) | *Draft with AI* in the app, light theme: the unsaved cited draft for CU-1025 with Save, Edit and Discard | 3, 4 |
| [ai-draft-edit-light](2026-11-25-ai-draft-edit-light.png) | The same draft in the editor, light theme, before saving | 3, 4 |
| [ai-draft-saved-dark](2026-11-25-ai-draft-saved-dark.png) | The edited draft after Save, dark theme, with its *Last modified* time | 3, 4 |
| [mcp-panel](2026-11-25-mcp-panel.png) | The `/mcp` panel in Claude Code: `workbook` connected with its 10 tools | 5 |
| [mcp-tool-call](2026-11-25-mcp-tool-call.png) | Claude Code calling `trace_requirement` and `get_customer_facts` on `workbook-mcp` and answering from the tool data only | 5 |
| [mcp-hostile-refused](2026-11-25-mcp-hostile-refused.png) | MCP Inspector CLI: `get_requirement` with `id=../../package.json` refused (`must match PREFIX-AREA-NNN`, `isError: true`) | 5 |
| [mcp-inspector-servers](2026-11-25-mcp-inspector-servers.png) | MCP Inspector browser UI (v2.16.0) launched with `--config .mcp.json`: the `workbook` stdio server listed (not yet connected) | 5 |

## Other recorded sessions
| Session | Shows | Where |
|---|---|---|
| Claude Code using `workbook-mcp` (2026-11-24) | The project MCP server loaded from `.mcp.json`; 6 `mcp__workbook__` tool calls (gaps, trace, search, fact sheet, one record by ID); a cited draft brief built from tool data only; matching audit lines | [mcp-workbook-server.md, Part B](../mcp-workbook-server.md#part-b-claude-code-session) |
| MCP Inspector against `workbook-mcp` (2026-11-24) | Tools, resources and prompt listed; read calls; 4 hostile calls refused; audit lines | [mcp-workbook-server.md, Part A](../mcp-workbook-server.md#part-a-mcp-inspector-session) |
| Task delivery with skills and hooks (Phases 0–6) | `/task-implement` and `/task-close`; the spec-guard, data-guard, post-edit lint and stop hooks firing; hand-offs with review verdicts | [ai-dev-log.md](../ai-dev-log.md), [spec/handoffs/](../../../spec/handoffs/README.md) |
| Live AI brief through the gateway (AIB-T07 G5, 2026-11-24) | The owner's manual check of the summary dialog; the run trace | [ops/trace-sample.md](../ops/trace-sample.md) |

## Capture checklist
All captured by the owner on 2026-11-25, in the screenshots above and the demo video:

- [X] **Spec guard blocking an edit:** ask Claude to edit a file under `src/` with no task 🔄, then show the block
  message ([screenshot](2026-11-25-spec-guard-block.png)).
- [X] **Post-edit lint feedback:** introduce a bad requirement ID in a test title and show the hook's error
  ([screenshot](2026-11-25-post-edit-lint.png), video).
- [X] **A full task in plan mode:** `/task-implement <ID>` through to `/task-close` (video).
- [X] **The AI brief in the app:** *Draft with AI* → progress → cited draft → Save, in light and dark themes
  ([draft](2026-11-25-ai-draft-light.png), [edit](2026-11-25-ai-draft-edit-light.png),
  [saved, dark](2026-11-25-ai-draft-saved-dark.png)).
- [X] **The MCP server in Claude Code:** the `/mcp` panel showing `workbook` connected with 10 tools, and one tool
  call ([panel](2026-11-25-mcp-panel.png), [tool call](2026-11-25-mcp-tool-call.png)).
- [X] *(Optional)* **MCP Inspector browser UI:** run
  `npx @modelcontextprotocol/inspector@2.16.0 --config .mcp.json --server workbook` and capture the Tools tab
  ([servers page](2026-11-25-mcp-inspector-servers.png), [hostile call refused](2026-11-25-mcp-hostile-refused.png)).

Put screenshots in this folder, named `<yyyy-mm-dd>-<what>.png`. Use the fictional demo workbook only.
