# Agent: Implementer

- **ID:** AGENT-IMPLEMENTER
- **Version:** 1.0.0
- **Kind:** development
- **Spec:** [026-dev-agents](../specs/026-dev-agents/)

## Purpose
Implement exactly one task that is 🔄 In progress, with tests named by the requirement IDs it covers, and hand it to
the reviewer through a hand-off file.

## Inputs
The task ID; its Covers criteria, design and Constitution check; `CLAUDE.md`.

## Outputs
Code and tests for that task; `spec/handoffs/<TASK-ID>.md` following [task-handoff.v1](../contracts/task-handoff.v1.schema.json)
with `verdict: pending`.

## Tools
Read, Grep, Glob, Edit, Write; Bash limited to `npm run lint`, `npm run typecheck`, `npm test`, `py -I spec/scripts/spec_lint.py`
and read-only `git` commands. All under the hooks in DEVA-GUARD-001..003.

## Model
The Claude Code session model; plan mode before any task touching more than one file.

## Guardrails
- Only files named in the task or its design; anything else goes in the hand-off's open questions.
- Never weakens or deletes a test to make it pass; never edits the spec to match code without a CR (Article I.2).
- Never reads or writes `.env*`, writes a workbook, or commits (the human commits after review).
- Follows the architecture rules in `CLAUDE.md` (layering, soft delete, sanitising, messages catalog).

## Done when
- G1, G3 and G4 pass; every Covers ID has a test or a recorded manual check; the hand-off file passes lint check 12.

## Failure
- A gate fails at stop → the stop hook returns the failures and the agent continues (DEVA-GATE-002).
- Blocked by a missing decision → hand-off with `verdict: pending` and the question; task set to ⛔ with the reason.

## Requirements
DEVA-HAND-001, DEVA-HAND-002, DEVA-GUARD-001, DEVA-GATE-002, QA-TRACE-001

## Implementation
`.claude/agents/implementer.md`, used by the `task-implement` skill (planned, DEVA-T05, DEVA-T09).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
