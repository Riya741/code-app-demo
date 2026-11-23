---
contract: task-handoff.v1
task: AOPS-T02
agent: AGENT-IMPLEMENTER
covers: [AOPS-ORCH-004, AOPS-ORCH-005]
files_changed: [server/ai/tools.ts, server/workbook.ts, tests/integration/tools.test.ts]
tests: [tests/integration/tools.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: AOPS-T02 Shared read-only tools with strict schemas and the tool allow-list check

## What changed
New `server/ai/tools.ts` holds four read-only tools: `get_use_case` and `get_event` (the two the Analyst's spec
lists) and `list_use_cases` and `list_events` (the MCP data tools of 025 MCP-SRV-002, granted to no runtime agent).
They are plain functions over the existing read model, with no SDK import. Each tool has a zod validator (strict
object, ranges and lengths) and a JSON `input_schema` with `additionalProperties: false` and a `required` list.
`modelToolDefinitions(set)` turns them into definitions with `strict: true`. The JSON Schema leaves out
`minimum`/`maxLength`-style keywords, which strict tool definitions do not accept, and zod enforces those limits instead.
Results:
- contain only the fields allowed by ai-data-policy §2, in the fact-sheet.v1 item shapes;
- skip soft-deleted rows (they come from `useCasesByParent`/`eventsByParent`);
- redact emails, phone numbers and query-string links, and list the redactions applied;
- put free text only in `text` fields, which each tool description calls data, not instructions;
- are capped: 1 500 characters of text for one record, 300 per list item, `value_snippet` 500, 20 names per record,
  page size ≤ 50, and a 200 000-character backstop on any one result.

With `customerId` in the context, records of any other customer come back as `not_found`.

For AOPS-ORCH-004, `AGENT_TOOL_ALLOWLIST` copies each runtime agent's `## Tools` list. Only `AGENT-ANALYST` gets
`get_use_case` and `get_event`; every other agent, and any unknown ID (including `constructor` and `__proto__`), gets
nothing. `buildToolSet(agentId, ctx)` binds that list to the run's read context. `callTool(set, name, rawInput)`
refuses any unlisted name before reading anything and returns `{ outcome: "tool_denied", code: "tool_denied",
is_error: true }`. Invalid input returns `{ outcome: "error", code: "invalid_input" }` with a message that names the
field. Other failures return `not_found`, `result_too_large` or `failed`, with no stack trace or path. `callTool` and
`runTool` never throw. `runTool` (validate and run, without an allow-list) is exported so the MCP server can apply its
own controls (MCP-SRV-004).

`server/workbook.ts`: the only change is that `Store`, `useCasesByParent` and `eventsByParent` are now exported, so the
tools reuse the parsing and queries instead of copying them. There is no behaviour change. See Open questions.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AOPS-ORCH-004 (allow-list = agent specs) | `tests/integration/tools.test.ts`: "AOPS-ORCH-004 grants each runtime agent exactly the tools its agent spec lists" (parses `spec/agents/*.md` with Kind runtime, `## Tools`) |
| AOPS-ORCH-004 (model sees only listed tools) | "AOPS-ORCH-004 offers the model only the tools the agent's spec lists, each strict" |
| AOPS-ORCH-004 (refuse unlisted, `tool_denied`, no throw) | "AOPS-ORCH-004 refuses a tool the agent's spec does not list with outcome tool_denied, without reading the workbook" (registered but unlisted, unknown, `constructor`, `__proto__`, non-string name, Writer with no tools; a store stand-in that fails on any read proves nothing was read) |
| AOPS-ORCH-004 (unknown agent) | "AOPS-ORCH-004 gives an agent with no spec entry no tools at all" |
| AOPS-ORCH-005 (strict input schemas) | "AOPS-ORCH-005 every tool has a strict input schema: additionalProperties false, required listed, same fields as its validator" |
| AOPS-ORCH-005 (invalid input rejected) | "AOPS-ORCH-005 rejects invalid input with an error naming the field, before reading the workbook" |
| AOPS-ORCH-005 (allowed fields only) | "AOPS-ORCH-005 get_use_case returns only the allow-listed fields of a live use case, matching the app's read model"; "AOPS-ORCH-005 never returns emails, attendee names, IDs, summaries or legacy columns" |
| AOPS-ORCH-005 (no deleted / other-customer rows) | "AOPS-ORCH-005 never returns soft-deleted records or records of another customer" |
| AOPS-ORCH-005 (capped result sizes) | "AOPS-ORCH-005 caps free text at 1500 characters for one record and 300 in lists, and lists the truncation"; "AOPS-ORCH-005 caps a list page at 50 items and pages through every live record once" |
| AOPS-ORCH-005 (redaction per ai-data-policy §3) | "AOPS-ORCH-005 redacts emails, phone numbers and query-string links in returned text and lists them" |
| AOPS-ORCH-005 (read-only) | "AOPS-ORCH-005 calling every tool leaves the workbook file byte-identical and the read model unchanged" (SHA-256, mtime, directory listing, in-memory sheets); "AOPS-ORCH-005 tools.ts uses only the workbook's read functions and no write path" |

All tests run against the generated 8-customer fixture (the `workbookApi()` harness, one temp copy per test). Some
tests need data the fixture may not have: a long note, an email in a note, a deleted row, or more than 50 use cases.
Those tests change only the rows of their own in-memory `Store` and never save.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 18 hand-offs, 0 error(s) (run after writing this file) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (all existing react-refresh warnings in `src/components`); typecheck: clean |
| G4 | `npx vitest run tests/integration/tools.test.ts` (targeted run only, as instructed; the full `npm test` is left to the orchestrator because parallel full runs time out) | 1 file passed; 14 passed (14) |

## Open questions
- **File outside the task's Files line:** `server/workbook.ts` now exports `Store`, `useCasesByParent` and
  `eventsByParent` (the `export` keyword and one comment only). The orchestrator's plan asked the tools to reuse the
  read model rather than copy the parsing, and the 024 Constitution check says "read-only access through `Store`", but
  the task names only `server/ai/tools.ts`. Reviewer: confirm, or have the task's Files line amended at close.
- **AOPS-ORCH-004 is only partly covered by this task.** Refusing the call is done here. Recording the `tool_denied`
  span and failing the step belong to the orchestrator (AOPS-T01). `ToolResult.outcome` is ready for that and uses the
  design's `Span.outcome` value `tool_denied`. The requirement should not be marked implemented until AOPS-T01 lands.
- **Retriever reuse (AIB-T02):** `redact`, `dataText`, `RedactionTally`, `useCaseFact` and `eventFact` are exported so
  the Retriever can build fact-sheet.v1 the same way without a second implementation. AIB-T02 decides whether to use them.
- **`get_customer_facts` and `search_customers` (MCP-SRV-002) are not here.** `get_customer_facts` returns
  fact-sheet.v1, which is the Retriever's output (AIB-T02). `search_customers` belongs with the MCP task. Both can be
  added to `TOOLS` later without any agent being granted them.
- **Judgement calls:**
  - `is_live` follows the glossary: the status name contains the word "live".
  - Phone numbers are matched as 9-15 digits in separated groups, with ISO dates excluded.
  - Event `attendee_names` is not sent: it is not in the §2 event list and is not a linked personnel or stakeholder.
  - People are personnel names plus the stakeholder name for use cases, and contributor names for events.
- **Messages catalog:** tool error texts go to the model, not to a user, so no catalog entries were added. The
  reviewer may decide otherwise.
- G5: n/a (server only; no UI).
- Not closed here (orchestrator): task status, requirement status, gap register, README dashboard, traceability.

## Review
**Verdict: pass** (AGENT-REVIEWER, 2026-11-20). Gates at review: G1 pass (0 errors), G3 pass (`npm run lint` 0 errors,
8 old warnings; `npm run typecheck` clean), G4 pass for `npx vitest run tests/integration/tools.test.ts` (14 passed).
The orchestrator then ran the full suite: 18 files, 198 passed + 1 expected fail.

Findings (all minor):
1. AOPS-ORCH-004 has three parts (refuse, record a `tool_denied` span, fail the step); this task delivers the refusal.
   **Done at close:** the requirement stays ⚠️ Partial with a gap-register row, and AOPS-ORCH-004 is added to AOPS-T01's
   Covers. AOPS-ORCH-005 is ✅ Implemented.
2. `server/workbook.ts` is outside the Files line (three `export` keywords, no behaviour change). Accepted; the Files
   line is amended at close.
3. Article II.3: `runTool` calls `ctx.store.fresh()` outside the plugin's `exclusive` queue. Nothing is written, so no
   breach today. **Carried to AOPS-T01:** use a separate read-only `Store` instance (reloaded by mtime) or route reads
   through the queue, so a model never sees an in-memory change whose save failed.
4. Article XII.3: `ToolContext.store` was typed as the full `Store`. **Fixed by the orchestrator:** `ReadOnlyStore =
   Pick<Store, "fresh" | "table">`, and `useCasesByParent` / `eventsByParent` take `Pick<Store, "table">`, so `save()`
   is unreachable at compile time.
5. Phone redaction misses unseparated numbers, numbers followed by an ISO date and part of "1-800-…", and redacts some
   amounts and year lists. Data is fictional and AOPS-ORCH-005 does not name redaction. **Carried to AIB-T02**
   (AIB-SAFE-003 owns redaction), which must widen the pattern or record its limits before reuse.
6. The 20-name cap is not listed in `redactions`, and the 200 000-character backstop has no test. Carried to AIB-T02 /
   AOPS-T09.
7. G4 in the front matter came from a targeted run; the full suite has now run and passes.

Judgement calls accepted: `is_live` per the glossary; attendee names withheld (narrows the policy, §7 allows it); no
catalog entries for model-facing tool errors (a user-facing mapping is needed if AOPS-T01/T08 ever shows one).
