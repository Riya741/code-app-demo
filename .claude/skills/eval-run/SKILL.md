---
name: eval-run
description: Run the AI Account Brief evaluation suite (smoke or full) and compare it with the baseline report, explaining score changes and G7 threshold results. Use when asked to run evals, check AI quality, test a prompt or model change, or run gate G7.
argument-hint: "[smoke|full|compare]"
---
<!-- Implements DEVA-SKILL-001 (spec/specs/026-dev-agents) for spec 023-ai-evaluation. Agent: AGENT-EVAL-ANALYST. -->

# Run the evals

1. If `evals/` does not exist, say that the eval harness arrives in Phase 4 (spec 023, tasks EVAL-T01..T10) and stop.
2. `smoke` (default) and `compare` cost little and may run directly. `full` calls the model many times: run the
   3-case pilot first (`npm run eval:full -- --pilot 3`), show the measured cost per configuration, and wait for
   the owner's explicit go-ahead (EVAL-EXP-003).
3. Launch the `eval-analyst` subagent with the mode and the baseline report path from `evals/reports/`.
4. Report each G7 threshold (`evals/thresholds.json`) as pass or fail, the three largest changes with evidence, and
   the report path. A failing threshold blocks merging a prompt or model change (EVAL-GATE-001).
