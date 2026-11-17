# Requirements — AI Evaluation

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| 023-ai-evaluation | EVAL | 📝 Planned (CR-20261117-1) | I, X, XII |

## Introduction
How the AI Account Brief is measured, so that model, prompt and design choices are made from data (Article XII.6). It
covers the dataset, deterministic graders, an LLM judge calibrated against human scores, the experiment matrix behind
[ADR-0007](../../adr/0007-model-and-prompt-choice.md), and gate **G7**. Evaluation uses fictional fixtures only
([ai-data-policy](../../steering/ai-data-policy.md)).

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### EVAL-R1 — Dataset
**User story:** As the developer, I want a fixed set of cases that covers the situations that break summaries, so that
every comparison is like for like.

#### EVAL-DATA-001: At least 30 cases in 8 categories
- **Status:** 📝 Planned
- **Criterion:** THE dataset `evals/dataset/cases.jsonl` SHALL hold at least 30 cases covering: rich, sparse, empty, conflicting or stale statuses, long notes, prompt injection in notes, non-Latin names, and HTML or script in notes.

#### EVAL-DATA-002: Cases come from generated fixtures
- **Status:** 📝 Planned
- **Criterion:** EVERY case SHALL reference a customer in a workbook produced by `scripts/generate_demo_workbook.py` with a recorded seed, plus planted records where a category needs them, so the dataset is reproducible and contains no real data.

#### EVAL-DATA-003: Adversarial cases
- **Status:** 📝 Planned
- **Criterion:** THE dataset SHALL contain at least 3 cases each for prompt injection, HTML/script in notes and non-Latin names.

#### EVAL-DATA-004: Expectations per case
- **Status:** 📝 Planned
- **Criterion:** EVERY case SHALL store machine-checkable expectations: `must_mention` fact IDs, `must_not_mention` entities, expected counts by status, and a maximum word count.

#### EVAL-DATA-005: Dataset is versioned
- **Status:** 📝 Planned
- **Criterion:** WHEN cases are added, removed or changed THE dataset version in `evals/dataset/VERSION` SHALL be bumped and every report SHALL name the dataset version it used.

### EVAL-R2 — Deterministic graders
**User story:** As the developer, I want exact checks for what code can verify, so that the judge only scores what code cannot.

#### EVAL-CODE-001: Schema validity
- **Status:** 📝 Planned
- **Criterion:** THE grader SHALL check every hand-off and the final draft against its contract and report the share that validates.

#### EVAL-CODE-002: Citation validity and coverage
- **Status:** 📝 Planned
- **Criterion:** THE grader SHALL report citation validity (cited fact IDs that exist in the fact sheet) and citation coverage (factual sentences with at least one citation).

#### EVAL-CODE-003: Hallucinated entities
- **Status:** 📝 Planned
- **Criterion:** THE grader SHALL list names of people, customers, subsidiaries, departments and solutions in the draft that are not in the fact sheet.

#### EVAL-CODE-004: Numeric and status accuracy
- **Status:** 📝 Planned
- **Criterion:** THE grader SHALL compare counts, statuses and dates stated in the draft with the case's source records and report mismatches.

#### EVAL-CODE-005: Safety and data policy
- **Status:** 📝 Planned
- **Criterion:** THE grader SHALL fail a case IF sanitising the draft changes it, IF the draft follows an instruction planted in data, or IF the fact sheet contains a field or an unredacted email outside the AI data policy.

#### EVAL-CODE-006: Length, cost and latency
- **Status:** 📝 Planned
- **Criterion:** THE grader SHALL record words, input/output/cache tokens, cost in dollars (from API `usage`) and latency per case and per step.

### EVAL-R3 — LLM judge
**User story:** As the developer, I want a judge for faithfulness and usefulness, so that quality that code cannot
measure is still scored consistently.

#### EVAL-JUDGE-001: Anchored rubric
- **Status:** 📝 Planned
- **Criterion:** THE judge SHALL score faithfulness, coverage, actionability, concision and executive tone from 1 to 5, each against written anchor descriptions.

#### EVAL-JUDGE-002: Evidence before score
- **Status:** 📝 Planned
- **Criterion:** THE judge SHALL return structured output per criterion with quoted `evidence`, then `reasoning`, then `score`, validated against its schema.

#### EVAL-JUDGE-003: Blind judging
- **Status:** 📝 Planned
- **Criterion:** THE judge SHALL NOT receive the model, prompt version or configuration that produced an output.

#### EVAL-JUDGE-004: Position-swapped pairwise comparisons
- **Status:** 📝 Planned
- **Criterion:** WHEN two outputs are compared pairwise THE judge SHALL run twice with positions swapped, and a win SHALL count only when both orders agree; otherwise the result is a tie.

#### EVAL-JUDGE-005: Second judge on a sample
- **Status:** 📝 Planned
- **Criterion:** THE harness SHALL score a 20% sample with the other calibrated judge model and report the agreement between the two judges, to expose self-preference.

### EVAL-R4 — Judge calibration
**User story:** As the assessor, I want evidence that the judge agrees with people, so that its scores mean something.

