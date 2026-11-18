"""PreToolUse hook (Edit|Write|MultiEdit|NotebookEdit): no code edits without a task in progress.

DEVA-GUARD-001 · Constitution Article I. Fails open: if the hook itself breaks, the edit is allowed with a warning
(DEVA-GUARD-004), because a broken guard must not stop all work; the reviewer still checks the task trail.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

PROTECTED = ("src/", "server/", "scripts/", "mcp/", "evals/")

MESSAGE = (
    "Blocked by spec-guard (DEVA-GUARD-001, Constitution Article I): `{path}` is code, and no task is 🔄 In progress.\n"
    "Start a task first: pick it in spec/specs/<spec>/tasks.md, set its status line to "
    "'  - Status: 🔄 In progress · Covers: …', update the Summary line, then retry the edit "
    "(or run the /task-implement skill, which does this for you)."
)


def decide(event: dict, root: str):
    """Return a deny reason, or None to allow."""
    rel = c.rel_path(c.tool_path(event.get("tool_input") or {}), root)
    if not rel or not rel.startswith(PROTECTED):
        return None
    if c.tasks_in_progress(root):
        return None
    return MESSAGE.format(path=rel)


def main() -> int:
    try:
        reason = decide(c.read_event(), c.project_root())
    except Exception as exc:  # fail open
        c.warn(f"spec_guard: hook error, edit allowed: {exc}")
        return 0
    if reason:
        c.deny(reason)
    return 0


if __name__ == "__main__":
    sys.exit(main())
