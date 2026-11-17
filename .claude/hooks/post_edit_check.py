"""PostToolUse hook (Edit|Write|MultiEdit): run the matching check on the file just edited and feed failures back.

DEVA-GATE-001. Spec, contract, prompt and subagent files → spec lint (G1); `.ts/.tsx/.js` files → ESLint on that file.
Fails open: if a checker cannot run, the agent gets a warning, not a block.
"""
from __future__ import annotations

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

SPEC_PREFIXES = ("spec/", "server/ai/prompts/", ".claude/agents/", "evals/graders/judge/")
TS_SUFFIXES = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
MAX_LINES = 25


def run(argv, root: str, timeout: int):
    p = subprocess.run(argv, cwd=root, capture_output=True, timeout=timeout)
    out = (p.stdout + p.stderr).decode("utf-8", errors="replace").strip()
    return p.returncode, out


def check(rel: str, root: str):
    """Return (checker name, failure text) or None when the file passes or is not checked."""
    if rel.startswith(SPEC_PREFIXES) or rel.startswith("tests/") or rel.endswith((".test.ts", ".test.tsx")):
        code, out = run([sys.executable, "-I", "spec/scripts/spec_lint.py"], root, 60)
        if code != 0:
            errors = [l for l in out.splitlines() if l.startswith("ERROR")]
            return "spec lint (G1)", "\n".join(errors[:MAX_LINES] + [out.splitlines()[-1]])
    if rel.endswith(TS_SUFFIXES) and not rel.startswith(("node_modules/", "dist/")):
        eslint = os.path.join(root, "node_modules", "eslint", "bin", "eslint.js")
        if os.path.isfile(eslint):
            code, out = run(["node", eslint, "--format", "unix", rel], root, 90)
            if code == 1:
                return "ESLint (G3)", "\n".join(out.splitlines()[:MAX_LINES])
    return None


def main() -> int:
    try:
        root = c.project_root()
        event = c.read_event()
        rel = c.rel_path(c.tool_path(event.get("tool_input") or {}), root)
        result = check(rel, root) if rel else None
    except Exception as exc:  # fail open
        c.warn(f"post_edit_check: could not run checks: {exc}")
        return 0
    if result:
        name, text = result
        c.emit({"decision": "block",
                "reason": f"{name} fails after editing `{rel}`. Fix this before moving on:\n{text}"})
    return 0


if __name__ == "__main__":
    sys.exit(main())
