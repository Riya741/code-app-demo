# ADR-0008: Code-driven workflow with agentic steps for the AI Account Brief

- **Status:** Accepted
- **Date:** 2026-11-17
- **Deciders:** Project owner

## Context
The brief pipeline turns a customer's records into a cited draft. Its steps are known in advance (gather facts,
analyse, write, check, make safe), the output goes in front of executives, and errors are costly: a wrong number in a
summary is worse than no summary. The pipeline must be observable, resumable after a crash and bounded in cost
(Article XII.7, [024-agent-ops](../specs/024-agent-ops/requirements.md)).

## Options considered
1. **Single prompt** — one call writes the summary. Cheapest and simplest; no place to check citations or redo a bad
   section.
2. **Autonomous agent loop** — one agent with tools decides what to read, write and check until it is satisfied.
   Flexible, but its path, cost and duration vary per run, it is hard to resume at a known point, and its failures are
   hard to attribute to a step.
3. **Code-driven workflow with agentic steps** — the orchestrator is a fixed state machine; inside steps, LLM agents
   have bounded autonomy (the Analyst may call read-only tools; the Critic may send work back to the Writer at most
   twice).

## Decision
Option 3. The orchestrator runs retrieve → analyse → write → critique → guard. Two steps are deterministic code
(Retriever, Guard), three are LLM agents, and every hand-off is a validated contract. Agent autonomy is limited to
choosing which read-only tools to call and to the bounded revision loop.

## Consequences
- Every run has the same span tree, so traces, metrics, checkpoints and the Run Inspector are simple.
- Failure handling is per step and testable by fault injection (AOPS-TEST-002).
- Adding a step means changing code and a spec, not a prompt: that is intended (Article XII.1).
- Less flexible than an agent loop for open-ended questions; acceptable because the brief is not open-ended.

## Amendment 2026-11-21 (CR-20261121-1)
The Critic and its revision loop are removed to cut tokens per run, which the *Revisit when* list below anticipated.
The workflow is now retrieve → analyse → write → guard, a straight line (AOPS-ORCH-006). Retriever, Guard and the
orchestrator are code steps without agent specs; the Analyst and the Writer are the only LLM agents. The Guard's
deterministic citation checks verify drafts (AIB-CITE-003) and mark failures `unverified` (AOPS-FAIL-008). Option 3
still holds; only the bounded revision loop is gone.

## Revisit when
- The feature grows into open-ended questions about a customer ("why is adoption falling?"), where an agent loop with
  read-only tools may fit better.
- ~~Eval data shows the critic loop adds no quality: then simplify to fewer steps.~~ Done by CR-20261121-1 (cost).
- Eval data shows drafts often end `unverified` (EVAL-EXP-006): then consider a revision step again, through a CR.
