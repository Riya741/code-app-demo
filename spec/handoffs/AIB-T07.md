---
contract: task-handoff.v1
task: AIB-T07
agent: session
covers: [AIB-GEN-004, AIB-GEN-011, AIB-GEN-012, AIB-GEN-017, AIB-GEN-018, AIB-GEN-019, AIB-GEN-020, AIB-HUMAN-012, AIB-HUMAN-003, AIB-HUMAN-005, AIB-HUMAN-006, AIB-HUMAN-007, AIB-HUMAN-009, AIB-HUMAN-010, AIB-HUMAN-011, AIB-CITE-004]
files_changed: [src/components/customers/CustomerDetails.tsx, src/components/customers/AiDraftBanner.tsx, src/components/customers/SummaryDialog.tsx, src/pages/Customers.tsx]
tests: [tests/component/AiBrief.test.tsx, tests/component/Customers.test.tsx]
gates: {G1: pass, G3: pass, G4: pass, G5: pass}
verdict: pass
reviewer: human
---
# Hand-off: AIB-T07 AI brief in the summary dialog

## What changed
The summary dialog gets these AI pieces:
- *Regenerate with AI*: disabled with a spinner while a run is going, and disabled with a tooltip while AI is
  unavailable;
- step progress in a polite live region, with *Cancel*;
- the run error with *Try again*;
- the draft view with *Save*, *Edit* and *Discard*, the AI-draft labels and the unverified banner;
- a confirm before a run replaces unsaved edits;
- on the reopen button: a spinner, a "draft ready" dot and a polite announcement.

With AI off, nothing changes.

## Criteria → evidence
- **Automated:** 15 dialog-state tests and 3 page tests, titled with the IDs (see the AIB-T09 hand-off).
- **G5 (owner, 2026-11-23/24):**
  - AI off;
  - replay mode: progress, cancel, error with *Try again*, and an own edit saved;
  - one live gateway run (unverified: 441 words cut to 350): draft label, actions, unverified banner and markers;
  - light and dark, at 1024px and wider and below 1024px.

## Gates
G1 0 errors · G3 0 errors (8 old warnings), typecheck clean · G4 suite passed · G5 pass (owner) · CI green (G6).

## Open questions
Quality findings from the live run, for a follow-up CR (Writer prompt v2 and a marker cap in the Guard):
- the Writer exceeded the word budget (441 words);
- fact IDs were written into the sentence text;
- some sentences end with 6–9 markers.

## Review
**Verdict: pass** (owner G5; session review of code and tests).
