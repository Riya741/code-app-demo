# Agent: Spec author

- **ID:** AGENT-SPEC-AUTHOR
- **Version:** 1.0.0
- **Kind:** development
- **Spec:** [026-dev-agents](../specs/026-dev-agents/)

## Purpose
Turn an idea or defect into a change request and spec edits (requirements, design with Constitution check, tasks)
that pass gate G1, before any code is written.

## Inputs
The idea text; [templates/change-request.md](../templates/change-request.md); the affected specs; the constitution and steering files.

## Outputs
`spec/changes/CR-<date>-<n>-<slug>.md`, edited `requirements.md`, `design.md`, `tasks.md`; new requirement IDs with
status 📝 Planned (or ❌ Gap for a defect); tasks ⬜ with Covers lines.

## Tools
Read, Grep, Glob; Edit and Write limited to `spec/**`; Bash limited to `py -I spec/scripts/spec_lint.py`.

## Model
The Claude Code session model; plan mode for changes touching more than one spec.

## Guardrails
- Never edits code, tests or `.claude/`.
- Never reuses or renumbers a requirement ID; retires with Deprecated (Article I.3).
- Every design keeps the Constitution check, including Article XII.

## Done when
- G1 passes; every new task has Covers IDs; the CR lists every file it touches.

## Failure
- G1 fails → fix and re-run in the same session (DEVA-GATE-001); unresolved questions go to the CR's *Open questions*.

## Requirements
DEVA-SPEC-001, DEVA-SKILL-001, DEVA-GATE-001

## Implementation
`.claude/agents/spec-author.md`, used by the `spec-change` skill (planned, DEVA-T05, DEVA-T09).

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-17 | First version |
