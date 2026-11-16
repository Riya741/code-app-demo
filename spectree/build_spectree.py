#!/usr/bin/env python3
"""
build_spectree.py - render one or more spec-driven-development (SDD) trees into a
single self-contained HTML page (the "spec tree").

Stdlib only. The page shows:
  * the SDD flow, layer by layer (constitution -> steering -> PRD -> architecture ->
    ADRs -> specs -> contracts -> delivery -> gates), one column per project;
  * spec tiles coloured by a status rolled up from their requirements;
  * which code components (and tests) implement which specs;
  * links between specs, including links that cross project boundaries.

Parsing follows the project's own SDD/scripts/spec_lint.py when it exists (its regexes
and spec-folder walk are imported), so the page and the lint gate agree on what a spec,
a requirement and a status are. Without spec_lint.py, built-in copies are used.

Usage:
    python3 build_spectree.py --config spectree.config.json          # build the page
    python3 build_spectree.py --config spectree.config.json --verify # + compare with spec_lint
    python3 build_spectree.py --config spectree.config.json --check  # fail on unresolved Source paths
    python3 build_spectree.py --detect ../my-repo                     # print detected layout (JSON)
    python3 build_spectree.py --init --project app=../my-repo -o spectree.config.json

Exit codes: 0 ok, 1 findings (--check / --verify), 2 usage or config error.
"""

from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import glob
import html
import importlib.util
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple

GENERATOR_VERSION = "1.3.0"
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TEMPLATE = os.path.join(HERE, "template.html")
CONFIG_NAME = "spectree.config.json"

sys.dont_write_bytecode = True  # importing a project's spec_lint.py must not litter it

# --------------------------------------------------------------------------------------
# Defaults
# --------------------------------------------------------------------------------------

# Built-in copies of the spec_lint.py regexes, used only when a project has none.
DEFAULT_PARSING = {
    "req_heading": r"^#{2,4}\s+([A-Z]{2,5}-[A-Z]{2,6}-\d{3}):\s+\S",
    "req_id": r"\b([A-Z]{2,5}-[A-Z]{2,6}-\d{3})\b",
    "status": r"-\s*\*\*Status:\*\*\s*(?:[^\w]*\s*)?([A-Za-z]+)",
    "req_range": r"\b([A-Z]{2,5}-[A-Z]{2,6})-(\d{3})\s*(?:\.\.|–|to)\s*(?:[A-Z]{2,5}-[A-Z]{2,6}-)?(\d{3})\b",
    "test_def": r"^\s*(?:async\s+)?def\s+(test_\w+)|^\s*class\s+(Test\w+)",
}
SPEC_LINT_ATTRS = {
    "req_heading": "REQ_HEADING_RE",
    "req_id": "REQ_ID_RE",
    "status": "STATUS_RE",
    "req_range": "REQ_RANGE_RE",
    "test_def": "TEST_DEF_RE",
}
REQUIRED_SPEC_FILES = ("requirements.md", "design.md", "tasks.md")

STATUSES = ["Implemented", "Partial", "Gap", "Planned", "Deprecated", "Unknown"]
PALETTES = {
    "traffic": {
        "Implemented": "#2f9e5a", "Partial": "#e3a21a", "Gap": "#d94848",
        "Planned": "#3a7bd5", "Deprecated": "#8b929c", "Unknown": "#a971c4",
    },
    # Okabe-Ito: distinguishable with the common forms of colour blindness.
    "colorblind": {
        "Implemented": "#009E73", "Partial": "#E69F00", "Gap": "#D55E00",
        "Planned": "#0072B2", "Deprecated": "#999999", "Unknown": "#CC79A7",
    },
    "mono-blue": {
        "Implemented": "#1d4ed8", "Partial": "#60a5fa", "Gap": "#b91c1c",
        "Planned": "#a5b4fc", "Deprecated": "#9ca3af", "Unknown": "#c084fc",
    },
}

ALL_TILE_FIELDS = [
    "number", "title", "status", "req_count", "status_bar",
    "tasks", "evidence", "adrs", "gaps",
]

DEFAULT_FLOW = [
    {"name": "Constitution", "kind": "docs", "globs": ["steering/constitution.md"],
     "explain": "Non-negotiable principles. Every later artifact must obey them."},
    {"name": "Steering", "kind": "docs",
     "globs": ["steering/product.md", "steering/tech.md", "steering/structure.md", "steering/*.md"],
     "explain": "Product scope, tech stack and code layout that every spec assumes."},
    {"name": "Product (PRD)", "kind": "docs", "globs": ["prd/*.md"],
     "explain": "Users, problem, goals and the capabilities that become specs."},
    {"name": "Architecture", "kind": "docs", "globs": ["architecture/*.md"],
     "explain": "Components, flows and trust boundaries."},
    {"name": "Decisions (ADRs)", "kind": "adr", "globs": ["adr/[0-9][0-9][0-9][0-9]-*.md"],
     "explain": "One decision each, with context and consequences."},
    {"name": "Specs", "kind": "specs",
     "explain": "One folder per capability: requirements (EARS) -> design -> tasks. "
                "Tile colour = status rolled up from its requirements."},
    {"name": "Contracts", "kind": "docs", "globs": ["contracts/*.md"],
     "explain": "APIs shared with other projects."},
    {"name": "Delivery", "kind": "delivery",
     "explain": "Tasks become code; tests cite requirement IDs as evidence."},
    {"name": "Gates", "kind": "docs", "globs": ["gates/validation-gates.md", "gates/*.md"],
     "explain": "Checks that keep specs and code honest: lint, tests, gap register."},
]

DEFAULT_LAYERS = [
    [r"^tests?/", "Tests"],
    [r"(^|/)routers?/", "Routers / API"],
    [r"(^|/)(services?|svc)/", "Services"],
    [r"(^|/)(middleware|auth)/", "Auth & middleware"],
    [r"(^|/)templates?/", "Templates"],
    [r"(^|/)static/.*\.s?css$", "Styles"],
    [r"(^|/)static/", "Static assets & JS"],
    [r"^(k8s|helm|deploy|manifests|charts?)/", "Deploy manifests"],
    [r"^config/", "Config"],
    [r"(^|/)(Dockerfile|\.gitlab-ci\.yml|\.dockerignore|pyproject\.toml|requirements[^/]*\.txt)$", "Build & CI"],
    [r"^\.(gitlab|github)/", "Build & CI"],
    [r"^scripts/", "Scripts"],
    [r"^(SDD|docs?)/", "SDD & docs"],
    [r"^[^/]+/[^/]+\.py$", "Core modules"],
    [r".*", "Other"],
]

# Display order of component layers (Lines view, top to bottom) and layers collapsed at first.
DEFAULT_LAYER_ORDER = [
    "Routers / API", "Services", "Core modules", "Auth & middleware", "Templates", "Styles",
    "Static assets & JS", "Config", "Deploy manifests", "Build & CI", "Scripts", "SDD & docs",
    "Other", "Tests",
]
DEFAULT_COLLAPSED_LAYERS = ["Tests", "Deploy manifests"]

DESIGNS = ("orbit", "glass", "classic")
TITLE_SUFFIX = "SDD Spec tree"