#### EVAL-CAL-001: Human labels
- **Status:** 📝 Planned
- **Criterion:** THE project SHALL keep 15 to 20 human-scored outputs in `evals/dataset/human-labels.jsonl`, using the judge's rubric.

#### EVAL-CAL-002: Agreement statistics
- **Status:** 📝 Planned
- **Criterion:** THE harness SHALL compute weighted Cohen's κ and Spearman ρ between judge and human scores per criterion.

#### EVAL-CAL-003: Calibration threshold
- **Status:** 📝 Planned
- **Criterion:** THE judge SHALL be used for decisions only WHILE its weighted κ is at least 0.6 on faithfulness and on coverage.

#### EVAL-CAL-004: Judge prompt history
- **Status:** 📝 Planned
- **Criterion:** EVERY judge prompt version SHALL be kept with its κ and ρ, and the report SHALL name the version used.

### EVAL-R5 — Experiments and decisions
**User story:** As the developer, I want the model, prompt and critic choices compared on the same cases, so that
ADR-0007 is decided by data.

#### EVAL-EXP-001: Experiment configurations
- **Status:** 📝 Planned
- **Criterion:** THE experiment SHALL run at least six configurations that answer: which model (Haiku, Sonnet, Opus with prompt v2 and critic on), whether prompt v2 beats v1, and whether the critic is worth its cost (critic off on two models).

#### EVAL-EXP-002: Repetitions and confidence intervals
- **Status:** 📝 Planned
- **Criterion:** EVERY configuration SHALL run each case at least twice, and the report SHALL show the mean with a 95% bootstrap confidence interval for every metric.

#### EVAL-EXP-003: Pilot before the full run
- **Status:** 📝 Planned
- **Criterion:** WHEN a full experiment is planned THE harness SHALL first run a 3-case pilot and report the measured cost per configuration before the full run starts.

#### EVAL-EXP-004: Report
- **Status:** 📝 Planned
- **Criterion:** THE report SHALL show per configuration every metric, cost per brief, p50/p95 latency, a quality-versus-cost chart, pairwise win rates and per-category results.

#### EVAL-EXP-005: Decision recorded in ADR-0007
- **Status:** 📝 Planned
- **Criterion:** THE chosen model, prompt and critic setting SHALL be recorded in ADR-0007 citing the report and stating the result that would reverse the decision.

### EVAL-R6 — Explaining the scores
**User story:** As the assessor, I want to see why scores move, not only that they move.

#### EVAL-WHY-001: Error taxonomy
- **Status:** 📝 Planned
- **Criterion:** THE report SHALL label every failing output with an error type (omission, wrong number, uncited claim, hallucinated entity, tone, injection followed) and count them per configuration.

#### EVAL-WHY-002: Cost attribution per step
- **Status:** 📝 Planned
- **Criterion:** THE report SHALL show tokens and cost per pipeline step, taken from the run traces (AOPS-OBS-001).

#### EVAL-WHY-003: Judge disagreement review
- **Status:** 📝 Planned
- **Criterion:** THE report SHALL list the cases where judge and human disagree most and the rubric changes made as a result.

### EVAL-R7 — Gate G7
**User story:** As the developer, I want quality protected like any other behaviour, so that a prompt tweak cannot
silently make the summaries worse.

#### EVAL-GATE-001: Smoke suite blocks regressions
- **Status:** 📝 Planned
- **Criterion:** WHEN a prompt or model changes THE eval smoke suite SHALL run and fail the build IF faithfulness < 4.2/5, citation validity < 98%, or any case follows an injected instruction.

#### EVAL-GATE-002: Recorded outputs on every PR
- **Status:** 📝 Planned
- **Criterion:** WHEN a pull request changes `server/ai/**` or `evals/**` CI SHALL run the code graders on the recorded outputs, without calling the model, and fail on any threshold breach.

#### EVAL-GATE-003: Thresholds under change control
- **Status:** 📝 Planned
- **Criterion:** THE thresholds SHALL live in `evals/thresholds.json`, and lowering one SHALL require a change request that cites a report.

#### EVAL-GATE-004: One-command runs with stated cost
- **Status:** 📝 Planned
- **Criterion:** THE harness SHALL run with `npm run eval:smoke`, `eval:full` and `eval:compare`, and `evals/README.md` SHALL state the measured cost of each.

## Out of scope
- Online evaluation of real user sessions (no real users or data).
- Fine-tuning or training models.

## Open questions
- Whether a second human labeller is available for a human–human agreement ceiling (EVAL-CAL-001).

## Scenarios
- Prompt v2 changes one instruction → CI code graders pass on recorded outputs → the developer runs `eval:smoke` before
  merge → faithfulness 4.4, citation validity 99% → G7 passes.
- A new prompt makes the injection case praise the customer → `injection_followed` > 0 → G7 fails → merge blocked.
- Judge κ on coverage is 0.52 → judge not used for decisions → rubric anchors rewritten, v2 reaches 0.66 → history kept.
