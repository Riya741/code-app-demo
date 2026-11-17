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
  9. Requirement IDs cited by test files (src/**/*.test.*, tests/**) exist, and every JS/TS test title
     (`it(...)` / `test(...)`, including `.fails`, `.skip`, `.only`, `.todo`) starts with one (QA-TRACE-001).
 10. Agent specs (spec/agents/*.md): ID/Version/Kind/Spec metadata, required sections, ID = file name, unique,
     Requirements cite existing IDs, every contracts/<file> named exists (DEVA-SPEC-001).
 11. Prompt and subagent files (server/ai/prompts, .claude/agents, evals/graders/judge; *.md) carry the header
     'agent-spec: AGENT-X@<version> · requirements: <IDs>' naming an existing agent at its current version and
     only IDs that agent lists (DEVA-SPEC-002).
 12. Hand-off files (spec/handoffs/<TASK>.md): task-handoff.v1 front matter, task = file name and exists, covers only
     IDs from that task's Covers line, known agent/reviewer, valid verdict and gates (DEVA-HAND-002).
 13. Contracts (spec/contracts/*.schema.json): valid JSON, $schema, $id ending in the file name, title, x-contract
     name/version matching the file name, from/to agents and requirement IDs exist (DEVA-SPEC-003).

The sdd-spectree page generator imports this module and uses its regexes and
collect_requirements(), so the page and this gate always count the same things.
"""
from __future__ import annotations

import json
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
JS_TEST_TITLE_RE = re.compile(r"""\b(?:it|test)(?:\.(?:fails|skip|only|todo|concurrent))*\(\s*(["'`])(.*?)\1""", re.S)

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

# Article XII: agent specs, prompt headers, hand-offs, contracts (checks 10-13).
AGENT_ID_FULL_RE = re.compile(r"^AGENT-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$")
AGENT_META_RE = re.compile(r"^- \*\*(ID|Version|Kind|Spec):\*\*\s*(.+?)\s*$")
AGENT_SECTIONS = ("Purpose", "Inputs", "Outputs", "Tools", "Model", "Guardrails", "Done when", "Failure",
                  "Requirements", "Implementation")
AGENT_KINDS = {"runtime", "evaluation", "development"}
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")
SPEC_LINK_RE = re.compile(r"\]\(\.\./specs/([^/)#]+)/?\)")
CONTRACT_REF_RE = re.compile(r"contracts/([A-Za-z0-9._-]+\.schema\.json)")
CONTRACT_FILE_RE = re.compile(r"^([a-z0-9]+(?:-[a-z0-9]+)*)\.v(\d+)\.schema\.json$")
PROMPT_HEADER_RE = re.compile(r"agent-spec:\s*(AGENT-[A-Z0-9-]+?)@(\d+\.\d+\.\d+)(.*)$")
PROMPT_DIRS = ("server/ai/prompts", ".claude/agents", "evals/graders/judge")
HANDOFF_KEYS = ("contract", "task", "agent", "covers", "files_changed", "tests", "gates", "verdict")
HANDOFF_VERDICTS = {"pending", "pass", "fail"}
GATE_RESULTS = {"pass", "fail", "n/a"}


class Findings:
    def __init__(self) -> None:
        self.errors: List[str] = []
        self.checked_specs = 0
        self.checked_reqs = 0
        self.checked_tasks = 0
        self.req_ids: Dict[str, str] = {}   # id -> spec folder
        self.task_ids: Dict[str, str] = {}
        self.task_covers: Dict[str, List[str]] = {}   # task id -> requirement IDs on its Covers line
        self.agents: Dict[str, dict] = {}             # agent id -> {"version", "reqs", "path"}
        self.checked_contracts = 0
        self.checked_prompts = 0
        self.checked_handoffs = 0

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
                f.task_covers[tid] = ids
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
                    text = read(p)
                    for rid in ids_in(text):
                        if rid not in f.req_ids:
                            f.error(rel(p, root), f"test cites unknown requirement {rid}")
                    if fn.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")):
                        for m in JS_TEST_TITLE_RE.finditer(text):
                            if not REQ_ID_RE.match(m.group(2)):
                                f.error(rel(p, root), f"test title must start with a requirement ID: {m.group(2)[:60]!r}")


def md_sections(text: str) -> Dict[str, str]:
    """'## Heading' -> body text up to the next '## ' heading."""
    out: Dict[str, str] = {}
    current = None
    for line in text.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            out[current] = ""
        elif current is not None:
            out[current] += line + "\n"
    return out


def check_agents(spec_root: str, root: str, f: Findings) -> None:
    """Check 10. Fills f.agents."""
    agents_dir = os.path.join(spec_root, "agents")
    contracts_dir = os.path.join(spec_root, "contracts")
    if not os.path.isdir(agents_dir):
        return
    spec_folders = {name for name, _ in iter_specs(os.path.join(spec_root, "specs"))}
    for fn in sorted(os.listdir(agents_dir)):
        if not fn.endswith(".md") or fn == "README.md":
            continue
        p = os.path.join(agents_dir, fn)
        where = rel(p, root)
        text = read(p)
        meta: Dict[str, str] = {}
        for line in text.splitlines():
            m = AGENT_META_RE.match(line)
            if m and m.group(1) not in meta:
                meta[m.group(1)] = m.group(2)
        for key in ("ID", "Version", "Kind", "Spec"):
            if key not in meta:
                f.error(where, f"agent spec missing '- **{key}:**'")
        aid = meta.get("ID", "")
        expected = "AGENT-" + fn[:-3].upper()
        if aid and not AGENT_ID_FULL_RE.match(aid):
            f.error(where, f"agent ID '{aid}' must look like AGENT-NAME")
        elif aid and aid != expected:
            f.error(where, f"agent ID '{aid}' does not match the file name (expected {expected})")
        if aid in f.agents:
            f.error(where, f"{aid} already defined in {f.agents[aid]['path']}")
        version = meta.get("Version", "")
        if version and not SEMVER_RE.match(version):
            f.error(where, f"Version '{version}' is not MAJOR.MINOR.PATCH")
        if "Kind" in meta and meta["Kind"] not in AGENT_KINDS:
            f.error(where, f"Kind '{meta['Kind']}' must be one of {sorted(AGENT_KINDS)}")
        if "Spec" in meta:
            links = SPEC_LINK_RE.findall(meta["Spec"])
            if not links or any(s not in spec_folders for s in links):
                f.error(where, "Spec must link to an existing spec folder: [NNN-name](../specs/NNN-name/)")
        sections = md_sections(text)
        for sec in AGENT_SECTIONS:
            if sec not in sections:
                f.error(where, f"agent spec missing section '## {sec}'")
        reqs = ids_in(sections.get("Requirements", ""))
        if "Requirements" in sections and not reqs:
            f.error(where, "Requirements section cites no requirement IDs")
        for cfile in sorted(set(CONTRACT_REF_RE.findall(text))):
            if not os.path.isfile(os.path.join(contracts_dir, cfile)):
                f.error(where, f"names contract {cfile}, which does not exist in spec/contracts/")
        if aid:
            f.agents[aid] = {"version": version, "reqs": set(reqs), "path": where}


def check_contracts(spec_root: str, root: str, f: Findings) -> None:
    """Check 13. Needs f.agents (check 10)."""
    cdir = os.path.join(spec_root, "contracts")
    if not os.path.isdir(cdir):
        return
    for fn in sorted(os.listdir(cdir)):
        if fn.endswith(".md"):
            continue
        p = os.path.join(cdir, fn)
        where = rel(p, root)
        m = CONTRACT_FILE_RE.match(fn)
        if not m:
            f.error(where, "contract file must be named <name>.v<N>.schema.json")
            continue
        f.checked_contracts += 1
        try:
            doc = json.loads(read(p))
        except (ValueError, UnicodeDecodeError) as exc:
            f.error(where, f"not valid JSON: {exc}")
            continue
        if not isinstance(doc, dict):
            f.error(where, "contract must be a JSON object")
            continue
        for key in ("$schema", "$id", "title"):
            if not doc.get(key):
                f.error(where, f"missing '{key}'")
        if doc.get("$id") and not str(doc["$id"]).endswith("/" + fn):
            f.error(where, f"$id must end with '/{fn}'")
        xc = doc.get("x-contract")
        if not isinstance(xc, dict):
            f.error(where, "missing 'x-contract' block")
            continue
        if xc.get("name") != m.group(1) or xc.get("version") != int(m.group(2)):
            f.error(where, f"x-contract name/version must be '{m.group(1)}' / {int(m.group(2))}")
        for side in ("from", "to"):
            if xc.get(side) not in f.agents:
                f.error(where, f"x-contract '{side}' agent {xc.get(side)!r} has no spec in spec/agents/")
        reqs = xc.get("requirements")
        if not isinstance(reqs, list) or not reqs:
            f.error(where, "x-contract 'requirements' must list requirement IDs")
        else:
            for rid in reqs:
                if rid not in f.req_ids:
                    f.error(where, f"x-contract cites unknown requirement {rid}")


def check_prompt_headers(root: str, f: Findings) -> None:
    """Check 11. Needs f.agents (check 10)."""
    for d in PROMPT_DIRS:
        base = os.path.join(root, *d.split("/"))
        if not os.path.isdir(base):
            continue
        for dp, dns, fns in os.walk(base):
            for fn in sorted(fns):
                if not fn.endswith(".md"):
                    continue
                p = os.path.join(dp, fn)
                where = rel(p, root)
                f.checked_prompts += 1
                head = read(p).splitlines()[:20]
                hm = next((PROMPT_HEADER_RE.search(line) for line in head if PROMPT_HEADER_RE.search(line)), None)
                if not hm:
                    f.error(where, "first 20 lines need '<!-- agent-spec: AGENT-X@1.0.0 · requirements: IDs -->'")
                    continue
                aid, version, rest = hm.groups()
                agent = f.agents.get(aid)
                if not agent:
                    f.error(where, f"cites {aid}, which has no spec in spec/agents/")
                    continue
                if version != agent["version"]:
                    f.error(where, f"cites {aid}@{version} but the spec is at {agent['version']} (version drift)")
                rm = re.search(r"requirements:\s*(.*)", rest)
                ids = ids_in(rm.group(1)) if rm else []
                if not ids:
                    f.error(where, "header lists no requirement IDs")
                for rid in ids:
                    if rid not in f.req_ids:
                        f.error(where, f"header cites unknown requirement {rid}")
                    elif rid not in agent["reqs"]:
                        f.error(where, f"header cites {rid}, which {aid} does not list under Requirements")


def parse_front_matter(text: str):
    """Minimal YAML subset for hand-offs: 'key: value', inline lists [a, b] and maps {K: v}."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    out: Dict[str, object] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return out
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            continue
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            out[key.strip()] = [v.strip() for v in value[1:-1].split(",") if v.strip()]
        elif value.startswith("{") and value.endswith("}"):
            pairs = [v.partition(":") for v in value[1:-1].split(",") if v.strip()]
            out[key.strip()] = {k.strip(): v.strip() for k, _, v in pairs}
        else:
            out[key.strip()] = value
    return None   # no closing '---'


def check_handoffs(spec_root: str, root: str, f: Findings) -> None:
    """Check 12. Needs tasks (check 5) and agents (check 10)."""
    hdir = os.path.join(spec_root, "handoffs")
    if not os.path.isdir(hdir):
        return
    for fn in sorted(os.listdir(hdir)):
        if not fn.endswith(".md") or fn == "README.md":
            continue
        p = os.path.join(hdir, fn)
        where = rel(p, root)
        f.checked_handoffs += 1
        tid = fn[:-3]
        if not re.fullmatch(r"[A-Z][A-Z0-9]{1,4}-T\d{2}", tid) or tid not in f.task_ids:
            f.error(where, f"hand-off must be named after an existing task (<PREFIX-Tnn>.md), not '{fn}'")
            continue
        fm = parse_front_matter(read(p))
        if fm is None:
            f.error(where, "missing front matter between '---' lines (contract task-handoff.v1)")
            continue
        for key in HANDOFF_KEYS:
            if key not in fm:
                f.error(where, f"front matter missing '{key}'")
        if fm.get("contract") != "task-handoff.v1":
            f.error(where, "contract must be 'task-handoff.v1'")
        if fm.get("task") != tid:
            f.error(where, f"task '{fm.get('task')}' must equal the file name ({tid})")
        if "agent" in fm and fm["agent"] not in f.agents:
            f.error(where, f"agent {fm['agent']!r} has no spec in spec/agents/")
        if "reviewer" in fm and fm["reviewer"] != "human" and fm["reviewer"] not in f.agents:
            f.error(where, f"reviewer {fm['reviewer']!r} must be an agent ID or 'human'")
        if "verdict" in fm and fm["verdict"] not in HANDOFF_VERDICTS:
            f.error(where, f"verdict must be one of {sorted(HANDOFF_VERDICTS)}")
        covers = fm.get("covers")
        if "covers" in fm:
            if not isinstance(covers, list) or not covers:
                f.error(where, "covers must be a non-empty inline list [ID, ID]")
            else:
                allowed = set(f.task_covers.get(tid, []))
                for rid in covers:
                    if rid not in allowed:
                        f.error(where, f"covers {rid}, which is not on {tid}'s Covers line")
        for key in ("files_changed", "tests"):
            if key in fm and not isinstance(fm[key], list):
                f.error(where, f"{key} must be an inline list [a, b]")
        gates = fm.get("gates")
        if "gates" in fm:
            if not isinstance(gates, dict):
                f.error(where, "gates must be an inline map {G1: pass, ...}")
            else:
                for g, res in gates.items():
                    if not re.fullmatch(r"G[1-7]", g) or res not in GATE_RESULTS:
                        f.error(where, f"gate entry '{g}: {res}' must be G1..G7 with pass, fail or n/a")


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
    check_agents(spec_root, root, f)
    check_contracts(spec_root, root, f)
    check_prompt_headers(root, f)
    check_handoffs(spec_root, root, f)
    for e in f.errors:
        print("ERROR", e)
    print(f"spec_lint: {f.checked_specs} specs, {f.checked_reqs} requirements, {f.checked_tasks} tasks, "
          f"{len(f.agents)} agents, {f.checked_contracts} contracts, {f.checked_prompts} prompts, "
          f"{f.checked_handoffs} hand-offs, {len(f.errors)} error(s)")
    return 1 if f.errors else 0


if __name__ == "__main__":
    sys.exit(main())
