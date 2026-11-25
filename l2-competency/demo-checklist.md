# Demo checklist: 10–12 minutes

This is the step-by-step version of the demo script in [06-submission-evidence.md §3](06-submission-evidence.md#3-demo-script-1012-minutes).
Each segment lists what to open, what to do, roughly what to say, and what to do if it goes wrong. Everything shown is
the fictional demo data ([ADR-0006](../spec/adr/0006-fictional-demo-dataset.md)).

**Cost:** the AI brief segment makes one live run through the gateway, about $0.04–0.08 per run. Everything else is
free: the eval segment re-grades a recorded run at $0. Budget one rehearsal and two takes, about $0.25.

---

## A. Before you record (about 15 minutes)

### Clean state
- [ ] `git status` shows only your own `.gitignore` change, and the branch is `main`.
- [ ] Close unrelated windows and notifications. Set the screen to 1920×1080, the browser zoom to 110–125% and the
  VS Code font a little larger.
- [ ] **Never show a key.** `PORTKEY_API_KEY` stays in your user environment. Do not run `Get-ChildItem Env:` or open
  settings files on screen.

### Terminal 1: the app with AI on (PowerShell)
```powershell
$env:AI_ENABLED='true'; $env:AI_GATEWAY='portkey'
$env:AI_GATEWAY_URL='https://portkeygateway.perficient.com'
$env:AI_GATEWAY_MODEL_PREFIX='@aws-bedrock-use2/us.anthropic.'
npm run dev
```
- [ ] Open <http://localhost:3000>. The customer search box appears.
- [ ] **Rehearse the AI run once:** open **Ashcombe Medical** and let a draft finish, then **Discard** it. This warms
  everything up and confirms the gateway works today.

### Terminal 2: commands (PowerShell, repo root)
- [ ] Keep it open and empty. You'll paste the commands from segments 2, 5, 6 and 7.
- [ ] Run once to warm the npx cache:
  `npx -y @modelcontextprotocol/inspector@2.16.0 --cli --config .mcp.json --server workbook --method tools/list`

### Claude Code
- [ ] Start a **new conversation** in this folder. Type `/mcp` and check that `workbook` is **connected** with 10 tools.
- [ ] No task is 🔄. The session-start message should say code edits are blocked.

### VS Code tabs, in this order
1. [spec/README.md](../spec/README.md): scroll to the dashboard **Total** row.
2. [evidence/before-after.md](evidence/before-after.md)
3. [spec/constitution.md](../spec/constitution.md): *Article XII — AI Agents and Data*
4. [spec/specs/022-ai-account-brief/requirements.md](../spec/specs/022-ai-account-brief/requirements.md): search for `AIB-CITE-002`
5. [spec/agents/writer.md](../spec/agents/writer.md)
6. [spec/contracts/writer-draft.v1.schema.json](../spec/contracts/writer-draft.v1.schema.json): the `fact_ids` property
7. [server/ai/prompts/writer.v2.md](../server/ai/prompts/writer.v2.md): line 1
8. [spec/handoffs/MCP-T04.md](../spec/handoffs/MCP-T04.md): an example hand-off
9. [evals/thresholds.json](../evals/thresholds.json)
10. [evidence/eval/smoke-2026-11-24.md](evidence/eval/smoke-2026-11-24.md)
11. [evidence/ops/trace-sample.md](evidence/ops/trace-sample.md)

---

## B. Recording

### 1 · 0:00–1:00 · The problem and the app
- [ ] Show the app: search "Ash", open **Ashcombe Medical**, and scroll the Use Cases and Events grids briefly.
- [ ] Switch to tab 2 (*before-after*): at the start there were 7 High gaps, 0 tests and no AI; now there are 0 High
  gaps and 474 tests.
- **Say:** "A customer-success workspace on an Excel workbook, fully specified with spec-driven development. In 8
  days, Claude Code delivered every change through that spec: 7 High gaps closed, an AI Account Brief, an eval
  harness and an MCP server."

### 2 · 1:00–3:00 · SDD governs the agents
- [ ] Walk tabs 3 → 7, about 15 seconds each:
  - Article XII says AI output is a draft until a person saves it;
  - AIB-CITE-002 says every factual sentence cites its records;
  - the Writer agent spec lists AIB-CITE-002;
  - the contract requires `fact_ids` on every sentence;
  - the prompt header is `<!-- agent-spec: AGENT-WRITER@1.2.0 · requirements: AIB-CITE-002, … -->`.
- [ ] **Show lint catching drift.** In tab 7, change `AGENT-WRITER@1.2.0` to `AGENT-WRITER@1.1.0` and save. In
  Terminal 2:
  ```powershell
  py -I spec/scripts/spec_lint.py
  ```
  → `ERROR server/ai/prompts/writer.v2.md: cites AGENT-WRITER@1.1.0 but the spec is at 1.2.0 (version drift)`
- [ ] **Undo:** press Ctrl+Z, save, and run lint again → `0 error(s)`.
- **Say:** "The specs don't just describe code: they govern the agents. A prompt that drifts from its agent spec fails
  gate G1."

### 3 · 3:00–5:00 · The Claude Code workflow
- [ ] In Claude Code, type: *"Add a one-line comment at the top of src/lib/dates.ts."*
  → The **spec-guard hook blocks it**, because no task is in progress. Show the message.
- [ ] Type: *"In tests/unit/dates.test.ts, change the first test title to start with ABC-XYZ-999 instead of
  DT-TIME-003."*
  → The edit is allowed (tests aren't guarded), then the **post-edit hook** runs spec lint and feeds back
  `test cites unknown requirement ABC-XYZ-999`.
- [ ] Type: *"Revert that change."* Then check that `git status` is clean.
- [ ] Show tab 8 (a hand-off): the criteria → evidence table, gates and review verdict. In Terminal 2:
  ```powershell
  git log --oneline --graph -12
  ```
  → one branch per task, each merged with its task ID.
- **Say:** "Every task follows the same path: set to in progress, build with tests named after requirement IDs, run
  the gates, write a hand-off, close. The hooks make that path the only one."
- *Optional, recorded separately and cut in:* `/task-implement EVF-T07` from start to the hand-off.

### 4 · 5:00–7:00 · AI Account Brief
- [ ] In the app, open **Ashcombe Medical**. If it has no saved summary, a draft starts by itself; otherwise click
  **Regenerate with AI** in the summary dialog header.
- [ ] Narrate the step progress (retrieve → analyse → write → guard).
- [ ] When the draft appears, point to:
  - the label *"AI draft — not saved. Check it, then Save, Edit or Discard."*;
  - the `[UC-…]` / `[EV-…]` citation markers;
  - the four sections.
- [ ] Click **Edit**, change one word, and click **Save**. Close and reopen the customer: the saved summary is there
  (SUM-EDIT-001, a former High gap).
- [ ] Toggle to the dark theme for 3 seconds, then back.
- **If the draft says "Unverified draft: check the points below before saving":** show the list. "The Guard checked
  every citation in code, and it found a problem, so it says so instead of hiding it."
- **If the run fails** (gateway down): show tab 11 instead, and say the live run is in the trace evidence.

### 5 · 7:00–8:00 · Observability
- [ ] In Terminal 2, show the trace of the run you just made:
  ```powershell
  Get-ChildItem ..\data\ai-runs\traces | Sort-Object LastWriteTime | Select-Object -Last 1 | Get-Content
  ```
- [ ] Point at:
  - the steps;
  - `tokens` and `costUsd` per model call;
  - `agentVersion` and `promptVersion`;
  - `route: gateway`;
  - the run `status`;
  - no customer text anywhere.
- [ ] Optionally, show tab 11's span tree for the earlier unverified run.
- **Say:** "Every run is traceable to the agent and prompt version, the model, the route and the cost, without
  logging any customer data."

### 6 · 8:00–10:00 · Evaluation
- [ ] Show tab 9 (thresholds): citation validity ≥ 0.98, coverage ≥ 0.95, zero hallucinations, zero injections
  followed.
- [ ] In Terminal 2, re-grade the recorded smoke run (free, a few seconds):
  ```powershell
  npm run eval:grade -- ..\data\ai-runs\evals\2026-11-24T16-58-56-756Z-smoke
  ```
  → `[eval] replay of 8 results: gate passed`
- [ ] Show tab 10:
  - the per-case table across 8 categories, including prompt injection and HTML;
  - *"What the data led to"*: v1 wrote 441 words, and v2 brought the mean to 228 with G7 passing at $0.35.
- **Say:** "The prompt change was decided and checked with data. Next on the list: the eval-only LLM judge calibrated
  against my labels, a model comparison, and the ADR-0007 decision. Those are specified and deliberately deferred."

### 7 · 10:00–12:00 · Extensibility
- [ ] In Claude Code, run `/mcp`: `workbook` is connected, with 10 tools.
- [ ] Type: *"Using only the workbook MCP tools: trace MCP-SEC-005, then get the fact sheet for customer 1025 and give
  me three bullets on the account."*
  → Show the `mcp__workbook__trace_requirement` and `mcp__workbook__get_customer_facts` calls, and expand one result.
- [ ] Show a hostile call being refused. In Terminal 2:
  ```powershell
  npx -y @modelcontextprotocol/inspector@2.16.0 --cli --config .mcp.json --server workbook --method tools/call --tool-name get_requirement --tool-arg "id=../../package.json"
  ```
  → `Invalid input: id: must match PREFIX-AREA-NNN`
- [ ] Show the audit log:
  ```powershell
  Get-Content ..\data\mcp-audit.jsonl -Tail 3
  ```
  → hashes and sizes only, never the arguments.
- [ ] Close on tab 1, the dashboard **Total** row: 450 / 529 requirements, 174 / 244 tasks, 0 open High gaps.
- **Say:** "The same tool code serves the runtime agents and Claude Code through MCP: read-only by default, validated,
  no shell, redacted, and audited, with a hostile-input test for every control."

---

## C. After recording
- [ ] `git status` is clean. Undo anything the demo changed, except the saved summary, which is fine: it's fictional
  data.
- [ ] Save the video outside the repo, and put its link in [evidence/sessions/README.md](evidence/sessions/README.md).
- [ ] Take screenshots during or after the recording for `evidence/sessions/`, named `<yyyy-mm-dd>-<what>.png`:
  - the spec-guard block;
  - the post-edit lint feedback;
  - the AI draft with markers;
  - the `/mcp` panel;
  - the refused hostile call.
- [ ] Tick the matching boxes in `evidence/sessions/README.md`, and tell Claude, so the evidence index and the
  progress page can be updated.

| Segment | Time | Fallback if something breaks |
|---|---|---|
| 1 Problem and app | 1:00 | — |
| 2 SDD governs agents | 2:00 | Show `before-after.md` and the lint output from rehearsal |
| 3 Workflow and hooks | 2:00 | Show the dev log's "what the agent workflow caught" |
| 4 AI brief | 2:00 | `ops/trace-sample.md` (real live run) |
| 5 Observability | 1:00 | `ops/trace-sample.md` |
| 6 Evaluation | 2:00 | `eval/smoke-2026-11-24.md` |
| 7 Extensibility | 2:00 | `mcp-workbook-server.md` Part B |