DEFAULT_CONFIG: Dict[str, Any] = {
    "app_name": "",
    "title": "",
    "design": "glass",
    "output": "dist/sdd-explorer.html",
    "palette": "traffic",
    "colors": {},
    "tile_fields": list(ALL_TILE_FIELDS),
    "rollup": "worst",
    "group_folders": True,
    "include_tests_in_components": True,
    "flow": DEFAULT_FLOW,
    "layers": DEFAULT_LAYERS,
    "layer_order": DEFAULT_LAYER_ORDER,
    "collapsed_layers": DEFAULT_COLLAPSED_LAYERS,
    "cross_links": [],
    "auto_cross_links": True,
    "parsing": {},
    "projects": [],
}

PATH_EXTS = (
    ".py", ".html", ".htm", ".js", ".mjs", ".ts", ".tsx", ".jsx", ".css", ".scss",
    ".yaml", ".yml", ".json", ".md", ".toml", ".txt", ".sh", ".cfg", ".ini", ".tf",
    ".go", ".java", ".kt", ".rb", ".sql", ".j2", ".jinja", ".tpl", ".lock",
)
SPECIAL_FILES = {"Dockerfile", "Makefile", "Procfile", "Jenkinsfile"}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".mypy_cache",
             ".pytest_cache", "dist", "build", ".tox"}

MD_LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
TASK_RE = re.compile(r"^\s*[-*]\s+\[( |x|X)\]\s+(?:(T\d+[a-z]?)\.?\s+)?(.*)$")
META_RE = re.compile(r"^\s{0,3}-\s+\*\*([A-Za-z][A-Za-z /&-]*?):\*\*\s*(.*)$")
H1_RE = re.compile(r"^#\s+(.+?)\s*$")
H2_RE = re.compile(r"^##\s+(.+?)\s*$", re.M)
CODE_SPAN_RE = re.compile(r"`([^`\n]+)`")
BARE_PATH_RE = re.compile(
    r"(?<![\w/.-])((?:[\w.-]+/)*[\w.-]+\.(?:py|html|js|css|ya?ml|json|toml|sh))\b")
