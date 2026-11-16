# Topic 4 — Agent Design, Orchestration & Ops (max 30)

**Top marks (25–30):** *Multi-agent / multi-step orchestration with failure handling, recovery, observability.*

**Today: 0. Target: 25–28.**

## 1. What you build

The **AI Account Brief** pipeline (spec `022-ai-account-brief`, ops spec `024-agent-ops`), running server-side in the
existing Vite plugin layer. The browser never calls the model (Article IX: component → hook → lib → API).

### Design choice: a code-controlled workflow with agentic steps (record as ADR-0007)

A fully autonomous loop is the wrong tool here: the steps are known in advance and errors are costly (a wrong
executive summary). So:

- the **orchestrator is deterministic code**: a state machine with explicit steps, checkpoints and budgets;
- **inside** steps, LLM agents have bounded autonomy (the Analyst may call read-only tools; the Critic may send work back to the Writer at most twice).

That combination is easy to observe and recover, and easy to defend in review.

```
POST /api/ai/brief {customerId}  ──▶  Orchestrator (run_id, budget, checkpoint store, trace)
   │
   ├─ 1 Retriever  (code)   load customer, use cases, events from Store → fact-sheet.v1 with fact IDs (UC-123, EV-45)
   │                        redact per ai-data-policy; wrap free text as data (injection defence)
   ├─ 2 Analyst    (LLM + tools: list_use_cases, list_events, get_note — read-only, strict schemas)
   │                        → analyst-to-writer.v1 {themes[], risks[], wins[], next_steps[], each with fact_ids}
   ├─ 3 Writer     (LLM, structured output) → writer-to-critic.v1 {sections[{html, fact_ids}]}
   ├─ 4 Critic     (code checks + LLM verdict) → critic-verdict.v1 {pass, issues[{sentence, type, fix_hint}]}
   │        └─ fail and revisions < 2 → back to 3 with the issues · fail at 2 → finish as "Unverified"
   └─ 5 Guard      (code)   DOMPurify, length, strip/convert citation markers, final schema check
          ▼
   Draft returned → opens in RichTextEditor (unsaved) → user edits/accepts → Save (SUM-T07 endpoint)
```

Progress streams to the UI by step (Server-Sent Events from `GET /api/ai/runs/:id/events`), so the user sees
*Analysing → Writing → Verifying (revision 1)…*.

### Code layout

```
server/ai/
├─ client.ts          Anthropic client factory (provider-swappable: API / Bedrock / Foundry / Vertex — decision D1)
├─ orchestrator.ts    state machine, budgets, checkpoints, resume, cancellation
├─ steps/             retriever.ts · analyst.ts · writer.ts · critic.ts · guard.ts
├─ tools.ts           shared tool functions (also used by the MCP server, Topic 5)
├─ contracts.ts       zod schemas generated from / checked against spec/contracts/*.json
├─ resilience.ts      retry, backoff, timeout, circuit breaker, fault injection
├─ trace.ts           spans → JSONL, metrics, cost calculation
├─ prompts/           analyst.v1.md, writer.v1.md, critic.v1.md (headers cite agent specs + requirement IDs)
└─ routes.ts          /api/ai/brief, /api/ai/runs, /api/ai/runs/:id, /events, /resume, /cancel
```

### Anthropic SDK usage notes (TypeScript, `@anthropic-ai/sdk`)

