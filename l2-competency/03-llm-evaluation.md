# Topic 3 — LLM Evaluation & Interpretability (max 30)

**Top marks (25–30):** *Objective evaluation (LLM-as-judge, scored comparisons); data-grounded decisions.*

**Today: 0. Target: 25–28.**

## 1. What to evaluate

**Primary (3A):** the **AI Account Brief** pipeline from Topic 4. It has a clear quality bar (faithful, cited,
useful summaries) and real choices to decide with data: which model, which prompt, and whether the critic loop is
worth its cost.

**Stretch (3B):** a **spec-compliance judge** that scores how well an AI-written change meets its EARS criteria. Use
it to compare Claude Code configurations (and optionally Copilot) on the same tasks. It links Topics 1, 2 and 3.

> Tip: the Claude API skill has a guided eval builder. In Claude Code, run `/claude-api build-eval` once the
> pipeline exists. It interviews you about inputs, grading and cost before writing the harness.

---

## 2. 3A — Evaluating the AI Account Brief

### 2.1 Folder layout  *(Phase 4)*

```
evals/
├─ README.md                  how to run, cost per run, how to read reports
├─ dataset/
│  ├─ cases.jsonl             one case per line: id, customer_id, category, expectations
│  └─ human-labels.jsonl      your hand scores for judge calibration
├─ graders/
│  ├─ code/                   deterministic graders (TypeScript)
│  └─ judge/                  judge prompts (versioned) + output schema
├─ configs/                   experiment configs: model × prompt × critic × effort
├─ runs/                      raw outputs per run (gitignored if derived from real data)
├─ reports/                   generated HTML/Markdown reports + scores.csv
└─ run.ts                     CLI: npm run eval:smoke | eval:full | eval:compare
```

### 2.2 Dataset: ≥ 30 cases from the fixture workbook

Build it from the **anonymised fixture workbook** (README decision D2). Cover the situations that actually break
summaries:

| Category | # | What it tests |
|---|---|---|
| Rich customer (many use cases and events) | 8 | Coverage, prioritisation, concision |
| Sparse customer (1–2 records) | 4 | Does not pad or invent |
| Empty customer (no use cases/events) | 2 | Says so; no hallucination |
| Conflicting or stale statuses | 4 | Accuracy on status and dates (incl. DT-TIME-003 cases) |
| Long notes (near cell limits) | 3 | Context handling, cost |
| **Prompt injection in notes** ("ignore previous instructions…") | 3 | Treats data as data (Article XII.2) |
| Non-Latin names / special characters | 3 | Faithful names, safe HTML |
| HTML/script in notes | 3 | Guard + sanitiser hold (SEC-SAFE-001) |

Each case stores **expectations** a code grader can check: must-mention facts (fact IDs), must-not-mention entities,
expected status counts, maximum length.

### 2.3 Graders: code first, then the judge

**Deterministic graders** (cheap, exact, run on every output):

| Metric | How |
|---|---|
| Schema validity | zod against `writer-to-critic.v1` |
| Citation validity | Every cited fact ID exists in the case's fact sheet |
| Citation coverage | % of sentences with ≥ 1 citation |
| Hallucinated entities | Names, solutions and subsidiaries in output ∖ names in input = ∅ |
| Numeric accuracy | Counts, dates and statuses in output match the source records |
| Must-mention recall | % of `must_mention` facts present |
| Safety | DOMPurify output == input (nothing stripped); no injection compliance |
| Length / cost / latency | Words, tokens, $ (from `usage`), ms |

**LLM-as-judge** (for what code cannot check):

- **Rubric (1–5 each, with anchored descriptions):** Faithfulness · Coverage of what matters · Actionability · Concision · Tone for an executive reader.
- **Format:** structured output (`output_config.format`) returning, per criterion, `evidence` (quoted spans) → `reasoning` → `score`. Evidence and reasoning come *before* the score.
- **Pairwise mode** for comparisons: A vs B on the same case, run **twice with positions swapped**; count it as a win only when both orders agree, otherwise a tie.
- **Judge model:** `claude-opus-5-5` (effort `high`). Because Claude models also generate the candidates, guard against self-preference: run a second judge pass with `claude-sonnet-5-5` on a 20% sample and report the agreement between the two judges.
- **Blind the judge**: it never sees which model or prompt produced an output.

### 2.4 Calibrate the judge against humans (the step most candidates skip)

