# Agent: <Name>

- **ID:** AGENT-<NAME>
- **Version:** 1.0.0
- **Kind:** runtime | evaluation | development
- **Spec:** [<NNN-spec-name>](../specs/<NNN-spec-name>/)

## Purpose
<One or two sentences: the single job this agent does.>

## Inputs
<Contract file(s) it receives, e.g. `contracts/fact-sheet.v1.schema.json`, or for development agents the task and files it reads.>

## Outputs
<Contract file(s) it produces, or the files and hand-off it writes.>

## Tools
<The complete list of tools it may use. "none" for pure generation. Any tool not listed is a defect (Article XII.1).>

## Model
<Model, effort, max_tokens, timeout; "none (deterministic code)" for code steps. Point to the ADR that chose them.>

## Guardrails
- <What it must never do, and the data rules it follows.>

## Done when
- <Objective, checkable conditions for its output to be accepted.>

## Failure
- <What happens when its output is invalid, its call fails or it runs out of budget, with requirement IDs.>

## Requirements
<Requirement IDs this agent helps meet, e.g. AIB-CITE-001..003.>

## Implementation
<Files that implement it. Each prompt or subagent file starts with the header
`<!-- agent-spec: AGENT-<NAME>@<version> · requirements: <IDs> -->` (spec lint check 11).>

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | <yyyy-mm-dd> | First version |

<!-- Rules (checked by spec/scripts/spec_lint.py, check 10):
  - File name is the ID without "AGENT-", lower case: AGENT-WRITER -> writer.md.
  - ID, Version (semver), Kind and Spec lines and every '## ' section above are required.
  - Requirements must cite existing requirement IDs; contract files named under Inputs/Outputs must exist.
  - Bump the version on any change to Tools, Model, Inputs, Outputs or Guardrails, and update the prompt header.
-->
