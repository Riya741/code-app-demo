"""Stop hook: before an agent stops, run the gates that its changes affect; if one fails, tell it to continue.

DEVA-GATE-002. Uses `git status` to find changed files. G1 (spec lint) runs on any change under spec/, src/, tests/,
server/ or .claude/agents/; typecheck and the unit tests run when TypeScript changed. If the agent is already
continuing because of this hook (`stop_hook_active`), it is allowed to stop, so the hook can never loop.
Fails open.
"""
from __future__ import annotations

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

LINT_PREFIXES = ("spec/", "src/", "tests/", "server/", ".claude/agents/", "evals/")
TS_SUFFIXES = (".ts", ".tsx")


def run(argv, root: str, timeout: int):
    p = subprocess.run(argv, cwd=root, capture_output=True, timeout=timeout)
    return p.returncode, (p.stdout + p.stderr).decode("utf-8", errors="replace").strip()


def parse_porcelain(text: str):
    """Paths from `git status --porcelain` lines ('XY path' or 'XY old -> new'); keeps the leading status columns."""
    files = []
    for line in text.splitlines():
        if len(line) > 3 and line[2] == " ":
            files.append(line[3:].strip().strip('"').split(" -> ")[-1].replace("\\", "/"))
    return files


def changed_files(root: str):
    p = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=root, capture_output=True,
                       timeout=30)
    if p.returncode != 0:
        return []
    return parse_porcelain(p.stdout.decode("utf-8", errors="replace"))


def gates(root: str, files):
    failures = []
    if any(f.startswith(LINT_PREFIXES) for f in files):
        code, out = run([sys.executable, "-I", "spec/scripts/spec_lint.py"], root, 120)
        if code != 0:
            errs = [l for l in out.splitlines() if l.startswith("ERROR")][:15]
            failures.append("G1 spec lint:\n" + "\n".join(errs))
    if any(f.endswith(TS_SUFFIXES) for f in files):
        tsc = os.path.join(root, "node_modules", "typescript", "bin", "tsc")
        for cfg in ("tsconfig.app.json", "tsconfig.node.json"):
            code, out = run(["node", tsc, "--noEmit", "-p", cfg], root, 300)
            if code != 0:
                failures.append(f"G3 typecheck ({cfg}):\n" + "\n".join(out.splitlines()[:15]))
        vitest = os.path.join(root, "node_modules", "vitest", "vitest.mjs")
        code, out = run(["node", vitest, "run", "--reporter=dot"], root, 300)
        if code != 0:
            tail = [l for l in out.splitlines() if l.strip()][-15:]
            failures.append("G4 tests:\n" + "\n".join(tail))
    return failures


def main() -> int:
    try:
        event = c.read_event()
        if event.get("stop_hook_active"):
            return 0
        root = c.project_root()
        files = changed_files(root)
        failures = gates(root, files) if files else []
    except Exception as exc:  # fail open
        c.warn(f"gates_on_stop: could not run gates: {exc}")
        return 0
    if failures:
        c.emit({"decision": "block",
                "reason": "Gates fail on your uncommitted changes (DEVA-GATE-002). Fix them, or say why they "
                          "cannot be fixed, before stopping:\n\n" + "\n\n".join(failures)})
    return 0


if __name__ == "__main__":
    sys.exit(main())