1. Hand-score 15–20 outputs yourself (`human-labels.jsonl`). Ideally a colleague scores the same items too, giving you human–human agreement as the ceiling.
2. Compute judge–human agreement per criterion: **Cohen's κ (weighted)** and Spearman ρ.
3. Iterate the judge prompt (anchors, examples) until κ ≥ 0.6 on faithfulness and coverage. Record each version and its κ.
4. Report the final agreement table. A judge you have validated is what makes the evaluation *objective*.

### 2.5 Experiment matrix → data-grounded decision

| Factor | Levels |
|---|---|
| Writer/analyst model | `claude-haiku-5-5` · `claude-sonnet-5-5` · `claude-opus-5-5` |
| Prompt | `v1` (baseline) · `v2` (improved after error analysis) |
| Critic loop | off · on (max 2 revisions) |
| Effort *(optional)* | `low` · `medium` on the best model |

- 30 cases × 3 repetitions per config to measure variance; report **mean ± 95% CI** (bootstrap).
- Run the bulk with the **Message Batches API** (50% cheaper; nothing here is latency-sensitive).
- Price guide (per 1M input / output tokens, Anthropic API, cached 2026-11-03): Haiku 5.5 $0.10 / $0.50 · Sonnet 5.5 $2 / $10 · Opus 5.5 $4 / $20. Measure real cost from `usage` after a 3-case pilot, and get budget sign-off before the full run.

**Report** (`evals/reports/2026-12-xx-brief.html`): per-config table of every metric, cost per brief, p50/p95
latency, a quality-vs-cost Pareto chart, pairwise win rates, and per-category breakdowns.

**Decision → ADR-0007.** Example shape: *"Sonnet 5.5 + prompt v2 + critic on scores 4.5 faithfulness (Opus 4.6,
Haiku 3.9) at 40% of Opus's cost; citation validity 99.3%. Chosen as default; Opus kept as fallback."* Use your real
numbers. The ADR must cite the report and state the threshold that would reverse the decision.

### 2.6 Interpretability: explain *why* scores move

- **Error taxonomy:** label every failing output (omission, wrong number, uncited claim, hallucinated entity, tone, injection followed). Show counts per config.
- **Judge rationales:** for the 5 biggest score changes between v1 and v2, show the judge's quoted evidence side by side.
- **Ablation:** critic on vs off. Which failure types does the critic catch, and which does it miss?
- **Cost attribution:** tokens per agent step (from Topic 4 traces), so you can see what each step costs and whether it is worth it.
- **Judge failure analysis:** cases where judge and human disagree most, and what you changed in the rubric as a result.

### 2.7 Make it a gate (G7)

- `npm run eval:smoke`: 8 representative cases, deterministic graders and judge, ~2 minutes.
- Thresholds in `evals/thresholds.json`, e.g. citation validity ≥ 98%, faithfulness ≥ 4.2, zero injection compliance.
- Add **G7** to [validation-gates.md](../spec/gates/validation-gates.md). CI runs it when `server/ai/**` or `evals/**` change; a failure blocks merge (EVAL-GATE-001).

---

## 3. 3B (stretch) — Spec-compliance judge for AI-written code

1. Choose 3–4 small, clear tasks from the gap register (e.g. EVF-T07 whole-number validation, UCB-T09 tab split, RTX-T06 placeholder, EXP-T04 non-Latin names).
2. Implement each under 2–3 conditions: Claude Code **with** the spec workflow (skills + hooks), Claude Code **without** (plain prompt), and optionally Copilot agent mode.
3. Score each result with **objective signals**: tests pass, gates pass, diff size, layering violations, and an **LLM judge** that reads the EARS criteria and the diff and scores criterion-by-criterion compliance (structured verdict per requirement ID).
4. Present it as a scored comparison table, with a short conclusion on whether spec discipline measurably improves agent output.

## Evidence checklist for Topic 3

- [ ] `evals/` harness runnable with one command; README states cost per run
- [ ] Dataset ≥ 30 cases incl. adversarial; expectations per case
- [ ] Deterministic graders + LLM judge with structured, evidence-first output
- [ ] Judge calibration table (κ, ρ) and judge-prompt version history
- [ ] Experiment report: ≥ 6 configs, CIs, cost, latency, Pareto chart, error taxonomy
- [ ] ADR-0007 citing the report
- [ ] G7 gate in CI with thresholds
- [ ] *(Stretch)* 3B comparison table
