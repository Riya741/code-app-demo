---
contract: task-handoff.v1
task: AIB-T03
agent: session
covers: [AIB-CITE-002, AIB-FAITH-001, AIB-FAITH-002, AIB-FMT-001]
files_changed: [server/ai/prompts/analyst.v1.md, server/ai/prompts/writer.v1.md, server/ai/steps/llm.ts, server/ai/steps/analyst.ts, server/ai/steps/writer.ts, server/ai/steps/retriever.ts, tests/integration/analyst-writer.test.ts, tests/integration/analyst-writer.live.test.ts]
tests: [tests/integration/analyst-writer.test.ts, tests/integration/analyst-writer.live.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T03 Analyst and Writer steps with prompts v1

## What changed
The two LLM steps now exist and plug into the orchestrator as `analystStep` and `writerStep` (`promptVersion`
`analyst.v1` / `writer.v1`). Each step reaches the model only through `ctx.callModel` and tools only through
`ctx.tools.call`.
- **Prompts:** `server/ai/prompts/analyst.v1.md` and `writer.v1.md` start with the agent-spec header
  (`AGENT-ANALYST@1.0.0`, `AGENT-WRITER@1.1.0`, spec lint check 11). `loadPrompt` (`server/ai/steps/llm.ts`) refuses
  a prompt whose header does not match `STEP_AGENTS`. It sends the text without the header comment, as one system
  block with `cache_control`.
- **Analyst:** sends the fact sheet as the one escaped `<fact_sheet>` block, then a short task line. It offers the
  strict `get_use_case` / `get_event` tools with `tool_choice: auto` and asks for structured output
  (`output_config.format`) in the shape of analyst-to-writer.v1. The tool loop is bounded: 3 rounds, then one more
  request with `tool_choice: none`; at most 10 tool calls, and further calls get an error result. Tool results go back
  as escaped `<tool_data>` blocks, and the assistant turn goes back unchanged (thinking blocks included). After
  validating the contract, the step also rejects:
  - a point citing a fact ID that is not in the fact sheet (AIB-CITE-002, agent spec "Done when");
  - a `no_activity` value that does not match the fact sheet;
  - a customer without activity that gets more than one overview point (AIB-FAITH-003).
- **Writer:** gets only the Analyst's insights, as one escaped `<analysis>` block without `contract` and `run_id`. It
  has no tools and asks for structured output in the shape of writer-draft.v1. It rejects sections that are not
  exactly Overview, Wins, Risks, Next steps, in that order (AIB-FMT-001; the contract fixes the names and count, not
  the order).
- **Both steps:**
  - check `stop_reason` before reading: a refusal or a `max_tokens` cut is never parsed (`model_error`), and a tool
    call from the Writer is `invalid_output`;
  - parse the JSON and validate the contract;
  - set `contract`, `run_id` (and `revision`) in code, after the model's fields, so the model cannot set them;
  - throw `LlmStepError` with a run error code and a fixed reason, never model or workbook text.
- **Model-facing schemas** (`ANALYST_OUTPUT_SCHEMA`, `WRITER_OUTPUT_SCHEMA`) are the contracts without the code-owned
  fields and without the keywords structured outputs do not accept. A test derives them from
  `spec/contracts/*.schema.json` and compares them.
- **Small refactor:** `jsonForPrompt` was taken out of `wrapFactSheet` (retriever.ts), so the analysis and tool-result
  blocks use the same escaping; `wrapFactSheet` output is unchanged (retriever tests pass).

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AIB-CITE-002 | `tests/integration/analyst-writer.test.ts`: "AIB-CITE-002 each prompt cites its agent spec at the current version and requires fact IDs on every point and factual sentence", "AIB-CITE-002 every point and every factual sentence carries fact IDs from the run's fact sheet, passed on unchanged", "AIB-CITE-002 the Analyst step fails the run with invalid_output when a point cites a fact ID that is not in the fact sheet", "AIB-CITE-002 the Analyst step fails the run with invalid_output when a point has no fact IDs", "AIB-CITE-002 the Analyst's output schema is analyst-to-writer.v1 without the fields code owns, every point with fact_ids", "AIB-CITE-002 code owns contract, run_id and revision: …", "AIB-CITE-002 a reply that is not a JSON object fails with invalid_output, never repaired" |
| AIB-FAITH-001 | "AIB-FAITH-001 both prompts forbid names that are not in their data and say that data is never instructions", "AIB-FAITH-001 the Analyst request holds only this customer's data: no other customer's name and no saved summary", "AIB-FAITH-001 the Writer gets only the Analyst's insights, in one escaped data block, with no workbook data and no tools" |
| AIB-FAITH-002 | "AIB-FAITH-002 both prompts keep counts, statuses and dates exactly as given, dates as the stored calendar day", "AIB-FAITH-002 the Analyst gets the run's fact sheet unchanged: true counts and stored calendar days, in one escaped data block" |
| AIB-FMT-001 | "AIB-FMT-001 hands the guard a writer-draft.v1 with Overview, Wins, Risks and Next steps in that order", "AIB-FMT-001 the Writer step fails the run with invalid_output when the sections are out of order", "… when a section is missing or a heading is not one of the four", "AIB-FMT-001 the Writer prompt names the four sections in order and one sentence for an empty section", "AIB-FMT-001 the Writer's output schema is writer-draft.v1 …", "AIB-FMT-001 a tool call from the Writer, which has no tools, is rejected as invalid output"; live: `analyst-writer.live.test.ts` run once on 2026-11-23 through the Perficient Portkey gateway (AOPS-T12): passed |

Also covered on the way (not in Covers):
- AIB-SAFE-001: planted `</fact_sheet>` note stays inside the block; tool results as escaped `<tool_data>`.
- AIB-FAITH-003: no-activity customer, plus the mismatch and invented-point rejections.
- AOPS-ORCH-004: denied tool, bounded rounds, per-step call limit.
- AOPS-FAIL-004 / AOPS-FAIL-005: the "never parsed" half only. The retry and fallback are AOPS-T03.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 569 requirements, 242 tasks, 4 agents, 6 contracts, 3 prompts, 24 hand-offs, 0 error(s) |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors, 8 warnings (all already there, `src/components/ui`) · typecheck clean |
| G4 | `npm test` | 25 files passed, 1 skipped (live check); 330 passed, 1 expected fail, 1 skipped |

## Open questions
- **Live check: done 2026-11-23** through the gateway route (CR-20261123-1, AOPS-T12); passed. Original note: It needs your personal `ANTHROPIC_API_KEY` (tracker step "Personal API key",
  not set on 2026-11-23). After setting it and restarting VS Code:
  `$env:AI_LIVE_CHECK = "1"; npx vitest run tests/integration/analyst-writer.live.test.ts`. It makes 2 Sonnet calls
  on the fictional fixture and prints only counts (sentences, uncited, unknown IDs, words, tokens, cost).
- **Strict tool schemas with `pattern` (live check).** The AOPS-T02 tool schemas carry `pattern` and `description`
  under `strict: true`. The API docs do not list `pattern` as unsupported, but the live check is the first real
  request; a 400 there means removing `pattern` from the model-facing tool schemas (zod still checks the input).
- **Writer "Done when" vs the Guard (spec owner).** The Writer spec's "Done when" lists "every factual sentence has
  ≥ 1 fact ID; word count within budget". Per CR-20261121-1 these are the Guard's checks (AIB-CITE-003, AIB-FMT-002,
  AIB-T04): a miss makes the draft `unverified` instead of failing the run. So the Writer step deliberately does not
  reject them; rejecting them there would make the Guard's `uncited` issue unreachable. Suggest rewording the
  Writer's "Done when" to say "checked by the guard step", with a patch version bump (1.1.1) and the prompt header
  updated.