- Default model `claude-opus-5-5`, but the **final choice comes from the eval** (ADR-0006). Make the model a config value per step; the Analyst might be Sonnet and the Writer Opus, for example.
- Structured hand-offs: use structured outputs (`output_config.format`, or `messages.parse` with zod) and still validate again with zod at the orchestrator boundary.
- Tools: `strict: true` with `additionalProperties: false`. On Opus 5.5 and Sonnet 5.5, a forced `tool_choice` (`any` / `tool`) returns a 400, so use `auto` and name the tool in the prompt.
- Thinking is adaptive and always on for Opus 5.5. Set `output_config.effort` **explicitly**; the default on Opus 5.5 is `medium`.
- Check `stop_reason` before reading content: handle `refusal` (use server-side `fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta where available), `max_tokens` (fail the step, do not parse truncated JSON) and `pause_turn`.
- Prompt caching: keep system prompts and tool definitions byte-stable; put `cache_control` on the stable prefix; confirm `usage.cache_read_input_tokens > 0` on repeat runs.
- Errors: catch the typed SDK errors most-specific-first (`RateLimitError`, `InternalServerError`, `APIConnectionError`, `BadRequestError`…). Set SDK `maxRetries: 0` inside `resilience.ts` so retries are counted and traced in one place, not hidden inside the SDK.

---

## 2. Failure handling and recovery (the core of the top band)

Each row becomes an AOPS requirement **and** a test that injects the fault.

| Failure | Detection | Response | Requirement |
|---|---|---|---|
| 429 / 529 overloaded / 5xx / network | typed SDK error | Exponential backoff with full jitter, honour `retry-after`, max 3 attempts per call | AOPS-FAIL-001 |
| Call hangs | per-step timeout (AbortController) | Abort, retry once, then fail step | AOPS-FAIL-001 |
| Schema-invalid hand-off | zod | One **repair retry** that includes the validator error; then fail step (never a silent fix) | AOPS-FAIL-002 |
| Critic rejects draft | `critic-verdict.pass=false` | Up to 2 revisions with issues; then return as **Unverified** with issues listed | AOPS-FAIL-003 |
| Uncited / hallucinated entity | code check in Critic | Treated as a critic rejection | AIB-CITE-002 |
| `refusal` stop reason | `stop_reason` | Server-side fallback model, else clear user message | AOPS-FAIL-004 |
| `max_tokens` truncation | `stop_reason` | Fail the step (do not parse partial output); retry once with a higher limit | AOPS-FAIL-005 |
| Budget exceeded (tokens / $ / wall clock per run) | running totals | Stop gracefully and return the best verified draft, or fail with a reason | AOPS-BUDG-001 |
| Repeated upstream failure | circuit breaker (e.g. 5 failures / 60 s) | Open: AI button disabled with "AI temporarily unavailable"; half-open probe after cool-down | AOPS-FAIL-006 |
| Server restart / crash mid-run | checkpoint after each step (`../data/ai-runs/<run_id>.json`, outside the repo) | `POST /runs/:id/resume` continues from the last completed step | AOPS-REC-001 |
| User cancels | AbortController | Stop all in-flight calls; run marked `cancelled` | AOPS-REC-002 |
| Duplicate clicks | idempotency key `(customerId, data hash)` | Return the existing in-flight run | AOPS-REC-003 |
| Prompt injection in notes | data wrapped in tagged blocks; instructions say data ≠ instructions; eval cases | Follow-through counts as a critic failure | AIB-SAFE-001 |
| AI disabled or no credentials | `AI_ENABLED`, client init | Button hidden, rest of the app unaffected (graceful degradation) | AOPS-FAIL-007 |

**Prove it with fault injection.** `AI_FAULTS="429:0.3,timeout:0.1,badjson:0.1"` makes `resilience.ts` inject
faults at those rates. Write a test per row, plus a **chaos run**: 20 briefs with faults on. Report the success rate,
retries per run and latency added. That table is strong evidence for the rubric's "failure handling, recovery".

---

## 3. Observability

| Signal | Implementation |
|---|---|
| **Traces** | Span tree per run: `run → step → llm_call / tool_call`. Attributes: run_id, step, agent spec ID + version, prompt version, model, effort, input/output/cache tokens, cost $, latency, retries, stop_reason, outcome. Written as JSONL to `../data/ai-runs/traces/`. Optionally export through OpenTelemetry if Perficient has a backend. |
| **Metrics** | Aggregated from traces: runs, success %, unverified %, critic pass on 1st try, p50/p95 latency per step, cost per brief, cache-hit ratio, retries, breaker opens. |
| **Logs** | Structured, run_id on every line; no customer free text in logs (data policy). |
| **Run Inspector UI** | A developer panel (or `/ai-runs` page): list of runs → step timeline (waterfall) → each step's inputs/outputs (redacted), tokens, cost, critic issues, retry history; *Resume* and *Re-run* buttons. |
| **User-visible correlation** | Error toasts include a short run ID, so a user report maps to a trace. |
| **Ops runbook** | `docs/ai-runbook.md`: what each alert/state means and what to do (breaker open, cost spike, critic failure spike). |

---

## 4. Build order

1. **Prerequisite:** SUM-T07..T10 (persist the summary), so an accepted draft can be saved.
2. Contracts + zod + orchestrator skeleton with deterministic steps only (Retriever, Guard), traced.
3. Writer → Analyst (with tools) → Critic loop.
4. Resilience module + fault injection + tests per failure row.
5. Checkpoints, resume, cancel, idempotency.
6. Budgets and circuit breaker.
7. SSE progress + UI states (loading, per-step progress, error with retry, unverified banner, empty) per Article V.
8. Run Inspector + runbook.
9. Chaos run + metrics snapshot → evidence.

## Evidence checklist for Topic 4

- [ ] Architecture diagram + ADR-0007 (why a code-driven workflow with agentic steps)
- [ ] Specs 022 and 024 with AOPS requirements, all ✅ with tests citing their IDs
- [ ] Failure-mode table above, with a passing test per row
- [ ] Chaos-run report (success %, retries, added latency)
- [ ] Resume-after-crash demo (kill the dev server mid-run, resume)
- [ ] Run Inspector screenshots: a normal run, a run with retries, an unverified run
- [ ] Sample trace JSONL (redacted) and metrics summary
- [ ] Runbook
