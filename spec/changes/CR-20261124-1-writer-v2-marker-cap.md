# Change Request: Writer prompt v2 and a marker cap in the Guard

- **ID:** CR-20261124-1
- **Author / date:** Project owner (direction), drafted with Claude Code · 2026-11-24
- **Type:** Behaviour change (AI pipeline quality)
- **Specs affected:** specs/022-ai-account-brief (requirements, design, tasks); agents/writer.md
- **Constitution articles affected:** none amended; XII applies (a prompt change passes gate G7 before merge)
- **Status:** Approved by the owner 2026-11-24 ("a small change for the quality findings") · branch `aib-t11-writer-v2`

## 1. Problem
The first live gateway run (AIB-T07 G5, `run_939c49a6…`) gave an unverified draft that was hard to read:
- the Writer wrote 441 words against a 350-word budget, so the Guard cut sentences (AIB-FMT-002);
- fact IDs appeared inside the sentence text, although prompt rule 4 forbids citation markers there;
- some sentences ended with 6 to 9 `[UC-…]` markers, which bury the sentence.

## 2. Proposed behaviour
- **Writer prompt v2** (`server/ai/prompts/writer.v2.md`, replaces v1): aim for 300 words or fewer (350 stays the hard
  limit), at most 4 sentences per section and about 25 words per sentence; never write a fact ID in `text`, bracketed
  or not; cite the 1 to 3 most direct fact IDs per sentence, and split a sentence that would need more. Agent spec
  AGENT-WRITER goes to 1.2.0 (guardrails change).
- **Marker cap in the Guard** (new AIB-CITE-005): at most 3 markers after a sentence, the first 3 known fact IDs in the
  Writer's order. The sentence's other known fact IDs are not shown as markers but stay in the draft's `citations`,
  and the citation check (AIB-CITE-003) still runs on all of them.
- **Measure** with one `eval:smoke` run through the gateway (16 calls, `AI_GATEWAY_ALLOW_BULK=1`, owner-approved),
  checked against `evals/thresholds.json`; gate G7 decides. There was no earlier eval report, so this run is the first
  baseline.

## 3. Spec impact
| File | IDs | Change |
|---|---|---|
| specs/022-ai-account-brief/requirements.md | AIB-CITE-005 | add (📝 Planned, then ✅ with AIB-T11) |
| specs/022-ai-account-brief/requirements.md | AIB-CITE-002, AIB-FMT-002 | Source: `writer.v2.md` |
| specs/022-ai-account-brief/design.md | — | Guard row: up to 3 markers per sentence; prompt v2 |
| specs/022-ai-account-brief/tasks.md | AIB-T11 | new task, ⬜ |
| agents/writer.md | AGENT-WRITER 1.2.0 | guardrails, prompt file, changelog |

## 4. Risks and rollout
- No contract, API, UI or workbook change. The UI shows the Guard's HTML as before.
- Fewer markers per sentence means a reader sees fewer sources inline; the full list stays in `citations`, and the
  eval graders read `fact_ids`, not markers, so G7 measures the same thing.
- **Undo:** point the Writer back at `writer.v1` (git history) and remove the cap.

## 5. Review
- [x] requirements.md approved by: owner (2026-11-24, in the request)
- [x] design.md approved by: owner (2026-11-24, in the request)
- [x] tasks.md approved by: owner (2026-11-24, in the request)
- [x] Implementation verified on: 2026-11-24 (AIB-T11; G7 passed on the gateway smoke run, [hand-off](../handoffs/AIB-T11.md))
