---
name: gap-report
description: List the open spec gaps (❌ Gap / ⚠️ Partial requirements in the gap register) ranked by severity and readiness, with the next task to start for each. Use when asked what to work on next, what is broken or missing, which gaps or High gaps are open, or for a status or priority overview.
argument-hint: "[High|Medium|Low]"
---
<!-- Implements DEVA-SKILL-001 (spec/specs/026-dev-agents). Reads spec/gates/gap-register.md and spec/specs/*/tasks.md. -->

# Gap report

1. Run `py -I .claude/skills/gap-report/gap_report.py` (add `--severity High` etc. if the user named a severity).
2. Show the table as printed. Ranking: severity, then gaps whose fix tasks can start now, then fewer open tasks.
3. Below it, recommend the top three to start, in dependency order, and name anything blocked and what unblocks it
   (see the dependency chain in `spec/traceability.md` §4). Suggest `/task-implement <TASK-ID>` for the first one.
4. Do not change any file.
