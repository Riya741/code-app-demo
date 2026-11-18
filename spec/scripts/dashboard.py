#!/usr/bin/env python3
"""Recount the status dashboard in spec/README.md from the specs (used by the task-close skill).

    py -I spec/scripts/dashboard.py            print the recounted rows and whether README matches (exit 1 if not)
    py -I spec/scripts/dashboard.py --write    rewrite the numbers in README's dashboard table

Only the numeric columns of rows that link to a spec folder, and the Total row, are rewritten; group rows, prefixes
and everything else in README stay as they are.
"""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SPECS = os.path.join(ROOT, "spec", "specs")
README = os.path.join(ROOT, "spec", "README.md")
ROW_RE = re.compile(r"^\| \[(\d{3}-[a-z0-9-]+)\]\(specs/\1/\) \| ([^|]+) \|")
REQ_STATUS_RE = re.compile(r"^- \*\*Status:\*\*\s*(✅|⚠️|⚠|❌|📝|Deprecated)", re.M)
TASK_STATUS_RE = re.compile(r"^  - Status: (✅|🔄|⬜|⛔)", re.M)


def count(spec: str):
    def read(name):
        with open(os.path.join(SPECS, spec, name), encoding="utf-8") as fh:
            return fh.read()
    req = [s.replace("⚠️", "⚠") for s in REQ_STATUS_RE.findall(read("requirements.md"))]
    req = [s for s in req if s != "Deprecated"]
    tasks = TASK_STATUS_RE.findall(read("tasks.md"))
    return [len(req)] + [req.count(k) for k in ("✅", "⚠", "❌", "📝")] + \
           [len(tasks)] + [tasks.count(k) for k in ("✅", "🔄", "⬜", "⛔")]


def recount(text: str):
    out, total = [], [0] * 10
    for line in text.splitlines():
        m = ROW_RE.match(line)
        if m and os.path.isdir(os.path.join(SPECS, m.group(1))):
            nums = count(m.group(1))
            total = [a + b for a, b in zip(total, nums)]
            line = f"| [{m.group(1)}](specs/{m.group(1)}/) | {m.group(2).strip()} | " + " | ".join(map(str, nums)) + " |"
        elif line.startswith("| **Total** |"):
            line = "| **Total** | | " + " | ".join(f"**{n}**" for n in total) + " |"
        out.append(line)
    return "\n".join(out) + ("\n" if text.endswith("\n") else ""), total


def main(argv) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    with open(README, encoding="utf-8") as fh:
        text = fh.read()
    new, total = recount(text)
    labels = ("reqs", "✅", "⚠️", "❌", "📝", "tasks", "✅", "🔄", "⬜", "⛔")
    print("dashboard total: " + ", ".join(f"{l} {n}" for l, n in zip(labels, total)))
    if "--write" in argv:
        if new != text:
            with open(README, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(new)
            print("spec/README.md dashboard rewritten")
        else:
            print("spec/README.md dashboard already current")
        return 0
    if new != text:
        print("spec/README.md dashboard is out of date; run with --write")
        return 1
    print("spec/README.md dashboard is current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
