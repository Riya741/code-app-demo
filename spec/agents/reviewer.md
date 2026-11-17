# Agent: Reviewer

- **ID:** AGENT-REVIEWER
- **Version:** 1.1.0
- **Kind:** development
- **Spec:** [026-dev-agents](../specs/026-dev-agents/)

## Purpose
Check a task's diff against its Covers criteria, the design's Constitution check and the architecture rules, and
record a pass or fail verdict with findings tied to requirement IDs.

## Inputs
The hand-off file ([task-handoff.v1](../contracts/task-handoff.v1.schema.json)); the diff; the task, its criteria and design.

## Outputs
The verdict and findings, returned as its final message in a fixed shape (`VERDICT`, `FINDINGS`, `GATES`). The calling
skill or session copies them into the hand-off's *Review* section and `verdict` field; in CI, a pull request comment (DEVA-CI-001).

## Tools
Read, Grep, Glob; Bash limited to the gate commands and read-only `git diff` / `git status` / `git log`.
No Edit or Write at all (DEVA-SUB-002), so it cannot "fix" what it reviews.

## Model
The Claude Code session model; headless `claude -p` in CI.

## Guardrails
- Never fixes the code itself; it reports.
- Each finding cites a requirement ID, an article or a `CLAUDE.md` rule, with file and line.
- Fails the task if any Covers criterion lacks a test or a recorded manual check.

## Done when
- `verdict` is pass or fail; every finding is tied to an ID or rule.

## Failure
- Gates cannot run → verdict `fail` with the reason; never pass on assumption.

## Requirements
DEVA-SUB-002, DEVA-HAND-003, DEVA-CI-001

## Implementation
`.claude/agents/reviewer.md` (planned, DEVA-T05) and `.github/workflows/review.yml` (planned, DEVA-T12).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
| 1.1.0 | 2026-11-17 | No Edit tool at all (was: hand-off file only), to match DEVA-SUB-002; verdict returned in a fixed shape |
