#!/usr/bin/env python3
"""Rank the open gaps in spec/gates/gap-register.md and suggest the next task for each (gap-report skill).

    py -I .claude/skills/gap-report/gap_report.py [--severity High|Medium|Low]

Ranking: severity (High first) → gaps whose fix tasks can start now (none ⛔ Blocked) → fewer open tasks.
"""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TASK_RE = re.compile(r"^- \[[ x]\] \*\*([A-Z][A-Z0-9]{1,4}-T\d{2})\*\*\s+(.*)$")
STATUS_RE = re.compile(r"^  - Status: (✅|🔄|⬜|⛔) ([^·]*)")
TASK_ID_RE = re.compile(r"\b[A-Z][A-Z0-9]{1,4}-T\d{2}\b")
SEV_ORDER = {"High": 0, "Medium": 1, "Low": 2}


def tasks():
    out = {}
    specs = os.path.join(ROOT, "spec", "specs")
    for name in sorted(os.listdir(specs)):
        path = os.path.join(specs, name, "tasks.md")
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
        for i, line in enumerate(lines[:-1]):
            t, s = TASK_RE.match(line), STATUS_RE.match(lines[i + 1])
            if t and s:
                out[t.group(1)] = {"status": s.group(1), "detail": s.group(2).strip(), "title": t.group(2), "spec": name}
    return out


def open_gaps():
    rows, section = [], None
    with open(os.path.join(ROOT, "spec", "gates", "gap-register.md"), encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("## "):
                section = line[3:].strip()
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if section == "Open" and len(cells) == 6 and cells[1] in SEV_ORDER:
                rows.append({"req": cells[0], "sev": cells[1], "title": cells[2], "fix": TASK_ID_RE.findall(cells[4])})
    return rows


def main(argv) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    only = argv[argv.index("--severity") + 1] if "--severity" in argv else None
    all_tasks = tasks()
    ranked = []
    for g in open_gaps():
        if only and g["sev"] != only:
            continue
        fix = [t for t in g["fix"] if all_tasks.get(t, {}).get("status") != "✅"]
        blocked = [t for t in fix if all_tasks.get(t, {}).get("status") == "⛔"]
        startable = [t for t in fix if all_tasks.get(t, {}).get("status") in ("⬜", "🔄")]
        ranked.append((SEV_ORDER[g["sev"]], bool(blocked and not startable), len(fix), g, fix, startable, blocked))
    ranked.sort(key=lambda r: r[:3])
    print("| # | Requirement | Sev | Gap | Next task | Blocked |")
    print("|---|---|---|---|---|---|")
    for i, (_, _, _, g, fix, startable, blocked) in enumerate(ranked, 1):
        nxt = startable[0] if startable else "—"
        if nxt in all_tasks:
            nxt = f"{nxt} {all_tasks[nxt]['status']} ({all_tasks[nxt]['title'][:50]})"
        blk = ", ".join(f"{t} ({all_tasks[t]['detail'][:40]})" for t in blocked) or "—"
        print(f"| {i} | {g['req']} | {g['sev']} | {g['title'][:50]} | {nxt} | {blk} |")
    print(f"\n{len(ranked)} open gap(s)" + (f" at {only}" if only else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
