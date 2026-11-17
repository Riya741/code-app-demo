"""Shared helpers for the project's Claude Code hooks (spec 026-dev-agents).

Hooks run as `py -I <hook>.py` with the hook event JSON on stdin. `-I` drops the script's folder from sys.path,
so each hook adds it back before importing this module. Standard library only (Article VIII).
"""
from __future__ import annotations

import json
import os
import re
import sys
from typing import Dict, List, Optional

TASK_LINE_RE = re.compile(r"^- \[[ x]\] \*\*([A-Z][A-Z0-9]{1,4}-T\d{2})\*\*\s+(.*)$")
STATUS_LINE_RE = re.compile(r"^  - Status: (✅|🔄|⬜|⛔) [^·]*(?:·\s*Covers:\s*([^·]*))?")
GAP_ROW_RE = re.compile(r"^\| ([A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-\d{3}) \| (High|Medium|Low) \|")


def project_root() -> str:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and os.path.isdir(env):
        return os.path.abspath(env)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def read_event() -> dict:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    return json.loads(raw) if raw.strip() else {}


def rel_path(path: str, root: str) -> Optional[str]:
    """Project-relative POSIX path, or None when the path is outside the project."""
    if not path:
        return None
    p = path.replace("\\", "/")
    m = re.match(r"^/([a-zA-Z])/(.*)$", p)          # Git Bash style /c/Users/...
    if m:
        p = f"{m.group(1)}:/{m.group(2)}"
    full = os.path.abspath(p if os.path.isabs(p) or re.match(r"^[a-zA-Z]:/", p) else os.path.join(root, p))
    try:
        r = os.path.relpath(full, root)
    except ValueError:                               # other drive on Windows
        return None
    r = r.replace("\\", "/")
    return None if r.startswith("../") or r == ".." else r


def tool_path(tool_input: dict) -> str:
    for key in ("file_path", "notebook_path", "path"):
        if tool_input.get(key):
            return str(tool_input[key])
    return ""


def tasks_in_progress(root: str) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    specs = os.path.join(root, "spec", "specs")
    if not os.path.isdir(specs):
        return out
    for name in sorted(os.listdir(specs)):
        path = os.path.join(specs, name, "tasks.md")
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
        for i, line in enumerate(lines[:-1]):
            t = TASK_LINE_RE.match(line)
            s = STATUS_LINE_RE.match(lines[i + 1]) if t else None
            if t and s and s.group(1) == "🔄":
                out.append({"task": t.group(1), "title": t.group(2).strip(), "spec": name,
                            "covers": (s.group(2) or "").strip()})
    return out


def open_high_gaps(root: str) -> List[str]:
    path = os.path.join(root, "spec", "gates", "gap-register.md")
    if not os.path.isfile(path):
        return []
    out, in_open = [], False
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("## "):
                in_open = line.strip() == "## Open"
            m = GAP_ROW_RE.match(line) if in_open else None
            if m and m.group(2) == "High":
                out.append(m.group(1))
    return out


def emit(obj: dict) -> None:
    sys.stdout.buffer.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))
    sys.stdout.flush()


def deny(reason: str) -> None:
    """PreToolUse: refuse the tool call and tell the agent why."""
    emit({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                 "permissionDecisionReason": reason}})
    sys.exit(0)


def warn(msg: str) -> None:
    sys.stderr.write(msg + "\n")
