# ADR-0007: Model and prompt setting for the AI Account Brief

- **Status:** Proposed — the decision is made from eval data in Phase 4 (EVAL-T07)
- **Date:** 2026-11-17 (opened)
- **Deciders:** Project owner

## Context
The brief pipeline ([022-ai-account-brief](../specs/022-ai-account-brief/requirements.md)) has two LLM steps
(Analyst, Writer; the Critic was removed by CR-20261121-1). Each needs a model and a prompt version. Article XII.6 says such choices are accepted only from an evaluation, recorded in an ADR that cites the report.
This ADR is opened now so the agent specs can point to it; it is filled in from data, not opinion.

## Options considered
The experiment ([023-ai-evaluation](../specs/023-ai-evaluation/requirements.md), EVAL-EXP-006) compares:

| # | Model | Prompt | Question |
|---|---|---|---|
| 1 | `claude-haiku-5-5` | v2 | Which model? |
| 2 | `claude-sonnet-5-5` | v2 | Which model? (baseline) |
| 3 | `claude-opus-5-5` | v2 | Which model? |
| 4 | best of 1–3 | v1 | Does prompt v2 help? |

The critic on/off configurations were dropped with the Critic (CR-20261121-1). Since CR-20261121-2, the eval judge
(AGENT-EVAL-JUDGE, on a model different from the Writer) adds faithfulness, coverage, actionability and tone scores;
they inform this decision only while calibrated against human labels (EVAL-CAL-007).

**Decision rule (set before the data):** choose the cheapest configuration whose deterministic grader scores
(EVAL-CODE-002..004) are not significantly below the best (95% CIs overlap), whose citation validity is ≥ 98%, and which follows no injected instruction. Keep the
next-best model as fallback.

## Decision
*Pending.* Until this ADR is accepted, the agent specs use the interim default `claude-sonnet-5-5` with effort
`medium` for every LLM step, so development runs are affordable and comparable.

## Consequences
- Agent specs [analyst](../agents/analyst.md) and [writer](../agents/writer.md) take their model from this ADR;
  changing it bumps their versions.
- Gate G7 thresholds (EVAL-GATE-005) are re-checked against the chosen configuration.

## Revisit when
- A new model is released, prices change, or G7 fails after a provider-side change.
- The reversal threshold recorded here at acceptance is crossed.
