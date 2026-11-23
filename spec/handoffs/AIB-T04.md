---
contract: task-handoff.v1
task: AIB-T04
agent: session
covers: [AIB-SAFE-002, AIB-FMT-002, AIB-CITE-004, AIB-CITE-003]
files_changed: [server/ai/steps/guard.ts, tests/unit/ai-guard.test.ts, tests/integration/analyst-writer.live.test.ts]
tests: [tests/unit/ai-guard.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: session
---
# Hand-off: AIB-T04 Guard step

## What changed
`server/ai/steps/guard.ts` adds `guardStep`, the pipeline's last step. It is code only: no model and no tools.
- **Citation checks (AIB-CITE-003):** an uncited factual sentence or an unknown fact ID adds an issue that names the
  sentence by section and position, and makes the draft `unverified`. The issue texts are fixed and listed in the
  messages catalog §5, and never contain model text.
- **Budget (AIB-FMT-002):** the limit is 350 words, not counting markers. Over it, each section keeps its first
  sentence, and the other sentences are kept in order while they fit. An `over_budget` issue reports the cut.
- **HTML (AIB-SAFE-002, AIB-CITE-004):** the HTML is built from escaped text. It contains only `<p><strong>Heading</strong></p><p>…</p>`, with
  `[UC-123]` markers for known IDs after each sentence, and then goes through DOMPurify (the RTX-SAN-001 settings) on a
  jsdom window that is created on first use.
- **Final check:** brief-draft.v1 validation; a failure throws `GuardError` (`invalid_output`), which the routes show as
  "Draft did not pass the final check".
- **Live test:** now uses the real guard, so it checks the whole pipeline. It has not been re-run (gateway use kept to a minimum).

## Criteria → evidence
| Requirement | Evidence |
|---|---|
| AIB-CITE-003 | `tests/unit/ai-guard.test.ts`: "AIB-CITE-003 a draft whose factual sentences all cite known fact IDs is verified …", "AIB-CITE-003 an uncited factual sentence or an unknown fact ID makes the draft unverified …" |
| AIB-SAFE-002 | "AIB-SAFE-002 the HTML is built by code from escaped sentences …", "AIB-SAFE-002 the final check rejects …" |
| AIB-CITE-004 | "AIB-CITE-004 each sentence ends with bracketed markers …" (shown in the editor by AIB-T07) |
| AIB-FMT-002 | "AIB-FMT-002 the word count excludes citation markers …", "AIB-FMT-002 a draft over 350 words is cut …" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 0 errors |
| G3 | `npm run lint` · `npm run typecheck` | 0 errors (8 old warnings) · clean |
| G4 | `npm test` | 28 files passed, 1 skipped; 355 passed, 1 expected fail, 1 skipped |

## Open questions
- **Over-budget behaviour.** The spec gives a limit but no action for a draft over it. This task chose to cut the
  draft and report the cut (the draft becomes `unverified`) rather than fail the run. The owner may change that.
- **jsdom** is a devDependency. That is fine for this dev-server-only app. A production build would need it moved to `dependencies`.

## Review
**Verdict: pass** (session, 2026-11-23).
- Article III: no model text is inserted as markup, and the output is sanitised.
- Article V: every issue text is in the catalog.
- Article XII.5: the citation checks are deterministic.
- Test titles start with requirement IDs, and no test was weakened.
