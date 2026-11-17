---
name: spec-change
description: Turn a feature idea, behaviour change or defect into a change request plus spec edits (EARS requirements with new IDs, design with Constitution check, tasks) that pass spec lint, before any code is written. Use when asked to specify, propose, add a requirement, raise a CR or change how something should behave.
argument-hint: <idea or defect description>
---
<!-- Implements DEVA-SKILL-001 (spec/specs/026-dev-agents); steps 1-4 of spec/workflow.md. Agent: AGENT-SPEC-AUTHOR. -->

# Specify a change

1. Find the affected specs: search `spec/specs/*/requirements.md` for the behaviour, and read `spec/steering/` and
   the relevant Constitution articles.
2. If the idea is unclear (who is it for, what exactly should happen, edge cases), ask the owner before writing.
3. Launch the `spec-author` subagent with the idea, the affected specs and the owner's answers. It writes the CR in
   `spec/changes/`, new requirement blocks (next free ID per area), design and Constitution check, tasks with
   `Covers:`, messages-catalog and constitution-mapping updates, and runs spec lint.
4. Check its output yourself: `py -I spec/scripts/spec_lint.py` (0 errors); IDs not reused; every new requirement is
   covered by a task; every user-facing text is in the messages catalog; the CR lists each touched file.
5. Report the CR, the new IDs and tasks, and the questions the owner must answer before approval. Code waits for the
   owner's approval of the CR (its review boxes).