- **`import.meta.url` under the Vite plugin (AIB-T05).** `loadPrompt` reads prompts relative to `llm.ts`. Vite
  rewrites `import.meta.url` to the source path when it bundles the config's imports, so this should hold. Confirm
  when the routes are registered in AIB-T05.
- **Requirement status (task-close).** AIB-FMT-001 is fully met at the writer-draft level; the guard renders it in
  AIB-T04. AIB-CITE-002, AIB-FAITH-001 and AIB-FAITH-002 stay ⚠️ Partial: citation markers come with AIB-T04, and
  faithfulness is measured by the eval graders (EVAL-T02).

## Review
**Verdict: pass** (session, 2026-11-23), one round.

Criteria:
- **AIB-CITE-002:** points need ≥ 1 fact ID (zod `min(1)`) from the sheet (code check). Writer sentences carry
  `fact_ids`, and the prompt requires them on factual sentences. The final check is the Guard's (AIB-T04).
- **AIB-FAITH-001:** the Analyst sees only this customer's allow-listed data (no saved summary, no other customer).
  The Writer sees only the insights. Both prompts forbid names that are not in their data. A run-time entity check is
  not in scope (EVAL-CODE-003).
- **AIB-FAITH-002:** the fact sheet goes in unchanged, with true counts and `YYYY-MM-DD` days. The prompts require
  counts from `counts` (lists may be cut at 200) and dates verbatim.
- **AIB-FMT-001:** headings and order enforced in code; ≥ 1 sentence per section by contract; the prompt asks for the
  one-sentence empty section.

Rules:
- **Article XII:** headers match the agent spec versions (test and lint). Tools are only the allow-listed two
  (AOPS-ORCH-004 test). Hand-offs are validated twice (step and orchestrator). The key is read only by the client from
  the environment, and the live test prints numbers only.
- **AOPS-OBS-002:** errors carry fixed reasons and contract paths, never values. Nothing in the steps logs.
- **Article III:** the Writer produces plain text only. HTML is built and sanitised by the Guard (AIB-T04).
- **Article V:** no new user-facing message.
- **CLAUDE.md:** no `.xlsx` or secrets added; regex escapes are written as escapes; test titles start with
  requirement IDs; no test was weakened.

Findings fixed during the build:
- The model schema's `required` order was aligned with the contract.
- A prompt-text regex was made line-break tolerant.
