#!/usr/bin/env python3
"""Spec lint: the G1 gate for spec/ (see spec/gates/validation-gates.md).

Run from the repo root:  py spec/scripts/spec_lint.py      (exit 1 on any error)

Checks
  1. Spec folders are NNN-slug, numbers unique, each has requirements.md, design.md, tasks.md.
  2. Requirement headings are '#### PREFIX-AREA-NNN: title'; IDs unique across all specs.
  3. Every requirement has one '- **Status:**' with an allowed value and a '- **Criterion:**'.
  4. Every requirement ID mentioned anywhere in spec/ (ranges expanded) exists.
  5. Tasks: '- [ ]/[x] **PREFIX-Tnn**' + '- Status: <emoji> <word> · Covers: …'; [x] only when ✅ Done;
     Covers IDs exist; the Summary line matches the counts; no nested checkboxes; task IDs unique.
  6. Task IDs mentioned anywhere in spec/ exist.
  7. Backticked Source paths exist in the repo.
  8. Relative Markdown links resolve.
  9. Requirement IDs cited by test files (src/**/*.test.*, tests/**) exist.

The sdd-spectree page generator imports this module and uses its regexes and
collect_requirements(), so the page and this gate always count the same things.
"""
from __future__ import annotations

import os
import re
import sys
from typing import Dict, List

# Shared with sdd-spectree (attribute names are part of that contract).
REQ_HEADING_RE = re.compile(r"^#{2,4}\s+([A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-\d{3}):\s+\S")
REQ_ID_RE = re.compile(r"\b([A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-\d{3})\b")
STATUS_RE = re.compile(r"-\s*\*\*Status:\*\*\s*(?:[^\w]*\s*)?([A-Za-z]+)")
REQ_RANGE_RE = re.compile(
    r"\b([A-Z][A-Z0-9]{1,4}-[A-Z]{2,6})-(\d{3})\s*(?:\.\.|–|to)\s*(?:[A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-)?(\d{3})\b")
TEST_DEF_RE = re.compile(r"^\s*(?:async\s+)?def\s+(test_\w+)|^\s*class\s+(Test\w+)", re.M)

REQ_STATUSES = {"Implemented", "Partial", "Gap", "Planned", "Deprecated"}
TASK_STATUSES = {"✅": "Done", "🔄": "In progress", "⬜": "Not started", "⛔": "Blocked"}
SPEC_DIR_RE = re.compile(r"^(\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$")
TASK_RE = re.compile(r"^- \[( |x)\] \*\*([A-Z][A-Z0-9]{1,4}-T\d{2})\*\*\s+\S")
TASK_ID_RE = re.compile(r"\b([A-Z][A-Z0-9]{1,4}-T\d{2})\b")
TASK_STATUS_RE = re.compile(r"^  - Status: (✅|🔄|⬜|⛔) (Done|In progress|Not started|Blocked)\b(.*)$")
SUMMARY_RE = re.compile(r"\*\*Summary:\*\* (\d+) tasks — ✅ (\d+) · 🔄 (\d+) · ⬜ (\d+) · ⛔ (\d+)")
NESTED_BOX_RE = re.compile(r"^\s+[-*] \[[ xX]\]")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
SOURCE_RE = re.compile(r"^- \*\*Source:\*\*(.*)$")
REQUIRED = ("requirements.md", "design.md", "tasks.md")


class Findings:
    def __init__(self) -> None:
        self.errors: List[str] = []
        self.checked_specs = 0
        self.checked_reqs = 0
        self.checked_tasks = 0
        self.req_ids: Dict[str, str] = {}   # id -> spec folder
        self.task_ids: Dict[str, str] = {}

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")


def ids_in(text: str) -> List[str]:
    out = list(REQ_ID_RE.findall(text))
    for prefix, lo, hi in REQ_RANGE_RE.findall(text):
        out.extend(f"{prefix}-{n:03d}" for n in range(int(lo), int(hi) + 1))
    return list(dict.fromkeys(out))


