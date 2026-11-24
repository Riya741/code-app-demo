# Ops: a real run trace

[Spec 024-agent-ops](../../../spec/specs/024-agent-ops/requirements.md) · orchestrator `server/ai/orchestrator.ts` ·
tracing `server/ai/trace.ts` · pattern [ADR-0008](../../../spec/adr/0008-orchestration-pattern.md) · route
[ADR-0009](../../../spec/adr/0009-ai-gateway-route.md)

## The run
This is run `run_939c49a61324558d7eeed2ab`: the owner's live check of the AI Account Brief in the summary dialog
(AIB-T07 G5, 2026-11-24, before Writer prompt v2), through the Perficient Portkey gateway. The orchestrator wrote one
JSON line per span to `../data/ai-runs/traces/run_939c49a6….jsonl`, outside the repo.

Spans carry no workbook text, prompt or model output (AOPS-OBS-001, AOPS-OBS-002, ai-data-policy §6). The lines below are copied
unchanged, except that `parentId` is left out for width; the tree is shown instead.

```
run 36031bf3 ─ outcome ok, status UNVERIFIED, 38.2 s, $0.0762, 12,596 in / 4,135 out tokens, limits 60k tokens / $0.50 / 60 s
├─ step retrieve   89c055ed ─ 31 ms, ok                                         (code step, no model)
├─ step analyse    b67ea1be ─ 15.6 s, ok, AGENT-ANALYST 1.0.0, analyst.v1
│   └─ llm_call    b33b2a00 ─ claude-sonnet-5-5, effort medium, 10,697 in / 1,838 out, $0.0462, end_turn, route gateway
├─ step write      b08b1836 ─ 16.9 s, ok, AGENT-WRITER 1.1.0, writer.v1
│   └─ llm_call    5a4421e5 ─ claude-sonnet-5-5, effort medium, 1,899 in / 2,297 out, $0.0300, end_turn, route gateway
└─ step guard      c07cb5c0 ─ 5.7 s, ok                                         (code step: citations, HTML, sanitise, word budget)
```

The raw run span:

```json
{"spanId":"36031bf302cad7be","runId":"run_939c49a61324558d7eeed2ab","kind":"run","startedAt":"2026-11-24T16:28:38.415Z",
 "limits":{"maxTokens":60000,"maxCostUsd":0.5,"maxSeconds":60},
 "tokens":{"input":12596,"output":4135,"cacheRead":0,"cacheWrite":3851},"costUsd":0.0761695,"latencyMs":38237,
 "retries":0,"outcome":"ok","status":"unverified","route":"gateway","gatewayHost":"portkeygateway.perficient.com",
 "gatewayProvider":"@aws-bedrock-use2"}
```

The raw Writer model-call span:

```json
{"spanId":"5a4421e510b88469","runId":"run_939c49a61324558d7eeed2ab","kind":"llm_call","startedAt":"2026-11-24T16:28:54.055Z",
 "step":"write","agent":"AGENT-WRITER","agentVersion":"1.1.0","promptVersion":"writer.v1","model":"claude-sonnet-5-5",
 "effort":"medium","maxTokens":8000,"timeoutMs":45000,"revision":0,
 "tokens":{"input":1899,"output":2297,"cacheRead":0,"cacheWrite":1281},"costUsd":0.0299705,"latencyMs":16870,
 "retries":0,"stopReason":"end_turn","outcome":"ok","route":"gateway","gatewayHost":"portkeygateway.perficient.com",
 "gatewayProvider":"@aws-bedrock-use2"}
```

## What the trace answered
- **Why the draft was unverified:** every step was `ok`, but the run `status` was `unverified`. The Guard found
  citation and length problems in the Writer's output: 441 words against a 350-word budget, and long citation chains.
  The draft still reached the user, marked unverified, with the issues listed. It was not silently fixed
  (AIB-CITE-003).
- **Where the money and time went:** the Analyst was 61% of the cost ($0.046 of $0.076), mostly input tokens from the
  fact sheet. The two model steps took 32.5 of the 38.2 s.
- **Which prompt and agent version produced it:** `writer.v1` with `AGENT-WRITER` 1.1.0. That led to CR-20261124-1
  (Writer prompt v2 at agent 1.2.0), measured in [the smoke run](../eval/smoke-2026-11-24.md).
- **Which route it took:** `gateway` via `@aws-bedrock-use2` on every model span (AOPS-ROUTE-006). No key, prompt or
  output appears in any span.

## In place vs deferred
| Area | State |
|---|---|
| Orchestrator with contract validation at every hand-off; `invalid_output` fails the run, never repaired silently | ✅ AOPS-T01 |
| Read-only tools with an agent allow-list (`tool_denied`) | ✅ AOPS-T02 |
| Traces: run → step → model-call spans with tokens, cost, latency, versions, route; no free text | ✅ (sample above) |
| Run limits recorded on the run span (tokens, cost, seconds) | ✅ recorded. Enforcing budgets and the breaker is AOPS-T06 (deferred) |
| Retries, timeouts and fault injection (T03); repair retry (T04); checkpoints and resume (T05); metrics script (T07); Run Inspector and runbook (T08); replay fault tests (T09); chaos run (T10) | ⬜ Deferred by CR-20261123-2 |
