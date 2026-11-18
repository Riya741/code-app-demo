"""SessionStart hook: tell the agent which task is in progress and how many High gaps are open.

DEVA-CTX-001. Fails open (prints nothing on error).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402


def context(root: str) -> str:
    tasks = c.tasks_in_progress(root)
    gaps = c.open_high_gaps(root)
    lines = ["Project workflow context (from spec/, via .claude/hooks/session_context.py):"]
    if tasks:
        lines.append("Tasks 🔄 In progress:")
        lines += [f"- {t['task']} ({t['spec']}): {t['title']} · Covers: {t['covers'] or '—'}" for t in tasks]
    else:
        lines.append("No task is 🔄 In progress, so edits to src/, server/, scripts/, mcp/ and evals/ are blocked "
                     "by spec-guard. Start one with /task-implement <TASK-ID> or by setting its status.")
    lines.append(f"Open High gaps: {len(gaps)}" + (f" ({', '.join(gaps)})" if gaps else "") +
                 ". Ranked list: /gap-report.")
    lines.append("Rules: spec/workflow.md and CLAUDE.md; AI work follows Constitution Article XII.")
    return "\n".join(lines)


def main() -> int:
    try:
        c.read_event()
        text = context(c.project_root())
    except Exception as exc:
        c.warn(f"session_context: {exc}")
        return 0
    c.emit({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": text}})
    return 0


if __name__ == "__main__":
    sys.exit(main())