IDENT_RE = re.compile(r"^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$")
PY_DEF_RE = re.compile(r"^\s*(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)", re.M)
JS_DEF_RE = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(")
ADR_REF_RE = re.compile(r"\bADR[- ]?(\d{4})\b")


def warn(msg: str) -> None:
    print(f"spectree: warning: {msg}", file=sys.stderr)


def read(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read()
    except (OSError, UnicodeDecodeError):
        return ""


def git(path: str, *args: str) -> Optional[str]:
    try:
        out = subprocess.run(["git", "-C", path, *args], capture_output=True, text=True,
                             timeout=60, check=True)
        return out.stdout
    except (OSError, subprocess.SubprocessError):
        return None


def strip_md(s: str) -> str:
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = s.replace("<br>", ", ").replace("<br/>", ", ")
    s = re.sub(r"[*~]{2}", "", s)
    return s.strip()


def canon_status(word: str) -> str:
    w = (word or "").strip().lower()
    for s in STATUSES:
        if s.lower() == w:
            return s
    return "Unknown" if w else "Unknown"


def normalize_remote(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    m = re.match(r"^git@([^:]+):(.+?)(?:\.git)?/?$", url)
    if m:
        return f"https://{m.group(1)}/{m.group(2)}"
    m = re.match(r"^ssh://(?:[^@]+@)?([^/:]+)(?::\d+)?/(.+?)(?:\.git)?/?$", url)
    if m:
        return f"https://{m.group(1)}/{m.group(2)}"
    if url.startswith(("http://", "https://")):
        url = re.sub(r"^(https?://)[^@/]+@", r"\1", url)  # never keep credentials
        return re.sub(r"(?:\.git)?/?$", "", url)
    return ""


def blob_url(repo_url: str, ref: str, path: str) -> str:
    if not repo_url or not ref:
        return ""
    if "github.com" in repo_url:
        return f"{repo_url}/blob/{ref}/{path}"
    return f"{repo_url}/-/blob/{ref}/{path}"


# --------------------------------------------------------------------------------------
# Parsing rules (from the project's spec_lint.py when present)
# --------------------------------------------------------------------------------------

class Rules:
    def __init__(self, project_root: str, sdd_dir: str, overrides: Dict[str, str]):
        self.source = "built-in"
        self.lint = self._load_spec_lint(project_root, sdd_dir)
        pats: Dict[str, Any] = {}
        for key, default in DEFAULT_PARSING.items():
            attr = getattr(self.lint, SPEC_LINT_ATTRS[key], None) if self.lint else None
            if key in overrides:
                pats[key] = re.compile(overrides[key], re.M if key == "test_def" else 0)
            elif isinstance(attr, re.Pattern):
                pats[key] = attr
            else:
                pats[key] = re.compile(default, re.M if key == "test_def" else 0)
        self.req_heading: re.Pattern = pats["req_heading"]
        self.req_id: re.Pattern = pats["req_id"]
        self.status: re.Pattern = pats["status"]
        self.req_range: re.Pattern = pats["req_range"]
        self.test_def: re.Pattern = pats["test_def"]

    def _load_spec_lint(self, project_root: str, sdd_dir: str):
        path = os.path.join(project_root, sdd_dir, "scripts", "spec_lint.py")
        if not os.path.isfile(path):
            return None
        name = f"_spectree_spec_lint_{abs(hash(os.path.realpath(path)))}"
        spec = importlib.util.spec_from_file_location(name, path)
        if not spec or not spec.loader:
            return None
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod  # dataclasses need the module registered
        try:
            spec.loader.exec_module(mod)
        except Exception as exc:  # a broken lint script must not stop the page
            warn(f"could not import {path}: {exc}; using built-in rules")
            sys.modules.pop(name, None)
            return None
        self.source = os.path.relpath(path, project_root)
        return mod

    def iter_spec_dirs(self, specs_dir: str) -> Iterator[Tuple[str, str]]:
        fn = getattr(self.lint, "iter_spec_dirs", None)
        if callable(fn):
            yield from fn(specs_dir)
            return
        for name in sorted(os.listdir(specs_dir)):
            p = os.path.join(specs_dir, name)
            if not os.path.isdir(p) or name == "__pycache__":
                continue
            names = os.listdir(p)
            is_group = (not name.startswith("_")
                        and not any(n in names for n in REQUIRED_SPEC_FILES)
                        and any(os.path.exists(os.path.join(p, n, "requirements.md")) for n in names))
            if is_group:
                for child in sorted(names):
                    cp = os.path.join(p, child)
                    if os.path.isdir(cp) and child != "__pycache__":
                        yield f"{name}/{child}", cp
            else:
                yield name, p

    def ids_in(self, text: str) -> List[str]:
        """Requirement IDs in text, with ranges such as 'DSH-HLM-001 to 008' expanded."""
        out = list(self.req_id.findall(text))
        for prefix, lo, hi in self.req_range.findall(text):
            lo_i, hi_i = int(lo), int(hi)
            if 0 <= hi_i - lo_i <= 300:
                out.extend(f"{prefix}-{n:03d}" for n in range(lo_i, hi_i + 1))
        seen: Dict[str, None] = {}
        for i in out:
            seen.setdefault(i, None)
        return list(seen)


# --------------------------------------------------------------------------------------
# Source-line resolver: turns "`app/routers/x.py`", "`portal.html`" or "`HelmService.get`"
# into repo paths.
# --------------------------------------------------------------------------------------

class Resolver:
    def __init__(self, root: str, files: List[str], symbol_map: Dict[str, str], tests_dir: str):
        self.files = files
        self.fileset = set(files)
        self.by_base: Dict[str, List[str]] = defaultdict(list)
        for f in files:
            self.by_base[f.rsplit("/", 1)[-1]].append(f)
        self.symbol_map = dict(symbol_map or {})
        self.tests_prefix = tests_dir.rstrip("/") + "/" if tests_dir else "tests/"
        self.dirs = {f.rsplit("/", i)[0] for f in files for i in range(1, f.count("/") + 1)}
        self.top_dirs = {f.split("/", 1)[0] for f in files if "/" in f}
        self.symbols = self._index_symbols(root)
        self.unresolved: Counter = Counter()

    def _index_symbols(self, root: str) -> Dict[str, str]:
        found: Dict[str, Set[str]] = defaultdict(set)
        for f in self.files:
            if f.startswith(self.tests_prefix) or "/vendor/" in f or f.startswith("SDD/"):
                continue
            if not f.endswith((".py", ".js", ".mjs", ".html")):
                continue
            p = os.path.join(root, f)
            try:
                if os.path.getsize(p) > 1_500_000:
                    continue
            except OSError:
                continue
            text = read(p)
            rx = PY_DEF_RE if f.endswith(".py") else JS_DEF_RE
            for name in rx.findall(text):
                if len(name) >= 4:
                    found[name].add(f)
        return {k: next(iter(v)) for k, v in found.items() if len(v) == 1}

    def _pick(self, cands: List[str]) -> List[str]:
        if len(cands) <= 1:
            return cands
        pref = [c for c in cands if not c.startswith(self.tests_prefix) and "/vendor/" not in c
                and not c.startswith(("SDD/", "documentation/", "docs/"))]
        return pref if len(pref) == 1 else []

    def _is_pathlike(self, w: str) -> bool:
        base = w.rsplit("/", 1)[-1]
        if w.endswith(PATH_EXTS) or base in SPECIAL_FILES:
            return True
        # 'documentation/README' counts; 'eks.amazonaws.com/role-arn' does not
        return "/" in w and w.split("/", 1)[0] in self.top_dirs

    def resolve_word(self, w: str) -> List[str]:
        w = w.strip().lstrip("('\"").rstrip(".,;:'\")")
        w = re.split(r"[(\[{]", w, maxsplit=1)[0]
        if w.startswith("./"):
            w = w[2:]
        if (not w or "://" in w or "::" in w or "..." in w or "…" in w or w.endswith("/")
                or w.startswith(("/", "$", "-", "<", "~"))):
            return []
        if w in self.fileset:
            return [w]
        if "<" in w or ">" in w or w in self.dirs:
            return []  # placeholder ('k8s/<cluster>/x') or a directory, not a file
        if any(ch in w for ch in "*?"):
            return [f for f in self.files if fnmatch.fnmatch(f, w)]
        if self._is_pathlike(w):
            if "/" in w:
                cands = [f for f in self.files if f.endswith("/" + w)]
            else:
                cands = list(self.by_base.get(w, []))
            picked = self._pick(cands)
            if picked:
                return picked
            if not w.startswith("."):
                self.unresolved[w] += 1
            return []
        if IDENT_RE.match(w):
            parts = w.split(".")
            for key in (w, parts[-1], parts[0]):
                if key in self.symbol_map:
                    target = self.symbol_map[key]
                    return [target] if target in self.fileset else []
            for key in (parts[0], parts[-1]):
                if key in self.symbols:
                    return [self.symbols[key]]
        return []

    def resolve_text(self, text: str) -> List[str]:
        words: List[str] = []
        for span in CODE_SPAN_RE.findall(text):
            words.extend(re.split(r"[\s,]+", span))
        outside = CODE_SPAN_RE.sub(" ", text)
        words.extend(BARE_PATH_RE.findall(outside))
        out: Dict[str, None] = {}
        for w in words:
            for p in self.resolve_word(w):
                out.setdefault(p, None)
        return list(out)


# --------------------------------------------------------------------------------------
# Project parsing
# --------------------------------------------------------------------------------------

def list_files(root: str) -> List[str]:
    out = git(root, "ls-files", "--cached", "--others", "--exclude-standard")
    if out is not None:
        return sorted({l.strip() for l in out.splitlines() if l.strip()})
    files = []
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            files.append(os.path.relpath(os.path.join(dp, fn), root).replace(os.sep, "/"))
    return sorted(files)


def git_info(root: str) -> Dict[str, Any]:
    branch = (git(root, "rev-parse", "--abbrev-ref", "HEAD") or "").strip()
    sha = (git(root, "rev-parse", "--short", "HEAD") or "").strip()
    status = git(root, "status", "--porcelain")
    remote = (git(root, "remote", "get-url", "origin") or "").strip()
    return {
        "branch": branch, "sha": sha,
        "dirty": bool(status and status.strip()),
        "dirty_count": len(status.splitlines()) if status else 0,
        "remote": normalize_remote(remote),
    }


def parse_meta(lines: List[str]) -> Dict[str, str]:
    meta: Dict[str, str] = {}
    cur: Optional[str] = None
    for line in lines:
        m = META_RE.match(line)
        if m:
            cur = m.group(1).strip()
            meta[cur] = (meta.get(cur, "") + " " + m.group(2)).strip()
        elif cur and line.startswith(("  ", "\t")) and line.strip():
            meta[cur] += " " + line.strip()
        else:
            cur = None
    return meta


def h1_and_banner(text: str) -> Tuple[str, bool]:
    lines = text.splitlines()
    for i, l in enumerate(lines):
        m = H1_RE.match(l)
        if m:
            pre = "\n".join(lines[:i])
            return m.group(1), bool(re.search(r"^\s*>.*\bdeprecated\b", pre, re.M | re.I))
    return "", False


def rollup(counts: Dict[str, int], banner_deprecated: bool) -> str:
    active = {k: v for k, v in counts.items() if v and k != "Deprecated"}
    if banner_deprecated or (not active and counts.get("Deprecated")):
        return "Deprecated"
    if not active:
        return "Unknown"
    if active.get("Gap"):
        return "Gap"
    if active.get("Partial") or active.get("Unknown"):
        return "Partial"
    if active.get("Planned") and active.get("Implemented"):
        return "Partial"
    if active.get("Planned"):
        return "Planned"
    return "Implemented"


def parse_tasks(text: str, rules: Rules) -> List[Dict[str, Any]]:
    tasks: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Any]] = None
    for line in text.splitlines():
        m = TASK_RE.match(line)
        if m:
            cur = {"id": m.group(2) or "", "done": m.group(1).lower() == "x",
                   "text": m.group(3).strip(), "covers": [], "gate": ""}
            tasks.append(cur)
            continue
        if cur is None:
            continue
        s = line.strip()
        if line.startswith("#"):
            cur = None
        elif s.startswith(("-", "*")) and ("Covers:" in s or "Gate:" in s):
            cm = re.search(r"Covers:\s*([^·|]*)", s)
            if cm:
                cur["covers"].extend(i for i in rules.ids_in(cm.group(1)) if i not in cur["covers"])
            gm = re.search(r"Gate:\s*(.+)$", s)
            if gm:
                cur["gate"] = gm.group(1).strip()
        elif s and line.startswith(("  ", "\t")) and not s.startswith(("-", "*")):
            cur["text"] += " " + s
    for t in tasks:
        if not t["covers"]:
            t["covers"] = rules.ids_in(t["text"])
        if len(t["text"]) > 220:
            t["text"] = t["text"][:217] + "..."
    return tasks


def parse_table_rows(text: str) -> Iterator[Tuple[str, List[str], List[str]]]:
    """Yield (current heading, header cells (lower), row cells) for every markdown table row."""
    heading = ""
    header: Optional[List[str]] = None
    for line in text.splitlines():
        if line.startswith("#"):
            heading = line.lstrip("#").strip()
            header = None
            continue
        if not line.lstrip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
            continue
        if header is None:
            header = [strip_md(c).lower() for c in cells]
            continue
        yield heading, header, cells


def col(header: List[str], cells: List[str], *names: str) -> str:
    for n in names:
        for i, h in enumerate(header):
            if h == n and i < len(cells):
                return strip_md(cells[i])
    for n in names:
        for i, h in enumerate(header):
            if n in h and i < len(cells):
                return strip_md(cells[i])
    return ""


def gap_reqs(header: List[str], cells: List[str], rules: Rules) -> List[str]:
    """Requirement IDs a gap row is about: the first cell, else a 'req' column, else the row."""
    first = rules.ids_in(cells[0])
    if first:
        return first
    for i, h in enumerate(header):
        if "req" in h and i < len(cells):
            ids = rules.ids_in(cells[i])
            if ids:
                return ids
    return rules.ids_in(" | ".join(cells))


def parse_gap_register(path: str, rules: Rules) -> List[Dict[str, Any]]:
    text = read(path)
    rows = []
    for heading, header, cells in parse_table_rows(text):
        if not cells or not cells[0]:
            continue
        line = " | ".join(cells)
        closed = ("closed" in heading.lower() or cells[0].startswith("~~")
                  or bool(re.search(r"\*\*Closed\b", line)))
        gid = re.sub(r"[~*`]", "", cells[0]).strip()
        gid = strip_md(gid)
        rows.append({
            "id": gid, "closed": closed,
            "sev": col(header, cells, "sev", "severity"),
            "title": col(header, cells, "title", "gap", "issue"),
            "pinned": col(header, cells, "pinned by", "pinned"),
            "reqs": gap_reqs(header, cells, rules),
        })
    return rows


def ui_map_areas(path: str) -> Dict[str, str]:
    """spec display name (e.g. 'ui/030-ui-ns-card-collapsed') -> area heading."""
    areas: Dict[str, str] = {}
    area = ""
    for line in read(path).splitlines():
        m = re.match(r"^###\s+(.+)$", line)
        if m:
            area = m.group(1).strip()
            continue
        if area and line.lstrip().startswith("|"):
            for target in re.findall(r"specs/([^)\s]+?)/requirements\.md", line):
                areas.setdefault(target, area)
    return areas


def workflow_steps(path: str) -> List[Dict[str, str]]:
    """Numbered '1. **Label.** text' items (with wrapped lines) from the workflow file."""
    raw: List[List[str]] = []
    for line in read(path).splitlines():
        m = re.match(r"^\s*\d+\.\s+\*\*(.+?)\*\*\s*(.*)$", line)
        if m:
            raw.append([m.group(1).strip().rstrip("."), m.group(2).strip()])
        elif raw and line.startswith(("  ", "\t")) and line.strip() and not re.match(r"^\s*([-*]|\d+\.)\s", line):
            raw[-1][1] += " " + line.strip()
        elif raw and not line.strip():
            raw.append(None)  # type: ignore[arg-type]
    steps = []
    for item in raw:
        if item is None:
            if steps:
                break  # first contiguous numbered list only
            continue
        desc = re.split(r"(?<=\.)\s", strip_md(item[1]), maxsplit=1)[0]
        steps.append({"label": item[0], "text": desc})
    return steps if 3 <= len(steps) <= 12 else []


class Project:
    def __init__(self, cfg: Dict[str, Any], cfg_dir: str, global_cfg: Dict[str, Any]):
        self.key = cfg["key"]
        self.name = cfg.get("name") or self.key
        self.root = os.path.realpath(os.path.join(cfg_dir, cfg["path"]))
        if not os.path.isdir(self.root):
            raise SystemExit(f"spectree: project '{self.key}': path not found: {self.root}")
        self.sdd_dir = cfg.get("sdd_dir", "SDD")
        self.specs_dir = cfg.get("specs_dir", os.path.join(self.sdd_dir, "specs"))
        self.tests_dir = cfg.get("tests_dir", "tests")
        self.exclude_tests = cfg.get("exclude_tests", [])
        self.ui_map = cfg.get("ui_map", "")
        self.workflow = cfg.get("workflow", os.path.join(self.sdd_dir, "workflow.md"))
        self.gap_register = cfg.get("gap_register", os.path.join(self.sdd_dir, "gates", "gap-register.md"))
        overrides = dict(global_cfg.get("parsing") or {})
        overrides.update(cfg.get("parsing") or {})
        self.rules = Rules(self.root, self.sdd_dir, overrides)
        self.git = git_info(self.root)
        self.repo_url = normalize_remote(cfg.get("repo_url") or "") or self.git["remote"]
        self.ref = cfg.get("ref") or self.git["branch"] or "main"
        self.files = list_files(self.root)
        self.resolver = Resolver(self.root, self.files, cfg.get("symbol_map") or {}, self.tests_dir)
        self.warnings: List[str] = []

    def rel(self, p: str) -> str:
        return os.path.relpath(os.path.realpath(p), self.root).replace(os.sep, "/")

    def url(self, rel_path: str) -> str:
        return blob_url(self.repo_url, self.ref, rel_path)

    def node(self, rel_path: str) -> str:
        return f"{self.key}:{rel_path}"


def parse_doc(project: Project, abs_path: str, layer: str, layer_index: int, kind: str,
              adr_status: Dict[str, str]) -> Dict[str, Any]:
    text = read(abs_path)
    rel_path = project.rel(abs_path)
    h1, banner = h1_and_banner(text)
    title = strip_md(h1) or os.path.basename(abs_path)
    subtitle = ""
    number = ""
    status = ""
    status_cat = ""
    m = re.match(r"^ADR[- ]?(\d{3,4})\s*[:—–-]\s*(.+)$", title)
    if kind == "adr" or m:
        number = (m.group(1) if m else re.match(r"(\d+)", os.path.basename(abs_path)).group(1)).zfill(4)
        if m:
            title = m.group(2).strip()
        status = adr_status.get(number, "")
        if not status:
            sm = re.search(r"^\s*-\s*(?:\*\*)?Status:?(?:\*\*)?:?\s*(.+)$", text, re.M | re.I)
            status = strip_md(sm.group(1)) if sm else ""
        low = status.lower()
        status_cat = ("Deprecated" if ("supersed" in low or "deprecat" in low or "rejected" in low)
                      else "Planned" if ("planned" in low or "proposed" in low or "draft" in low)
                      else "Implemented" if status else "Unknown")
    elif " — " in title:
        title, subtitle = [x.strip() for x in title.split(" — ", 1)]
    sections = [strip_md(h) for h in H2_RE.findall(text)]
    stats: List[Dict[str, Any]] = []
    principles = re.findall(r"^\s*[-*]\s+\*\*([A-Z]{1,3}-\d+(?:\.\d+)?)\*\*", text, re.M)
    gates = sorted({g for g in re.findall(r"^##\s+(G\d+)\b", text, re.M)}, key=lambda g: int(g[1:]))
    version = re.search(r"[Vv]ersion:?\*\*:?\s*([0-9]+(?:\.[0-9]+){1,2})", text)
    if principles:
        stats.append({"label": "principles", "value": len(principles)})
    if gates:
        stats.append({"label": "gates", "value": f"{gates[0]}–{gates[-1]}" if len(gates) > 1 else gates[0]})
    if version:
        stats.append({"label": "version", "value": version.group(1)})
    if kind == "adr":
        pass
    elif sections:
        stats.insert(0, {"label": "sections", "value": len(sections)})
    return {
        "id": project.node(rel_path), "project": project.key, "layer": layer,
        "layer_index": layer_index, "kind": kind, "path": rel_path, "url": project.url(rel_path),
        "title": title, "subtitle": subtitle, "number": number, "status": status,
        "status_cat": status_cat or ("Deprecated" if banner else ""), "stats": stats,
        "sections": sections[:40],
    }


def adr_index_status(project: Project) -> Dict[str, str]:
    out: Dict[str, str] = {}
    adr_dir = os.path.join(project.root, project.sdd_dir, "adr")
    for p in sorted(glob.glob(os.path.join(adr_dir, "*.md"))):
        base = os.path.basename(p)
        if not (base.startswith("0000") or "index" in base.lower() or base.lower() == "readme.md"):
            continue
        for _h, header, cells in parse_table_rows(read(p)):
            m = re.search(r"\b(\d{4})\b", cells[0]) if cells else None
            if m:
                out[m.group(1)] = col(header, cells, "status")
    return out


def parse_foundation(project: Project, flow: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []
    claimed: Set[str] = set()
    sdd_root = os.path.join(project.root, project.sdd_dir)
    adr_status = adr_index_status(project)
    for idx, layer in enumerate(flow):
        kind = layer.get("kind", "docs")
        if kind not in ("docs", "adr"):
            continue
        for pattern in layer.get("globs", []):
            for p in sorted(glob.glob(os.path.join(sdd_root, pattern))):
                rp = os.path.realpath(p)
                base = os.path.basename(p)
                if rp in claimed or not os.path.isfile(p):
                    continue
                if kind == "adr" and (base.startswith("0000") or "index" in base.lower()):
                    continue
                claimed.add(rp)
                docs.append(parse_doc(project, p, layer["name"], idx, kind, adr_status))
    return docs


def parse_specs(project: Project, area_map: Dict[str, str]) -> Tuple[List[Dict[str, Any]], Dict[str, List[str]]]:
    rules = project.rules
    specs_abs = os.path.join(project.root, project.specs_dir)
    specs: List[Dict[str, Any]] = []
    raw_links: Dict[str, List[str]] = {}
    if not os.path.isdir(specs_abs):
        project.warnings.append(f"specs directory not found: {project.specs_dir}")
        return specs, raw_links
    for name, path in rules.iter_spec_dirs(specs_abs):
        base = os.path.basename(name)
        if base.startswith("_"):
            continue
        group = name.split("/", 1)[0] if "/" in name else ""
        req_path = os.path.join(path, "requirements.md")
        req_text = read(req_path)
        design_text = read(os.path.join(path, "design.md"))
        tasks_text = read(os.path.join(path, "tasks.md"))
        h1, banner = h1_and_banner(req_text)
        title = re.sub(r"^Requirements\s*[—–:-]\s*", "", strip_md(h1)).strip()
        m = re.match(r"^(\d+)[-_](.+)$", base)
        number, slug = (m.group(1), m.group(2)) if m else ("", base)
        title = title or slug.replace("-", " ").title()
        spec_id = project.node(project.rel(path))

        reqs: List[Dict[str, Any]] = []
        cur_id, cur_title, block = None, "", []

        def flush():
            if cur_id is None:
                return
            blob = "\n".join(block)
            sm = rules.status.search(blob)
            status = canon_status(sm.group(1)) if sm else "Unknown"
            note = ""
            if sm:
                note = blob[sm.end():].split("\n", 1)[0].strip().strip("()").strip()
            meta = parse_meta(block)
            src_text = meta.get("Source", "")
            reqs.append({
                "id": cur_id, "title": cur_title, "status": status, "note": note[:160],
                "source_text": strip_md(src_text)[:300],
                "sources": project.resolver.resolve_text(src_text) if src_text else [],
                "named_tests": sorted(set(re.findall(r"\btest_\w+", blob))),
                "meta": {k: strip_md(v)[:200] for k, v in meta.items()
                         if k not in ("Status", "Source")},
            })

        for line in req_text.splitlines():
            hm = rules.req_heading.match(line)
            if hm:
                flush()
                cur_id = hm.group(1)
                rest = line[line.find(cur_id) + len(cur_id):].lstrip(":").strip()
                cur_title = rest.replace("`", "")
                block = []
            elif cur_id is not None:
                block.append(line)
        flush()

        counts = {s: 0 for s in STATUSES}
        for r in reqs:
            counts[r["status"]] += 1
        tasks = parse_tasks(tasks_text, rules)
        spec_text = req_text + "\n" + design_text
        own = {r["id"] for r in reqs}
        raw_links[spec_id] = [i for i in rules.ids_in(spec_text + "\n" + tasks_text) if i not in own]

        doc_links: Set[str] = set()
        for txt, fdir in ((req_text, path), (design_text, path)):
            for target in MD_LINK_RE.findall(txt):
                t = target.split("#", 1)[0]
                if not t or t.startswith(("http://", "https://", "mailto:")):
                    continue
                doc_links.add(os.path.realpath(os.path.join(fdir, t)))
        adr_nums = sorted(set(ADR_REF_RE.findall(spec_text)))
        code_paths = sorted({w for span in CODE_SPAN_RE.findall(spec_text) for w in span.split()
                             if "/" in w and w.rstrip(".,;:)").endswith(".md")})

        rel_dir = project.rel(path)
        specs.append({
            "id": spec_id, "project": project.key, "name": name, "group": group,
            "area": area_map.get(name, "") if group else "",
            "number": number, "slug": slug, "title": title,
            "banner_deprecated": banner,
            "status": rollup(counts, banner), "counts": counts, "reqs": reqs,
            "tasks": {"done": sum(1 for t in tasks if t["done"]), "total": len(tasks), "items": tasks},
            "urls": {f: project.url(f"{rel_dir}/{f}") for f in REQUIRED_SPEC_FILES},
            "path": rel_dir,
            "_doc_links": sorted(doc_links), "_adr_nums": adr_nums, "_code_paths": code_paths,
        })
    return specs, raw_links


def scan_tests(project: Project) -> Tuple[Dict[str, Set[str]], Set[str]]:
    rules = project.rules
    cites: Dict[str, Set[str]] = defaultdict(set)
    names: Set[str] = set()
    tdir = os.path.join(project.root, project.tests_dir)
    if not os.path.isdir(tdir):
        return cites, names
    for dp, dns, fns in os.walk(tdir):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            if not fn.endswith(".py"):
                continue
            ap = os.path.join(dp, fn)
            rp = project.rel(ap)
            if any(fnmatch.fnmatch(rp, pat) for pat in project.exclude_tests):
                continue
            text = read(ap)
            names.add(fn[:-3])
            for m in rules.test_def.finditer(text):
                names.add(m.group(1) or m.group(2))
            for rid in rules.ids_in(text):
                cites[rid].add(rp)
    return cites, names


def classify(path: str, layers: List[List[str]]) -> str:
    for pattern, label in layers:
        if re.search(pattern, path):
            return label
    return "Other"


# --------------------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------------------

def build_model(cfg: Dict[str, Any], cfg_dir: str) -> Dict[str, Any]:
    flow = cfg.get("flow") or DEFAULT_FLOW
    layers = cfg.get("layers") or DEFAULT_LAYERS
    palette = dict(PALETTES.get(cfg.get("palette", "traffic"), PALETTES["traffic"]))
    palette.update(cfg.get("colors") or {})
    projects = [Project(p, cfg_dir, cfg) for p in cfg["projects"]]
    if len({p.key for p in projects}) != len(projects):
        raise SystemExit("spectree: project keys must be unique")

    foundation: List[Dict[str, Any]] = []
    specs: List[Dict[str, Any]] = []
    raw_links: Dict[str, List[str]] = {}
    gaps: List[Dict[str, Any]] = []
    tests_by_project: Dict[str, Tuple[Dict[str, Set[str]], Set[str]]] = {}
    steps: List[Dict[str, str]] = []

    for p in projects:
        foundation.extend(parse_foundation(p, flow))
        area_map = ui_map_areas(os.path.join(p.root, p.ui_map)) if p.ui_map else {}
        s, links = parse_specs(p, area_map)
        specs.extend(s)
        raw_links.update(links)
        tests_by_project[p.key] = scan_tests(p)
        gr = os.path.join(p.root, p.gap_register)
        if os.path.isfile(gr):
            for row in parse_gap_register(gr, p.rules):
                row["project"] = p.key
                gaps.append(row)
        if not steps:
            steps = workflow_steps(os.path.join(p.root, p.workflow))

    pmap = {p.key: p for p in projects}
    req_index: Dict[str, str] = {}
    for s in specs:
        for r in s["reqs"]:
            req_index.setdefault(r["id"], s["id"])
    spec_by_id = {s["id"]: s for s in specs}
    doc_by_real: Dict[str, str] = {}
    for d in foundation:
        doc_by_real[os.path.realpath(os.path.join(pmap[d["project"]].root, d["path"]))] = d["id"]
    adr_by_num: Dict[Tuple[str, str], str] = {
        (d["project"], d["number"]): d["id"] for d in foundation if d["kind"] == "adr"}
    docs_kind = {d["id"]: d["kind"] for d in foundation}

    # evidence, gaps, components
    components: Dict[str, Dict[str, Any]] = {}

    def comp(project: Project, path: str, kind: str) -> Dict[str, Any]:
        cid = project.node(path)
        if cid not in components:
            components[cid] = {"id": cid, "project": project.key, "path": path,
                               "layer": "Tests" if kind == "test" else classify(path, layers),
                               "kind": kind, "url": project.url(path), "specs": {}}
        return components[cid]

    open_gap_reqs: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for g in gaps:
        if not g["closed"]:
            for rid in g["reqs"]:
                open_gap_reqs[rid].append(g)

    for s in specs:
        p = pmap[s["project"]]
        cites, names = tests_by_project[p.key]
        impl = tested = 0
        spec_gaps: Dict[str, Dict[str, Any]] = {}
        for r in s["reqs"]:
            files = sorted(cites.get(r["id"], set()))
            named = [n for n in r["named_tests"] if n in names]
            r["tests"] = files
            r["tested"] = bool(files or named)
            del r["named_tests"]
            if r["status"] == "Implemented":
                impl += 1
                tested += 1 if r["tested"] else 0
            for g in open_gap_reqs.get(r["id"], []):
                spec_gaps[f'{g["project"]}:{g["id"]}'] = {k: g[k] for k in ("id", "sev", "title", "pinned")}
            if r["status"] != "Deprecated":
                for path in r["sources"]:
                    c = comp(p, path, "code")
                    c["specs"].setdefault(s["id"], []).append(r["id"])
        s["evidence"] = {"implemented": impl, "tested": tested}
        s["gaps"] = list(spec_gaps.values())
        # documents and ADRs this spec points at
        targets = list(s.pop("_doc_links"))
        for w in s.pop("_code_paths"):
            w = w.rstrip(".,;:)")
            targets.append(os.path.realpath(os.path.join(p.root, w)))
            for q in projects:  # `sibling-repo/SDD/adr/0009-x.md` written in a code span
                if w.startswith(os.path.basename(q.root) + "/"):
                    targets.append(os.path.realpath(os.path.join(os.path.dirname(q.root), w)))
        docs = sorted({doc_by_real[d] for d in targets if d in doc_by_real})
        adrs = {adr_by_num[(s["project"], n.zfill(4))] for n in s.pop("_adr_nums")
                if (s["project"], n.zfill(4)) in adr_by_num}
        adrs.update(d for d in docs if docs_kind.get(d) == "adr")
        s["adrs"] = sorted(adrs)
        s["docs"] = sorted({d for d in docs if d not in adrs})

    if cfg.get("include_tests_in_components", True):
        for p in projects:
            cites, _names = tests_by_project[p.key]
            for rid, files in cites.items():
                sid = req_index.get(rid)
                if not sid:
                    continue
                for f in files:
                    c = comp(p, f, "test")
                    c["specs"].setdefault(sid, []).append(rid)

    # spec -> spec links (from requirement IDs mentioned in another spec's files)
    for s in specs:
        links: Dict[str, List[str]] = defaultdict(list)
        for rid in raw_links.get(s["id"], []):
            target = req_index.get(rid)
            if target and target != s["id"]:
                links[target].append(rid)
        s["links"] = {k: sorted(set(v)) for k, v in links.items()}

    cross: List[Dict[str, Any]] = []
    if cfg.get("auto_cross_links", True):
        for s in specs:
            for target, ids in s["links"].items():
                if spec_by_id[target]["project"] != s["project"]:
                    cross.append({"from": s["id"], "to": target, "kind": "spec-ref", "ids": ids,
                                  "label": f"{len(ids)} requirement reference(s)"})
            for d in s["docs"] + s["adrs"]:
                if d.split(":", 1)[0] != s["project"]:
                    cross.append({"from": s["id"], "to": d, "kind": "doc-ref", "ids": [],
                                  "label": "links to a document in another project"})
    known_nodes = set(spec_by_id) | {d["id"] for d in foundation}
    for link in cfg.get("cross_links") or []:
        a, b = link.get("from", ""), link.get("to", "")
        if a in known_nodes and b in known_nodes:
            cross.append({"from": a, "to": b, "kind": "declared", "ids": [],
                          "label": link.get("label", "declared link")})
        else:
            warn(f"cross_link {a} -> {b}: node not found (use '<project key>:<path from repo root>')")

    for c in components.values():
        c["specs"] = {k: sorted(set(v)) for k, v in c["specs"].items()}

    project_out = []
    for p in projects:
        ps = [s for s in specs if s["project"] == p.key]
        counts = {k: sum(s["counts"][k] for s in ps) for k in STATUSES}
        roll = Counter(s["status"] for s in ps)
        tasks_done = sum(s["tasks"]["done"] for s in ps)
        tasks_total = sum(s["tasks"]["total"] for s in ps)
        impl = sum(s["evidence"]["implemented"] for s in ps)
        tested = sum(s["evidence"]["tested"] for s in ps)
        cites, _ = tests_by_project[p.key]
        test_files = sorted({f for fs in cites.values() for f in fs})
        project_out.append({
            "key": p.key, "name": p.name, "branch": p.git["branch"], "sha": p.git["sha"],
            "dirty": p.git["dirty"], "dirty_count": p.git["dirty_count"],
            "repo_url": p.repo_url, "ref": p.ref, "rules": p.rules.source,
            "spec_count": len(ps), "req_count": sum(len(s["reqs"]) for s in ps),
            "counts": counts, "rollup": {k: roll.get(k, 0) for k in STATUSES},
            "tasks": {"done": tasks_done, "total": tasks_total},
            "evidence": {"implemented": impl, "tested": tested},
            "test_files": len(test_files),
            "components": sum(1 for c in components.values()
                              if c["project"] == p.key and c["kind"] == "code"),
            "unresolved": sorted(p.resolver.unresolved.items(), key=lambda kv: (-kv[1], kv[0]))[:200],
            "warnings": p.warnings,
        })

    return {
        "meta": {
            "title": page_title(cfg),
            "app_name": cfg.get("app_name") or "",
            "design": cfg.get("design") if cfg.get("design") in DESIGNS else "glass",
            "generated_at": dt.datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z"),
            "generator_version": GENERATOR_VERSION,
            "colors": palette, "statuses": STATUSES,
            "tile_fields": [f for f in cfg.get("tile_fields") or ALL_TILE_FIELDS if f in ALL_TILE_FIELDS],
            "group_folders": bool(cfg.get("group_folders", True)),
            "layer_order": cfg.get("layer_order") or DEFAULT_LAYER_ORDER,
            "collapsed_layers": cfg.get("collapsed_layers", DEFAULT_COLLAPSED_LAYERS),
            "flow": [{"name": l["name"], "kind": l.get("kind", "docs"), "explain": l.get("explain", "")}
                     for l in flow],
            "workflow_steps": steps,
        },
        "projects": project_out,
        "foundation": foundation,
        "specs": specs,
        "components": sorted(components.values(), key=lambda c: (c["project"], c["layer"], c["path"])),
        "cross": cross,
        "gaps": [g for g in gaps if not g["closed"]],
        "closed_gap_count": sum(1 for g in gaps if g["closed"]),
    }


def page_title(cfg: Dict[str, Any]) -> str:
    """Explicit title wins; otherwise '<app name> - SDD Spec tree'."""
    if cfg.get("title"):
        return cfg["title"]
    app = (cfg.get("app_name") or "").strip()
    return f"{app} - {TITLE_SUFFIX}" if app else TITLE_SUFFIX


def render(model: Dict[str, Any], template_path: str) -> str:
    tpl = read(template_path)
    if "__SPECTREE_DATA__" not in tpl:
        raise SystemExit(f"spectree: template {template_path} has no __SPECTREE_DATA__ placeholder")
    data = json.dumps(model, ensure_ascii=False, separators=(",", ":"))
    data = data.replace("</", "<\\/").replace("<!--", "<\\!--")
    out = tpl.replace("__SPECTREE_TITLE__", html.escape(model["meta"]["title"]))
    return out.replace("__SPECTREE_DATA__", data)


# --------------------------------------------------------------------------------------
# Config, detect, init, verify
# --------------------------------------------------------------------------------------

def load_config(path: str) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            user = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"spectree: cannot read config {path}: {exc}")
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    cfg.update(user)
    if not cfg.get("projects"):
        raise SystemExit("spectree: config has no projects")
    for p in cfg["projects"]:
        if "key" not in p or "path" not in p:
            raise SystemExit("spectree: every project needs 'key' and 'path'")
    return cfg


def detect(path: str) -> Dict[str, Any]:
    root = os.path.realpath(path)
    if not os.path.isdir(root):
        raise SystemExit(f"spectree: not a directory: {path}")
    out: Dict[str, Any] = {"path": root, "name": os.path.basename(root)}
    sdd = next((d for d in ("SDD", "sdd", "docs/sdd", "docs/SDD", ".kiro", "docs", "spec", "specs")
                if os.path.isdir(os.path.join(root, d))), "")
    candidates = [os.path.join(sdd, "specs")] if sdd else []
    candidates += [".kiro/specs", "docs/specs", "specs", "spec"]
    specs_dir = ""
    best = 0
    for c in candidates:
        d = os.path.join(root, c)
        if os.path.isdir(d):
            n = len(glob.glob(os.path.join(d, "*", "requirements.md"))) + \
                len(glob.glob(os.path.join(d, "*", "*", "requirements.md")))
            if n > best:
                best, specs_dir = n, c
    if sdd in ("specs", "spec") and specs_dir == sdd:
        sdd = ""
    out["sdd_dir"] = sdd
    out["specs_dir"] = specs_dir
    out["spec_folders"] = best
    out["tests_dir"] = next((d for d in ("tests", "test", "src/test") if os.path.isdir(os.path.join(root, d))), "")
    out["spec_lint"] = os.path.isfile(os.path.join(root, sdd, "scripts", "spec_lint.py")) if sdd else False
    ui = glob.glob(os.path.join(root, sdd or ".", "**", "*UI-MAP*.md"), recursive=True)
    out["ui_map"] = os.path.relpath(ui[0], root) if ui else ""
    gi = git_info(root)
    out.update({"repo_url": gi["remote"], "branch": gi["branch"], "sha": gi["sha"], "dirty": gi["dirty"]})
    prefixes: Counter = Counter()
    if specs_dir:
        rx = re.compile(DEFAULT_PARSING["req_heading"], re.M)
        for f in glob.glob(os.path.join(root, specs_dir, "**", "requirements.md"), recursive=True):
            if "/_" in f:
                continue
            for rid in rx.findall(read(f)):
                prefixes[rid.split("-", 1)[0]] += 1
    out["req_prefixes"] = dict(prefixes.most_common(5))
    out["foundation_found"] = sorted(
        os.path.relpath(p, os.path.join(root, sdd)) for p in glob.glob(os.path.join(root, sdd, "*", "*.md"))
        if "/specs/" not in p) if sdd else []
    return out


def init_config(projects: List[str], out_path: str, title: str, palette: str,
                fields: Optional[List[str]], app_name: str = "", design: str = "glass") -> Dict[str, Any]:
    cfg_dir = os.path.realpath(os.path.dirname(os.path.abspath(out_path)))
    plist = []
    for item in projects:
        if "=" not in item:
            raise SystemExit("spectree: --project expects key=path")
        key, path = item.split("=", 1)
        d = detect(path)
        entry: Dict[str, Any] = {
            "key": key, "name": d["name"],
            "path": os.path.relpath(d["path"], cfg_dir),
            "sdd_dir": d["sdd_dir"] or ".", "specs_dir": d["specs_dir"] or "specs",
            "tests_dir": d["tests_dir"] or "tests",
            "repo_url": d["repo_url"], "ref": None,
            "exclude_tests": ["tests/gates/test_spec_lint.py"] if d["spec_lint"] else [],
            "symbol_map": {},
        }
        if d["ui_map"]:
            entry["ui_map"] = d["ui_map"]
        plist.append(entry)
    cfg = {
        "$schema_note": "See references/config-schema.md in the sdd-spectree skill.",
        "generator_version": GENERATOR_VERSION,
        "app_name": app_name, "title": title, "design": design,
        "output": "dist/sdd-explorer.html", "palette": palette, "colors": {},
        "tile_fields": fields or list(ALL_TILE_FIELDS), "rollup": "worst",
        "group_folders": True, "include_tests_in_components": True,
        "auto_cross_links": True, "cross_links": [], "projects": plist,
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, indent=2)
        fh.write("\n")
    return cfg


def verify(model: Dict[str, Any], cfg: Dict[str, Any], cfg_dir: str) -> List[str]:
    """Compare spec and requirement counts with the project's own spec_lint.py."""
    problems = []
    for pcfg in cfg["projects"]:
        root = os.path.realpath(os.path.join(cfg_dir, pcfg["path"]))
        rules = Rules(root, pcfg.get("sdd_dir", "SDD"), {})
        mine = next(p for p in model["projects"] if p["key"] == pcfg["key"])
        if not rules.lint or not hasattr(rules.lint, "collect_requirements"):
            print(f"  {pcfg['key']}: no spec_lint.py; skipped ({mine['spec_count']} specs, {mine['req_count']} reqs)")
            continue
        f = rules.lint.Findings()
        specs_dir = os.path.join(root, pcfg.get("specs_dir", os.path.join(pcfg.get("sdd_dir", "SDD"), "specs")))
        rules.lint.collect_requirements(specs_dir, root, f)
        ok = (f.checked_specs == mine["spec_count"] and f.checked_reqs == mine["req_count"])
        print(f"  {pcfg['key']}: spec_lint {f.checked_specs} specs / {f.checked_reqs} reqs; "
              f"spectree {mine['spec_count']} / {mine['req_count']} -> {'OK' if ok else 'MISMATCH'}")
        if not ok:
            problems.append(pcfg["key"])
    return problems


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser(description="Render SDD spec trees into one HTML page.")
    ap.add_argument("--config", "-c", help=f"config file (default: ./{CONFIG_NAME})")
    ap.add_argument("--out", "-o", help="output HTML (build) or config path (--init)")
    ap.add_argument("--template", default=None, help="page template (default: template.html beside this script)")
    ap.add_argument("--json", help="also write the data model as JSON to this path")
    ap.add_argument("--check", action="store_true", help="exit 1 if Source paths do not resolve")
    ap.add_argument("--verify", action="store_true", help="compare counts with each project's spec_lint.py")
    ap.add_argument("--detect", metavar="PATH", help="print the detected SDD layout of a repo as JSON")
    ap.add_argument("--init", action="store_true", help="write a starter config (with --project)")
    ap.add_argument("--project", action="append", default=[], help="key=path (with --init)")
    ap.add_argument("--app-name", default="", help="application name; title becomes '<name> - SDD Spec tree'")
    ap.add_argument("--title", default="", help="full page title (overrides --app-name)")
    ap.add_argument("--design", default="glass", choices=DESIGNS, help="default page design")
    ap.add_argument("--palette", default="traffic", choices=sorted(PALETTES))
    ap.add_argument("--fields", default="", help="comma list of tile fields (with --init)")
    ap.add_argument("--version", action="store_true")
    args = ap.parse_args(argv)

    if args.version:
        print(GENERATOR_VERSION)
        return 0
    if args.detect:
        print(json.dumps(detect(args.detect), indent=2))
        return 0
    if args.init:
        if not args.project:
            ap.error("--init needs at least one --project key=path")
        out = args.out or CONFIG_NAME
        fields = [f.strip() for f in args.fields.split(",") if f.strip()] or None
        init_config(args.project, out, args.title, args.palette, fields, args.app_name, args.design)
        print(f"spectree: wrote {out}")
        return 0

    cfg_path = os.path.abspath(args.config or CONFIG_NAME)
    if not os.path.isfile(cfg_path):
        ap.error(f"config not found: {cfg_path} (create one with --init)")
    cfg_dir = os.path.dirname(cfg_path)
    cfg = load_config(cfg_path)
    template = args.template or cfg.get("template") or DEFAULT_TEMPLATE
    if not os.path.isabs(template):
        cand = os.path.join(cfg_dir, template)
        template = cand if os.path.isfile(cand) else os.path.join(HERE, template)
    model = build_model(cfg, cfg_dir)

    out = os.path.abspath(args.out) if args.out else os.path.join(cfg_dir, cfg.get("output") or "dist/sdd-explorer.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    page = render(model, template)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(page)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(model, fh, indent=1, ensure_ascii=False)

    rc = 0
    for p in model["projects"]:
        ev = p["evidence"]
        pct = round(100 * ev["tested"] / ev["implemented"]) if ev["implemented"] else 0
        print(f"spectree: {p['key']}: {p['spec_count']} specs, {p['req_count']} requirements "
              f"({', '.join(f'{k} {v}' for k, v in p['counts'].items() if v)}); "
              f"{p['components']} code components; {pct}% of Implemented cited by tests; "
              f"rules from {p['rules']}; {p['branch'] or '?'}@{p['sha'] or '?'}"
              f"{' (uncommitted changes)' if p['dirty'] else ''}")
        for w in p["warnings"]:
            warn(f"{p['key']}: {w}")
        if p["unresolved"]:
            top = ", ".join(f"{w} x{n}" for w, n in p["unresolved"][:8])
            print(f"spectree: {p['key']}: {len(p['unresolved'])} unresolved Source path(s): {top}")
            if args.check:
                rc = 1
    print(f"spectree: {len(model['cross'])} cross-project link(s); wrote {out} ({len(page) // 1024} KB)")
    if args.verify:
        print("spectree: verify against spec_lint.py")
        if verify(model, cfg, cfg_dir):
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
