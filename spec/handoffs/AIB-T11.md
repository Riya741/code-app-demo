---
contract: task-handoff.v1
task: AIB-T11
agent: session
covers: [AIB-CITE-005, AIB-CITE-002, AIB-FMT-002]
files_changed: [server/ai/prompts/writer.v2.md, server/ai/steps/writer.ts, server/ai/steps/llm.ts, server/ai/steps/guard.ts, server/ai/config.ts, spec/agents/writer.md]
tests: [tests/unit/ai-guard.test.ts, tests/integration/analyst-writer.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T11 Writer prompt v2 and a marker cap in the Guard

## What changed
CR-20261124-1, from the AIB-T07 quality findings. The Writer now uses `writer.v2` (AGENT-WRITER 1.2.0). The prompt aims
for 300 words or fewer (350 stays the hard limit) and 1 to 4 sentences per section. It forbids fact IDs in the sentence
text and asks for the 1 to 3 most direct fact IDs per sentence. The current prompt version of each step is set in one
place (`PROMPT_VERSIONS` in `llm.ts`). The Guard shows at most 3 markers after a sentence (`MARKER_CAP`), for the first
known IDs in the Writer's order. The other known IDs stay in `citations`, and the citation check still covers every ID.
No contract, API or UI change, so G5 is n/a.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AIB-CITE-005 | `tests/unit/ai-guard.test.ts`: "AIB-CITE-005 at most 3 markers per sentence, the first known IDs in the Writer's order; the rest stay in citations"; `tests/integration/analyst-writer.test.ts`: "AIB-CITE-005 the Writer prompt asks for 1 to 3 fact IDs per sentence and no fact ID in the sentence text" |
| AIB-CITE-002 | `tests/integration/analyst-writer.test.ts`: "AIB-CITE-002 each prompt cites its agent spec at the current version …" (now `writer.v2`, AGENT-WRITER 1.2.0) |
| AIB-FMT-002 | `tests/integration/analyst-writer.test.ts`: "AIB-FMT-002 the Writer prompt aims below the 350-word limit and caps sentences per section" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | passed |
| G7 | `npm run eval:smoke` (gateway, `AI_GATEWAY_ALLOW_BULK=1`, owner run 2026-11-24) | **passed**: 8 of 8 cases completed and verified; citation validity 1.00 and coverage 1.00; 0 hallucinated, must-not-mention, injection, unsafe-HTML, policy, numeric and over-words cases; cost $0.3452, mean latency 19.2 s; report `<AI_RUNS_DIR>/evals/2026-11-24T16-58-56-756Z-smoke/report.json` |

The findings, measured on the smoke run's Writer output:

| Finding (AIB-T07 live run, v1) | Smoke run, v2 (8 cases) |
|---|---|
| 441 words, cut to 350 by the Guard | 26 to 318 words (mean 228); none over budget, no `over_budget` issue |
| Fact IDs inside the sentence text | 1 sentence in 1 case (`conflicting-01`, Risks: "… including UC-50033 (2026-07-31, Implementing) …") |
| 6 to 9 markers on some sentences | at most 3 fact IDs per sentence in every case; the cap did not have to cut |

## Open questions
- **Recall (not gated):** 5 of 8 cases leave out `UC-50022` (`missing_mention_cases` 5; it is in no threshold). The
  1-to-4-sentence limit makes the Writer pick points, and this use case (not live, launch 2027-05-31) is dropped.
  There is no v1 smoke run to compare with, so this is a baseline, not a measured regression. The owner decides
  whether a `missing_mention_cases_max` threshold is wanted (a change request, EVAL-GATE-003).
- **IDs in text:** one case still writes IDs in a sentence. A deterministic Guard check could flag or strip them;
  not built (outside this CR).

## Review
**Verdict: pass** (session, 2026-11-24). The three findings are fixed or nearly fixed on the smoke set, and G7 passes.
Two non-blocking observations are recorded above as open questions, tied to AIB-CITE-002 and EVAL-GATE-003.
