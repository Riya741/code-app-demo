# Task hand-offs

One file per delivered task: `spec/handoffs/<TASK-ID>.md`. Since CR-20261121-1 the main session writes it
(`agent: session`) and records the review verdict (`reviewer: session`, or `human` when the owner reviews)
(DEVA-HAND-002..004). Older files name the retired implementer and reviewer agents ([roster](../agents/README.md#retired-agents)).
It is the audit trail of what an agent promised, did and proved for each task.

- Template: [templates/handoff.md](../templates/handoff.md) · contract: [task-handoff.v1](../contracts/task-handoff.v1.schema.json).
- Spec lint check 12 rejects a hand-off whose task does not exist, whose `covers` lists an ID that is not on the
  task's Covers line, or whose agent or verdict is unknown.

The first hand-offs come with Phase 2 (DEVA-T11).
