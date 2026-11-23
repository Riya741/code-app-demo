---
name: task-implement
description: Deliver one spec task (an ID like UCF-T07, SUM-T08, API-T09) through the project's workflow in the main session - set it 🔄 In progress, plan, build it with requirement-named tests, run the related tests and the gates, write the hand-off file, then review the diff against the criteria and record a pass/fail verdict. Use when asked to implement, build, do or deliver a task by its ID.
argument-hint: <TASK-ID> [<TASK-ID> …]
---
<!-- Implements DEVA-SKILL-001, DEVA-HAND-004 and DEVA-SUB-003 (spec/specs/026-dev-agents). No subagents (CR-20261121-1). -->

# Deliver a task (main session, no subagents)

Arguments: one or more task IDs. Handle them one at a time, in dependency order (a task whose status says
`Depends on:` or `⛔ Blocked by` another open task waits for it). Do everything in this session: a subagent would
start cold and read the same context again (DEVA-SUB-003).

## 1. Check the task can start
- Find it: `grep -rn "\*\*<TASK-ID>\*\*" spec/specs/*/tasks.md`. Read its Covers requirements and only the design
  sections they need.
- Stop and report if it is ✅ Done, or ⛔ Blocked by something still open.
- Shared work (spec/traceability.md §3, e.g. API-T09 = SUM-T07) is delivered once; mark both tasks together.

## 2. Start it (Article I, DEVA-GUARD-001)
- Set the task's status line to `🔄 In progress` (keep the rest of the line), update the file's **Summary** line, and
  run `py -I spec/scripts/spec_lint.py`. The spec-guard hook now allows code edits.
- If the task touches more than one file, write a short plan (files, approach, tests per requirement ID) first.

## 3. Build
- Edit code and tests. Every test title starts with the Covers ID it proves; write a test for each Covers ID from the
  criterion text, not from the code.
- While building, run **only the related tests**: `npx vitest related <changed files> --run` (the Stop hook does the
  same). Do not run the whole suite after every change.

## 4. Gates (once, when the build is done)
Run `py -I spec/scripts/spec_lint.py`, `npm run lint`, `npm run typecheck` and the related tests. The full `npm test`
runs once, at the end of this step or in `/task-close` (gate G4), not after every edit.

## 5. Hand-off (DEVA-HAND-004)
Write `spec/handoffs/<TASK-ID>.md` from `spec/templates/handoff.md` with `agent: session` and `verdict: pending`:
covers, files changed, tests, gate results, open questions.

## 6. Review against the criteria
Read `git diff` for the task's files and check each Covers criterion (EARS text), the design's Constitution check and
the CLAUDE.md rules. Record the verdict and findings (each tied to a requirement ID, article or rule) in the
hand-off's *Review* section:
- **fail:** fix the findings (step 3) and review again. After two failed reviews, stop and ask the owner; leave the
  task 🔄 with the findings in the hand-off.
- **pass:** set `verdict: pass` and `reviewer: session`. If the owner reviews instead, use `reviewer: human`.

## 7. Hand back
Report: files changed, tests added, gate results, the review verdict and any manual G5 checks (UI changes: light and
dark theme, ≥ 1024px and < 1024px) that a person still has to do. Do not commit unless asked; the commit message
starts with the task ID. Then run `/task-close <TASK-ID>`.
