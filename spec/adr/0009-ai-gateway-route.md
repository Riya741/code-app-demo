# ADR-0009: Optional AI gateway route to the same model (Portkey, Anthropic-native)

- **Status:** Accepted 2026-11-23 by the project owner ([CR-20261123-1](../changes/CR-20261123-1-ai-gateway-mode.md))
- **Date:** 2026-11-23
- **Deciders:** Project owner

## Context
The brief pipeline ([024-agent-ops](../specs/024-agent-ops/requirements.md)) calls the model only through
`server/ai/client.ts`, which AOPS-T01 pinned to `https://api.anthropic.com` with `ANTHROPIC_API_KEY`. The owner has no
personal Anthropic API key, so the one live check of AIB-T03 cannot run, and nor can any later live eval
(EVAL-T06, which ADR-0007 needs) or the chaos run (AOPS-T10). The owner's employer provides an API key for its
Portkey AI gateway. The owner's instruction: *"do not use the PORTKEY if not needed. Use the PORTKEY for minimal
things only."*

A probe on 2026-11-23 (three tiny requests, no project data) showed:
- the gateway at `portkeygateway.perficient.com` accepts the **Anthropic-native** `POST /v1/messages` with the
  `anthropic-version` header, so the existing `@anthropic-ai/sdk` works with a different base URL;
- the model is addressed as `@aws-bedrock-use2/us.anthropic.claude-sonnet-5-5` (Portkey provider slug
  `@aws-bedrock-use2`: AWS Bedrock, us-east-2); the response's `model` is `us.anthropic.claude-sonnet-5-5`, the model
  the agent specs already name;
- structured output (`output_config.format` with a JSON schema, plus `effort`), a strict tool with `pattern`,
  `cache_control` on the system prompt and a tool, and `tool_choice: auto` all worked;
- the key (in `PORTKEY_API_KEY`) was sent as `x-portkey-api-key` and as `Authorization: Bearer`; which of the two is
  needed is left to the implementation's live check.

## Options considered
1. **Wait for a personal Anthropic key** (direct route only). No new party sees the data and nothing changes; but
   AIB-T03, the eval experiment and ADR-0007 stay blocked for an unknown time.
2. **Route A: Anthropic-native API through the gateway, opt-in.** Same SDK and the same `ModelClient` seam; only the
   base URL, one header and a model-ID prefix differ. Structured outputs, effort, prompt caching and `stop_reason`
   keep their meaning, so steps, contracts, fakes and replay fixtures are unchanged. Adds a party on the data path
   (the gateway operator, and AWS Bedrock as the host of the model), for fictional data only.
3. **Route B: the gateway's OpenAI-compatible `chat.completions`.** Needs a second client and a new dependency
   (Article VIII.2), a rewrite of the steps' request and response handling, and new fakes; it loses or re-maps
   `output_config` structured outputs, `effort`, `cache_control` and the stop reasons the resilience layer relies on.
4. **Gateway as the only route.** Simplest config, but makes the gateway the normal path, against the owner's
   instruction, and drops the direct route that a personal key would use.
5. **Point `ANTHROPIC_BASE_URL` at the gateway.** No code change, but the client ignores that variable on purpose
   (AOPS-T01), the SDK would send `ANTHROPIC_API_KEY` to the gateway, and the trace would not show where a call went.

## Decision
Option 2. The direct route stays the default; the gateway route is used only when `AI_GATEWAY=portkey` is set, with
`AI_GATEWAY_URL` and `AI_GATEWAY_MODEL_PREFIX`, and the key from `PORTKEY_API_KEY` (AOPS-ROUTE-001..005). The agent
specs and `AI_MODEL_<AGENT>` keep the plain model ID; the client adds the prefix only on the wire, so validation,
costs, budgets and traces are unchanged, and every trace records the route (AOPS-ROUTE-006). Tests never reach the
gateway (AOPS-ROUTE-007), and bulk runs through it need a separate opt-in (AOPS-ROUTE-008). ADR-0007 (which model)
is unchanged: this decision is about the route to the same model.

## Consequences
- Constitution Article XII.4 and XII.8 name the gateway as a way to reach the model provider (v1.1.2), and
  the [AI data policy](../steering/ai-data-policy.md) §1, §5 and §6 record the route, the extra party and its unknown
  retention (v1.1.0).
- A second optional secret, `PORTKEY_API_KEY` (SEC-SUPPLY-002 note, SEC-SUPPLY-005).
- Cost and budgets keep Anthropic list prices (`PRICES_PER_MTOK`); what the employer is billed for Bedrock may differ.
- Anthropic-only endpoints that the gateway may not offer, such as Message Batches (planned for EVAL-T04), are not
  assumed on the gateway route; the harness sends single requests there.
- A gateway configured with retries, fallbacks or a cache would hide work from the traces; the client rejects a
  response from a different model (AOPS-ROUTE-003), and the owner confirms the gateway configuration (CR open question).
- New work: AOPS-T12 (config, client, status, trace route, bulk guard, tests with a fake SDK, one live check);
  AIB-T03, EVAL-T04 and AOPS-T10 use it.

## Revisit when
- The owner gets a personal Anthropic API key: the gateway route can stay unused (no code change needed).
- The gateway operator's logging, retention or usage policy changes, or forbids this use.
- Real customer data is considered (ai-data-policy §5): the gateway route then needs its own data agreement.
- A later task needs an API feature that the gateway does not pass through.
