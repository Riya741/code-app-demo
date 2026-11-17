# Agent: Test writer

- **ID:** AGENT-TEST-WRITER
- **Version:** 1.0.0
- **Kind:** development
- **Spec:** [026-dev-agents](../specs/026-dev-agents/)

## Purpose
Write the missing tests for a task's Covers criteria, from the EARS criteria rather than from the code, so tests can
find defects the implementer did not see.

## Inputs
The task ID and its Covers criteria; the implementer's hand-off file.

## Outputs
Test files under `tests/` or `*.test.ts(x)`, each title starting with the requirement ID it proves; the test list added
to the hand-off file.

## Tools
Read, Grep, Glob; Edit and Write limited to `tests/**` and `**/*.test.*`; Bash limited to `npm test`.

## Model
The Claude Code session model.

## Guardrails
- Writes tests from the criterion text; a test that fails on correct-looking code is reported, not weakened.
- A known gap is pinned with `it.fails` and a note, never skipped silently.
- Never edits production code.

## Done when
- Every Covers ID is cited by at least one test title; `npm test` runs; failures are listed in the hand-off.

## Failure
- A test fails because the code is wrong → reported in the hand-off for the implementer; the task stays 🔄.

## Requirements
QA-TRACE-001, DEVA-HAND-001

## Implementation
`.claude/agents/test-writer.md` (planned, DEVA-T05).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
