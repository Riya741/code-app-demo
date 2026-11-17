---
name: task-close
description: Close a delivered spec task (ID like UCF-T07) after review - mark it ✅ Done, update requirement statuses, the gap register, the Summary line, the README dashboard, traceability and the spec tree, then run spec lint. Use when asked to close, finish, mark done or wrap up a task.
argument-hint: <TASK-ID> [<TASK-ID> …]
---
<!-- Implements DEVA-SKILL-001 and DEVA-HAND-003 (spec/specs/026-dev-agents); step 7 of spec/workflow.md. -->

# Close a task

For each task ID:

1. **Check it may close.** `spec/handoffs/<TASK-ID>.md` (if the task was delivered by an agent) has `verdict: pass`
   and a reviewer; every Covers requirement has a test or a recorded manual check; G1, G3 and G4 pass now. If not,
   stop and say what is missing; do not close.
2. **Task.** `- [x]`, status `✅ Done`, and a `Verified <date>:` line saying how (tests, gates, manual checks).
3. **Requirements.** Each Covers requirement whose criterion is now fully met becomes `✅ Implemented` with its
   `Source:` files; partly met stays `⚠️ Partial — <what is missing>`. Retire interim criteria the task replaces
   (status `Deprecated — <why>`), never delete them.
4. **Gap register.** Move fixed rows from *Open* to *Closed* (struck through, with the closing task and date).
5. **Counts.** Fix the tasks file's **Summary** line, then `py -I spec/scripts/dashboard.py --write`.
6. **Traceability.** Add new source files and tests to `spec/traceability.md` (§1 and §2); update shared-task rows.
7. **Spec tree.** `cd spectree && py -I build_spectree.py --verify`.
8. **Gate.** `py -I spec/scripts/spec_lint.py` must report 0 errors.

Report what changed in the spec set and which gaps closed. Do not commit unless asked.
