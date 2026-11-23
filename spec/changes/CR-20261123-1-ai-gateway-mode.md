# Change Request: Optional AI gateway mode (same model through the employer's Portkey gateway)

- **ID:** CR-20261123-1
- **Author / date:** Project owner (request), drafted with Claude Code (spec author, AGENT-SPEC-AUTHOR@1.0.0) · 2026-11-23
- **Type:** Constitution amendment + New feature (server-side AI configuration; one status field and no automatic drafts on the gateway route; no workbook, contract or prompt change)
- **Specs affected:** specs/024-agent-ops, specs/019-security, specs/022-ai-account-brief (AIB-GEN-022, AIB-API-004 note, design, tasks),
  specs/023-ai-evaluation (task note); steering/ai-data-policy.md, steering/tech.md, steering/glossary.md,
  steering/constitution-mapping.md; new [ADR-0009](../adr/0009-ai-gateway-route.md)
- **Constitution articles affected:** Article XII.4 and XII.8 reworded (v1.1.1 → **v1.1.2**, PATCH, chosen by the owner (Q2); see
  D6 and open question Q2); compliance re-checked for III, VIII, X and XII
- **Status:** Approved 2026-11-23 by the project owner · branch `aib-t03-analyst-writer` · code follows in AOPS-T12

## 1. Problem
The owner has no personal Anthropic API key. The brief pipeline can only reach the model at `api.anthropic.com` with
`ANTHROPIC_API_KEY` (AOPS-T01 pinned the host on purpose), so:
- AIB-T03 is built and tested with a fake model, but its one live check (`tests/integration/analyst-writer.live.test.ts`)
  cannot run;
- the live eval experiment (EVAL-T06), and with it the model decision in ADR-0007, and the chaos run (AOPS-T10) cannot
  run either.

The owner's employer (Perficient) provides a key for its Portkey AI gateway. Owner request: the pipeline must be able
to reach **the same model the agent specs already name, `claude-sonnet-5-5`**, through that gateway, as an
alternative to the direct API, and *"do not use the PORTKEY if not needed. Use the PORTKEY for minimal things only."*

**Probe of 2026-11-23** (run by the session; three tiny requests, no project data):
- Gateway `https://portkeygateway.perficient.com/v1` accepts the **Anthropic-native** `POST /v1/messages` with the
  `anthropic-version` header, so the existing `@anthropic-ai/sdk` works with another base URL; no OpenAI client needed.
- Model at the gateway: `@aws-bedrock-use2/us.anthropic.claude-sonnet-5-5` (Portkey provider slug `@aws-bedrock-use2`
  = AWS Bedrock us-east-2); the response's `model` is `us.anthropic.claude-sonnet-5-5`.
- Key: the 28-character key in the user environment variable `PORTKEY_API_KEY`, sent as `x-portkey-api-key` (and as
  `Authorization: Bearer`). The smallest header set that works is for AOPS-T12's live check to confirm.
- Verified through the gateway: a basic messages call; structured output (`output_config.format` json_schema plus
  `effort`); a strict tool with `pattern`, `cache_control` on the system prompt and on a tool, `tool_choice: auto` →
  `tool_use` with valid input.

## 2. Proposed behaviour