def read(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def rel(path: str, root: str) -> str:
    return os.path.relpath(path, root).replace(os.sep, "/")


def iter_specs(specs_dir: str):
    for name in sorted(os.listdir(specs_dir)):
        p = os.path.join(specs_dir, name)
        if os.path.isdir(p) and not name.startswith(("_", ".")) and name != "__pycache__":
            yield name, p


def collect_requirements(specs_dir: str, root: str, f: Findings) -> None:
    """Checks 1-3. Fills f.req_ids, f.checked_specs, f.checked_reqs."""
    numbers: Dict[str, str] = {}
    for name, path in iter_specs(specs_dir):
        f.checked_specs += 1
        m = SPEC_DIR_RE.match(name)
        if not m:
            f.error(name, "spec folder must be named NNN-slug")
        elif m.group(1) in numbers:
            f.error(name, f"number {m.group(1)} already used by {numbers[m.group(1)]}")
        else:
            numbers[m.group(1)] = name
        for req in REQUIRED:
            if not os.path.isfile(os.path.join(path, req)):
                f.error(name, f"missing {req}")
        rpath = os.path.join(path, "requirements.md")
        if not os.path.isfile(rpath):
            continue
        current, has_status, has_crit, line_no = None, 0, False, 0

        def close() -> None:
            if current is None:
                return
            where = f"{rel(rpath, root)}:{line_no} {current}"
            if has_status != 1:
                f.error(where, f"needs exactly one Status line (found {has_status})")
            if not has_crit:
                f.error(where, "missing '- **Criterion:**'")

        for i, line in enumerate(read(rpath).splitlines(), 1):
            h = REQ_HEADING_RE.match(line)
            if h:
                close()
                current, has_status, has_crit, line_no = h.group(1), 0, False, i
                f.checked_reqs += 1
                if current in f.req_ids:
                    f.error(f"{rel(rpath, root)}:{i}", f"{current} already defined in {f.req_ids[current]}")
                f.req_ids[current] = name
                continue
            if line.startswith("#"):
                close()
                current = None
                continue
            if current is None:
                continue
            s = STATUS_RE.match(line)
            if s:
                has_status += 1
                if s.group(1) not in REQ_STATUSES:
                    f.error(f"{rel(rpath, root)}:{i}", f"unknown status '{s.group(1)}'")
            if line.startswith("- **Criterion:**"):
                has_crit = True
        close()


def check_tasks(specs_dir: str, root: str, f: Findings) -> None:
    """Check 5."""
    for name, path in iter_specs(specs_dir):
        tpath = os.path.join(path, "tasks.md")
        if not os.path.isfile(tpath):
            continue
        where = rel(tpath, root)
        lines = read(tpath).splitlines()
        counts = {k: 0 for k in TASK_STATUSES}
        summary = None
        for i, line in enumerate(lines):
            sm = SUMMARY_RE.search(line)
            if sm:
                summary = tuple(int(x) for x in sm.groups())
            if NESTED_BOX_RE.match(line):
                f.error(f"{where}:{i + 1}", "nested checkbox (it would count as a task); use '- Step:'")
            t = TASK_RE.match(line)
            if not t:
                if line.startswith("- [") and "]" in line[:6]:
                    f.error(f"{where}:{i + 1}", "task line must be '- [ ] **PREFIX-Tnn** text'")
                continue
            done, tid = t.group(1) == "x", t.group(2)
            f.checked_tasks += 1
            if tid in f.task_ids:
                f.error(f"{where}:{i + 1}", f"{tid} already defined in {f.task_ids[tid]}")
            f.task_ids[tid] = name
            st = TASK_STATUS_RE.match(lines[i + 1]) if i + 1 < len(lines) else None
            if not st:
                f.error(f"{where}:{i + 1}", f"{tid}: next line must be '  - Status: <emoji> <status> · Covers: …'")
                continue
            emoji, word, rest = st.groups()
            if TASK_STATUSES[emoji] != word:
                f.error(f"{where}:{i + 2}", f"{tid}: emoji {emoji} does not match '{word}'")
            counts[emoji] += 1
            if done != (emoji == "✅"):
                f.error(f"{where}:{i + 1}", f"{tid}: checkbox [x] must match ✅ Done")
            cov = re.search(r"Covers:\s*([^·]*)", rest)
            if not cov:
                f.error(f"{where}:{i + 2}", f"{tid}: missing 'Covers:'")
            else:
                ids = ids_in(cov.group(1))
                if not ids and "—" not in cov.group(1):
                    f.error(f"{where}:{i + 2}", f"{tid}: Covers lists no requirement IDs (use '—' for none)")
                for rid in ids:
                    if rid not in f.req_ids:
                        f.error(f"{where}:{i + 2}", f"{tid}: covers unknown requirement {rid}")
        actual = (sum(counts.values()), counts["✅"], counts["🔄"], counts["⬜"], counts["⛔"])
        if summary is None:
            f.error(where, "missing '**Summary:** N tasks — ✅ a · 🔄 b · ⬜ c · ⛔ d'")
        elif summary != actual:
            f.error(where, f"Summary says {summary}, tasks give {actual}")


def check_references(spec_root: str, root: str, f: Findings) -> None:
    """Checks 4, 6, 7, 8."""
    for dp, dns, fns in os.walk(spec_root):
        dns[:] = [d for d in dns if d not in ("__pycache__", "templates")]
        for fn in fns:
            if not fn.endswith(".md"):
                continue
            p = os.path.join(dp, fn)
            where = rel(p, root)
            in_fence = False
            for i, line in enumerate(read(p).splitlines(), 1):
                if line.lstrip().startswith("```"):
                    in_fence = not in_fence
                for rid in ids_in(line):
                    if rid not in f.req_ids:
                        f.error(f"{where}:{i}", f"unknown requirement {rid}")
                for tid in TASK_ID_RE.findall(line):
                    if tid not in f.task_ids:
                        f.error(f"{where}:{i}", f"unknown task {tid}")
                src = SOURCE_RE.match(line)
                if src:
                    for path in re.findall(r"`([^`]+)`", src.group(1)):
                        if "/" in path and "<" not in path and not os.path.exists(os.path.join(root, path)):
                            f.error(f"{where}:{i}", f"Source path not found: {path}")
                if in_fence:
                    continue
                for target in LINK_RE.findall(line):
                    if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                        continue
                    tpath = target.split("#")[0]
                    if tpath and not os.path.exists(os.path.normpath(os.path.join(dp, tpath))):
                        f.error(f"{where}:{i}", f"broken link {target}")


def check_tests(root: str, f: Findings) -> None:
    """Check 9."""
    for base in ("src", "tests", "server"):
        for dp, dns, fns in os.walk(os.path.join(root, base)):
            dns[:] = [d for d in dns if d != "node_modules"]
            for fn in fns:
                if re.search(r"\.(test|spec)\.[cm]?[jt]sx?$", fn) or (base == "tests" and fn.endswith((".ts", ".tsx", ".js"))):
                    p = os.path.join(dp, fn)
                    for rid in ids_in(read(p)):
                        if rid not in f.req_ids:
                            f.error(rel(p, root), f"test cites unknown requirement {rid}")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    spec_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root = os.path.dirname(spec_root)
    specs_dir = os.path.join(spec_root, "specs")
    f = Findings()
    collect_requirements(specs_dir, root, f)
    check_tasks(specs_dir, root, f)
    check_references(spec_root, root, f)
    check_tests(root, f)
    for e in f.errors:
        print("ERROR", e)
    print(f"spec_lint: {f.checked_specs} specs, {f.checked_reqs} requirements, {f.checked_tasks} tasks, "
          f"{len(f.errors)} error(s)")
    return 1 if f.errors else 0


if __name__ == "__main__":
    sys.exit(main())
