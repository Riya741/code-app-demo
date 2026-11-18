---
name: task-implement
description: Deliver one spec task (an ID like UCF-T07, SUM-T08, API-T09) through the project's agent workflow - set it 🔄 In progress, plan, have the implementer subagent build it with requirement-named tests and a hand-off file, run the gates, then have the reviewer subagent give a pass/fail verdict. Use when asked to implement, build, do or deliver a task by its ID.
argument-hint: <TASK-ID> [<TASK-ID> …]
---
<!-- Implements DEVA-SKILL-001 and DEVA-HAND-001 (spec/specs/026-dev-agents). Agents: AGENT-IMPLEMENTER, AGENT-TEST-WRITER, AGENT-REVIEWER. -->

# Deliver a task through the agent workflow

Arguments: one or more task IDs. Handle them one at a time, in dependency order (a task whose status says
`Depends on:` or `⛔ Blocked by` another open task waits for it).

## 1. Check the task can start
- Find it: `grep -rn "\*\*<TASK-ID>\*\*" spec/specs/*/tasks.md`. Read its Covers requirements and the spec's design.
- Stop and report if it is ✅ Done, or ⛔ Blocked by something still open.
- Shared work (spec/traceability.md §3, e.g. API-T09 = SUM-T07) is delivered once; mark both tasks together.

## 2. Start it (Article I, DEVA-GUARD-001)
- Set the task's status line to `🔄 In progress` (keep the rest of the line), update the file's **Summary** line, and
  run `py -I spec/scripts/spec_lint.py`. The spec-guard hook now allows code edits.
- If the task touches more than one file, write a short plan (files, approach, tests per requirement ID) first.

## 3. Build: implementer subagent
Launch the `implementer` subagent with: the task ID, the plan, the Covers requirement IDs, and any decisions from the
owner. It edits code and tests, runs the gates and writes `spec/handoffs/<TASK-ID>.md` with `verdict: pending`.
If its tests do not cover every Covers ID, launch the `test-writer` subagent for the missing ones.

## 4. Verify the gates yourself
Run `py -I spec/scripts/spec_lint.py`, `npm run lint`, `npm run typecheck`, `npm test`. Compare with the hand-off;
a mismatch is a finding for the reviewer.

## 5. Review: reviewer subagent (independent, read-only)
Launch the `reviewer` subagent with the task ID. It returns `VERDICT`, `FINDINGS` and `GATES`.
- **fail:** send the blocker/major findings back to the implementer (step 3) and review again. After two failed
  reviews, stop and ask the owner; leave the task 🔄 with the findings in the hand-off.
- **pass:** copy the verdict and findings into the hand-off's *Review* section and set `verdict: pass`,
  `reviewer: AGENT-REVIEWER`.

## 6. Hand back
Report: files changed, tests added, gate results, the review verdict and any manual G5 checks (UI changes: light and
dark theme, ≥ 1024px and < 1024px) that a person still has to do. Do not commit unless asked; the commit message
starts with the task ID. Then run `/task-close <TASK-ID>`.
