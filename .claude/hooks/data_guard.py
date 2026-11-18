"""PreToolUse hook (file tools, Bash, PowerShell): keep agents away from secrets and from overwriting workbooks.

DEVA-GUARD-002 · Constitution Articles II and III. Fails CLOSED: if the hook cannot decide, the call is refused.

Blocks:
- any access to `.env` / `.env.*` files (except `.env.example`) and to Claude credential files;
- edits or writes to `.xlsx` / `.xls` / `.xlsm` files (workbooks change only by regenerating them, ADR-0006);
- shell commands that mention those secret files, or that delete, move, copy over or redirect into a workbook.
Reading the fictional workbook and running `scripts/generate_demo_workbook.py` stay allowed.
"""
from __future__ import annotations

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

FILE_TOOLS = {"Read", "Edit", "Write", "MultiEdit", "NotebookEdit", "Grep", "Glob"}
WRITE_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
SHELL_TOOLS = {"Bash", "PowerShell"}

SECRET_NAME_RE = re.compile(r"(^|/)\.env(\.[^/]+)?$", re.I)
CRED_RE = re.compile(r"\.credentials\.json\b|(^|[/\\])credentials\.json\b", re.I)
WORKBOOK_RE = re.compile(r"\.xls[xm]?\b", re.I)
SHELL_SECRET_RE = re.compile(r"(?<![\w.-])\.env(?!\.example\b)(?:\.[\w-]+)?(?![\w-])", re.I)
SHELL_WRITE_RE = re.compile(
    r"\b(rm|del|erase|mv|cp|move|copy|ren|rename|truncate|Remove-Item|Move-Item|Copy-Item|Rename-Item|"
    r"Set-Content|Add-Content|Out-File|Clear-Content)\b|(?<![0-9&>])>(?!&)", re.I)
# Judge each simple command on its own: a workbook named in one command and a redirect in another is not a write.
SEGMENT_SPLIT_RE = re.compile(r"\n|;|&&|\|\||\|")


def is_secret_path(path: str) -> bool:
    p = path.replace("\\", "/")
    name_hit = SECRET_NAME_RE.search(p) and not p.lower().endswith(".env.example")
    return bool(name_hit or CRED_RE.search(p))


def decide(event: dict):
    tool = event.get("tool_name", "")
    ti = event.get("tool_input") or {}
    if tool in FILE_TOOLS:
        path = c.tool_path(ti)
        pattern = str(ti.get("pattern", "")) if tool in ("Glob", "Grep") else ""
        if is_secret_path(path) or (tool == "Glob" and is_secret_path(pattern)):
            return f"Blocked by data-guard (DEVA-GUARD-002): `{path or pattern}` holds secrets; agents never read or write it."
        if tool in WRITE_TOOLS and WORKBOOK_RE.search(path):
            return ("Blocked by data-guard (DEVA-GUARD-002, ADR-0006): workbooks are never edited by agents. "
                    "Change the data by regenerating it: `py -I scripts/generate_demo_workbook.py <out.xlsx>`.")
        return None
    if tool in SHELL_TOOLS:
        cmd = str(ti.get("command", ""))
        if SHELL_SECRET_RE.search(cmd) or CRED_RE.search(cmd):
            return "Blocked by data-guard (DEVA-GUARD-002): the command touches a secrets file (.env* or credentials)."
        for segment in SEGMENT_SPLIT_RE.split(cmd):
            if WORKBOOK_RE.search(segment) and SHELL_WRITE_RE.search(segment) \
                    and "generate_demo_workbook.py" not in segment:
                return ("Blocked by data-guard (DEVA-GUARD-002, ADR-0006): the command would delete, move, copy over "
                        "or redirect into a workbook. Regenerate it with scripts/generate_demo_workbook.py instead.")
        return None
    return None


def main() -> int:
    try:
        reason = decide(c.read_event())
    except Exception as exc:  # fail closed
        reason = f"Blocked by data-guard: the hook could not check this call ({exc}); refusing to be safe."
    if reason:
        c.deny(reason)
    return 0


if __name__ == "__main__":
    sys.exit(main())