### D1. Two routes to one model; the direct route stays the default (AOPS-ROUTE-001)
`AI_GATEWAY` selects the route: unset, blank or `none` → **direct** (today's behaviour, unchanged); `portkey` →
**gateway**; anything else is a config error and AI stays disabled. AI itself stays off unless `AI_ENABLED=true`
(Article XII.8). Nothing changes for anyone who does not set `AI_GATEWAY`.

### D2. Gateway settings, validated without echoing values (AOPS-ROUTE-002)
Read only when `AI_GATEWAY=portkey`, then required:
- `AI_GATEWAY_URL`: `https`, no user info, query or fragment, path not ending in `/v1`, host not `anthropic.com` or a
  subdomain. The SDK appends `/v1/messages` itself, so the value is the gateway root
  (`https://portkeygateway.perficient.com`), not the `…/v1` URL the probe used. AOPS-T12's live check confirms this.
- `AI_GATEWAY_MODEL_PREFIX`: `^@[a-z0-9][a-z0-9-]{0,62}/([a-z0-9-]{1,32}\.){0,4}$`, e.g. `@aws-bedrock-use2/us.anthropic.`.

Errors follow `loadAiConfig`'s rules: never throw, name the variable and the rule, never the value.

### D3. Same model, one model ID everywhere (AOPS-ROUTE-003)
The agent specs and `AI_MODEL_<AGENT>` keep plain Anthropic IDs (defaults unchanged; no agent-spec version bump).
The client sends `prefix + model` to the gateway only on the wire. `MODEL_ID` validation, `PRICES_PER_MTOK`, budgets
and the trace `model` keep the plain ID. A response whose `model` does not end with the plain ID (e.g. after a
gateway-side fallback) is a failed model call and is not used.

### D4. Credentials and keys (AOPS-ROUTE-004, AOPS-ROUTE-005, SEC-SUPPLY-005)
- Direct route: `ANTHROPIC_API_KEY` only; gateway route: `PORTKEY_API_KEY` only. `hasCredentials`, and `aiStatus`
  `no_credentials` in live mode, follow the selected route.
- Gateway route: the same SDK, `baseURL` = `AI_GATEWAY_URL`, the Portkey key in an explicit gateway header
  (`defaultHeaders`), `apiKey: null` and `authToken: null` so the SDK never reads or sends an Anthropic credential.
  The other hardening is unchanged: `maxRetries: 0`, `logLevel: "off"`, `openTelemetry: false`, `ANTHROPIC_BASE_URL`
  ignored.
- Direct route: `PORTKEY_API_KEY` is never read or sent.
- Both keys: environment only, never from a file, never committed, logged, traced, checkpointed or sent to the browser.

### D5. Minimal use (AOPS-ROUTE-007, AOPS-ROUTE-008)
- `npm test` never reaches the gateway or the Anthropic API: gateway-mode tests use an injected fake SDK; replay and
  fakes as today.
- Live calls through the gateway only on explicit opt-in:
  - a per-task live check, run once with `AI_LIVE_CHECK=1`;
  - runs the owner starts in the app with AI enabled and the gateway route configured.
- **Bulk runs need a separate opt-in.** On the gateway route, the eval harness (every command that calls a model live)
  and the chaos run refuse to start, before any call, unless `AI_GATEWAY_ALLOW_BULK=1`, and the refusal names that
  variable. Replay runs and `npm run ai:metrics` (reads traces, no calls) need nothing. The variable is meant to be set
  for one command, e.g. `$env:AI_GATEWAY_ALLOW_BULK = "1"; npm run eval:full`, then removed.

### D6. Traceability of the route (AOPS-ROUTE-006)
The run span and every `llm_call` span record `route` (`direct` | `gateway`) and, on the gateway route,
`gatewayHost` and `gatewayProvider` (e.g. `@aws-bedrock-use2`). They never record a key or a header value. So
Article XII.7 shows where every call went.

### D7. Constitution, data policy and ADR
- **Article XII.4 and XII.8 (PATCH, v1.1.2, approved).** XII.4: data goes to the model provider "directly, or through
  an AI gateway that the AI data policy names". XII.8: the model provider, reached directly or through that gateway,
  stays the only extra external service, and only while AI is enabled.
  - **Why PATCH:** Governance has MAJOR for an article removed or redefined, MINOR for an article added, PATCH for
    wording. No article or clause is added or removed. The rules stand: AI is optional; one model route at a time,
    used only while AI is enabled; data limited by the policy. The wording now names the gateway as a way to reach the
    same provider, as v1.1.1 reworded II.4 to match a specified rule. A MINOR bump (1.2.0) is defensible if the owner
    reads "a new external party" as a new provision (Q2).
- **AI data policy v1.1.0.**
  - §1 names both routes. The gateway route: Perficient Portkey gateway → AWS Bedrock us-east-2, fictional data only
    (ADR-0006), with the same allow-list, redaction and wrapping applied before the request leaves the server.
  - §5 adds the gateway's data handling to the preconditions for real data.
  - §6 adds the gateway's request logs, held outside the project with an unknown retention (Q1).
  - This CR is the change request §7 asks for when a provider route is added.
- **ADR-0009** (Accepted) records the choice:
  - chosen, route A: Anthropic-native through the gateway;
  - rejected, route B: OpenAI-compatible `chat.completions` (a client and step rewrite; loses structured-output,
    effort and caching semantics);
  - also weighed: wait for a personal key; gateway-only; `ANTHROPIC_BASE_URL`.
  - ADR-0007 (which model) is unchanged.

No user-facing text is added: with gateway credentials missing the UI shows the existing "AI unavailable" texts, and
config errors and the bulk refusal are developer output (server log, CLI), not app messages.

## 3. Spec impact
| File | IDs | Change |
|---|---|---|
| specs/024-agent-ops/requirements.md | AOPS-ROUTE-001..008 | add (📝 Planned), new story AOPS-R7; intro, header, out of scope, open questions, scenarios |
| | AOPS-FAIL-007 | dated note: "credentials" = the selected route's key; criterion unchanged |
| specs/024-agent-ops/design.md | — | overview; client and config rows; `Span` route fields; SDK notes; new section "Model route"; testing; alternatives; Constitution check III, VIII, X, XII |
| specs/024-agent-ops/tasks.md | AOPS-T12 | new (⬜); Summary line 12 tasks |
| | AOPS-T10 | Covers + AOPS-ROUTE-008, step (bulk guard), dependency on AOPS-T12 for the gateway |
| | AOPS-T03 | two steps: custom headers on both routes; no retry after a rejected model check |
| specs/019-security/requirements.md | SEC-SUPPLY-005 | add (📝 Planned); threat summary row |
| | SEC-SUPPLY-002 | criterion reworded to two optional keys, dated note; status stays ✅ |
| specs/019-security/design.md | — | Constitution check XII row |
| specs/022-ai-account-brief/tasks.md | AIB-T03 | step: live check through gateway mode after AOPS-T12 (skip condition accepts the selected route's key); status stays 🔄 |
| | AIB-T05, AIB-T10 | Covers + AIB-GEN-022; one step each (status field; no automatic start on the gateway route) |
| specs/022-ai-account-brief/requirements.md | AIB-GEN-022 | add (📝 Planned): no automatic draft on the gateway route (owner answer Q4) |
| | AIB-API-004 | dated note: the status response also carries `auto_draft` |
| specs/022-ai-account-brief/design.md | — | status shape gains `auto_draft`; automatic start checks it; error-handling row "Gateway route" |
| specs/023-ai-evaluation/tasks.md | EVAL-T04 | Covers + AOPS-ROUTE-008; step (bulk guard, single requests on the gateway route); depends on AOPS-T12 |
| constitution.md | — | XII.4, XII.8 reworded; v1.1.2; amendment log row |
| steering/ai-data-policy.md | — | v1.1.0: §1 routes, §5, §6 gateway logs, §7 note, change log |
| steering/constitution-mapping.md | — | §2 rows III and XII; §8 amendment re-check (v1.1.2) |
| steering/tech.md | — | runtime topology, AI configuration row, constraints, ADR-0009 in approved decisions |
| steering/glossary.md | — | terms "Model route" and "Gateway mode" |
| adr/0009-ai-gateway-route.md | — | new, Accepted |
| traceability.md | — | agent-ops source row, reverse lookup row, dependency chain |
| README.md | — | constitution v1.1.2, ADR 0001 … 0009, changes list, next tasks (AOPS-T12), dashboard 2026-11-23 (rows 019, 024 and totals; the 022 row also corrected for AIB-T03 🔄 In progress) |
| changes/CR-20261123-1-ai-gateway-mode.md | — | this CR |

**New task Covers lines:**
- AOPS-T12: AOPS-ROUTE-001..008, SEC-SUPPLY-005
- AOPS-T10 (changed): AOPS-TEST-003, AOPS-ROUTE-008
- EVAL-T04 (changed): EVAL-GATE-004, EVAL-EXP-003, AOPS-ROUTE-008
- AIB-T05 (changed): AIB-API-001..004, AIB-GEN-022
- AIB-T10 (changed): AIB-GEN-021, AIB-GEN-008, AIB-GEN-015, AIB-HUMAN-010, AIB-GEN-022

**Dependencies:** AOPS-T12 → the AIB-T03 live check (AIB-T03 is not marked done by this CR); AOPS-T12 → the gateway
route of EVAL-T04 and AOPS-T10.

Checked and unchanged:
- agents/analyst.md and agents/writer.md: the same model, so no version bump and no prompt header change.
- agents/eval-judge.md: its model choice is unchanged, see Q7.
- adr/0007 (model choice) and adr/0008 (orchestration).
- contracts/*: no hand-off changes.
- specs/017-design-system/messages-catalog.md: no new user-facing text.
- gates/gap-register.md: no new Gap or Partial, and the AOPS-FAIL-007 row is unchanged.
- specs/022: the status reasons are unchanged (the new `auto_draft` field is listed above).
- gates/validation-gates.md, workflow.md, templates.

## 4. Risks and rollout
- **A new party on the data path.** With the gateway route on, the fact sheet and the drafts pass through Perficient's
  Portkey gateway and AWS Bedrock (us-east-2). Only fictional data exists in the project (ADR-0006). The allow-list
  and redaction apply unchanged. Real data stays forbidden (ai-data-policy §5). The gateway stores request and
  response bodies; the retention period was not stated (Q1).
- **An employer credential.** Misuse or volume is the owner's exposure. Hence off by default, the live-check limit,
  the bulk opt-in, and the key never written anywhere.
- **Hidden gateway behaviour.** Gateway-side retries, fallbacks or a response cache would not show in traces. The
  model check catches a switch to another model; the rest depends on the gateway configuration (Q5: the owner is not sure; to confirm with the gateway administrator).
- **Feature parity.** Bedrock-served Claude may lack Anthropic-only endpoints. Message Batches are not assumed on the
  gateway route (EVAL-T04 step). Features the probe did not test are confirmed by the AIB-T03 live check.
- **Cost accounting.** Budgets use Anthropic list prices; the employer's Bedrock bill may differ (Q6: the key has a 40 USD spending cap).
- **`ANTHROPIC_CUSTOM_HEADERS`** would also reach the gateway; AOPS-T03 already decides how to handle it, now for both
  routes.
- **Gate G7** is not built yet (EVAL-T08). The route change alters no prompt or model, so the eval gate does not apply
  until it exists.
- **Rollout:** no workbook or contract change and no migration; `/api/ai/status` gains `auto_draft`, and the app starts no automatic draft on the gateway route (AIB-GEN-022). Unset `AI_GATEWAY` → exactly today's behaviour.

## 5. Review
- [x] requirements.md approved by: project owner, 2026-11-23
- [x] design.md approved by: project owner, 2026-11-23
- [x] tasks.md approved by: project owner, 2026-11-23
- [ ] Implementation verified on: — (AOPS-T12; AIB-T05, AIB-T10 for AIB-GEN-022)

## 6. Open questions for the owner
1. **Q1, data handling at the gateway.**
   - Does Perficient's Portkey log request and response bodies (prompts, fact sheets, drafts)? For how long, and who
     can see them?
   - Is sending this project's fictional demo data (ADR-0006) through it allowed under Perficient's acceptable-use and
     AI policies, and is the AWS Bedrock us-east-2 region acceptable?
   - The answers go into ai-data-policy §6 (currently "unknown").
2. **Q2, PATCH or MINOR for the Constitution amendment.** The recommendation is PATCH (1.1.2): wording names the
   gateway, no clause is added, and v1.1.1 is the precedent. Choose MINOR (1.2.0) if a new external party should
   count as a new provision.
3. **Q3, the bulk opt-in.** Is `AI_GATEWAY_ALLOW_BULK=1`, set for one command, the right form? Alternatives:
   - a command-line flag on the eval and chaos commands (`--allow-gateway`);
   - a hard cap on model calls per command on the gateway route;
   - a confirmation prompt that shows the pilot's measured cost (EVAL-EXP-003) before a full run.
4. **Q4, automatic drafts in the app on the gateway route.** AIB-GEN-021 starts one run (two model calls) whenever a
   customer without a saved summary is selected. "Minimal things only" suggests turning automatic runs off on the
   gateway route, so only *Regenerate with AI* starts a run. If you agree, a follow-up change adds a 022 requirement;
   this CR does not change 022 behaviour.
5. **Q5, gateway configuration.** Can you confirm that the Portkey key's configuration has no retries, no fallback to
   other models and no response cache, so traces show what really happened?
6. **Q6, cost.** Is the employer billed per token at Bedrock prices, and is there a spending cap for this key?
   Budgets will keep using Anthropic list prices as an estimate.
7. **Q7, other models at the gateway.** Only `claude-sonnet-5-5` was verified. The eval judge (EVAL-JUDGE-008) uses
   `claude-opus-5-5`, and the experiment compares Haiku, Sonnet and Opus (ADR-0007). Are these available under the
   same prefix? If not, those runs need the direct route or a narrower experiment.

For the implementation (not the owner), settled by AOPS-T12's one live check:
- the smallest header set (`x-portkey-api-key` alone, or with `Authorization: Bearer`);
- the base URL without `/v1`;
- the exact response `model`.

### Owner answers (2026-11-23)
| # | Answer | Effect |
|---|---|---|
| Q1 | Perficient's Portkey stores request and response bodies; sending this project's fictional data through it to AWS Bedrock (us-east-2) is allowed. The retention period was not stated. | ai-data-policy §6 row updated; retention stays an open point. Real data stays forbidden (§5). |
| Q2 | PATCH (1.1.2) | Constitution amendment stays PATCH. |
| Q3 | `AI_GATEWAY_ALLOW_BULK=1` is the bulk opt-in. | AOPS-ROUTE-008 as written. |
| Q4 | Yes: no automatic drafts on the gateway route. | New **AIB-GEN-022** (📝 Planned), covered by AIB-T05 (status field `auto_draft`) and AIB-T10 (no automatic start). |
| Q5 | Not sure whether the key's gateway configuration has retries, fallbacks or a response cache. | Stays open; the owner asks the gateway administrator. Not blocking: the model check (AOPS-ROUTE-003) catches a fallback to another model, and the spending cap bounds the cost. |
| Q6 | The key has a **40 USD** spending cap. | Recorded in §4. Budgets keep Anthropic list prices as an estimate. |
| Q7 | Opus and Haiku are also available through the gateway. | The eval judge and the ADR-0007 experiment may use the gateway route under the bulk opt-in; their exact gateway model IDs are confirmed when those tasks run. |

