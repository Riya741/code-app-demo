# Task hand-offs

One file per task delivered by a development agent: `spec/handoffs/<TASK-ID>.md`, written by the
[implementer](../agents/implementer.md) and completed by the [reviewer](../agents/reviewer.md) (DEVA-HAND-001..003).
It is the audit trail of what an agent promised, did and proved for each task.

- Template: [templates/handoff.md](../templates/handoff.md) · contract: [task-handoff.v1](../contracts/task-handoff.v1.schema.json).
- Spec lint check 12 rejects a hand-off whose task does not exist, whose `covers` lists an ID that is not on the
  task's Covers line, or whose agent or verdict is unknown.

The first hand-offs come with Phase 2 (DEVA-T11).
