"""Tests for the Claude Code hooks in .claude/hooks (DEVA-GUARD-004).

Run: py -I -m unittest discover -s tests/hooks -v      (also: npm run test:hooks)

Each test feeds a hook the JSON event Claude Code would send on stdin and checks the decision it prints.
A temporary fixture project (spec/specs/*/tasks.md, gap register, spec lint) stands in for the repo, so the
tests never depend on the real task statuses.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HOOKS = os.path.join(ROOT, ".claude", "hooks")

TASKS_IDLE = """# Tasks — Demo
**Summary:** 1 tasks — ✅ 0 · 🔄 0 · ⬜ 1 · ⛔ 0
- [ ] **DEMO-T01** Do a thing.
  - Status: ⬜ Not started · Covers: —
"""
TASKS_ACTIVE = TASKS_IDLE.replace("⬜ Not started", "🔄 In progress").replace("🔄 0 · ⬜ 1", "🔄 1 · ⬜ 0")
GAPS = """# Gap register
## Open
| Requirement | Sev | Title | Spec | Fix tasks | State |
|---|---|---|---|---|---|
| UCF-EDIT-002 | High | Save use case edits | x | UCF-T07 | Open |
| SRCH-ARIA-002 | Medium | Active option | x | SRCH-T06 | Open |
## Closed
| SEC-EXPO-001 | High | Bind to localhost | x | SEC-T01 | Closed |
"""


def run_hook(name: str, event, project: str):
    data = event if isinstance(event, (bytes, str)) else json.dumps(event)
    if isinstance(data, str):
        data = data.encode("utf-8")
    env = dict(os.environ, CLAUDE_PROJECT_DIR=project)
    p = subprocess.run([sys.executable, "-I", os.path.join(HOOKS, name)], input=data, capture_output=True,
                       env=env, timeout=120)
    out = p.stdout.decode("utf-8").strip()
    return p.returncode, (json.loads(out) if out else None), p.stderr.decode("utf-8")


def decision(out):
    return (out or {}).get("hookSpecificOutput", {}).get("permissionDecision")


class FixtureProject(unittest.TestCase):
    def setUp(self):
        self.project = tempfile.mkdtemp(prefix="hooks-")
        os.makedirs(os.path.join(self.project, "spec", "specs", "001-demo"))
        os.makedirs(os.path.join(self.project, "spec", "gates"))
        self.write("spec/gates/gap-register.md", GAPS)
        self.set_tasks(TASKS_IDLE)

    def tearDown(self):
        shutil.rmtree(self.project, ignore_errors=True)

    def write(self, rel: str, text: str):
        with open(os.path.join(self.project, rel), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)

    def set_tasks(self, text: str):
        self.write("spec/specs/001-demo/tasks.md", text)

    def edit(self, path: str, tool: str = "Edit"):
        return {"hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": {"file_path": path}}


class SpecGuardTest(FixtureProject):
    def test_DEVA_GUARD_001_blocks_code_edit_without_task_in_progress(self):
        for path in ("src/lib/search.ts", "server/workbook.ts", "scripts/x.py", os.path.join(self.project, "src", "a.tsx")):
            code, out, _ = run_hook("spec_guard.py", self.edit(path), self.project)
            self.assertEqual(code, 0)
            self.assertEqual(decision(out), "deny", path)
            self.assertIn("DEVA-GUARD-001", out["hookSpecificOutput"]["permissionDecisionReason"])

    def test_DEVA_GUARD_001_allows_code_edit_while_a_task_is_in_progress(self):
        self.set_tasks(TASKS_ACTIVE)
        code, out, _ = run_hook("spec_guard.py", self.edit("src/lib/search.ts", "Write"), self.project)
        self.assertEqual((code, out), (0, None))

    def test_DEVA_GUARD_001_allows_spec_docs_and_outside_paths(self):
        for path in ("spec/specs/001-demo/tasks.md", "README.md", "l2-competency/README.md", "C:/elsewhere/x.ts"):
            code, out, _ = run_hook("spec_guard.py", self.edit(path), self.project)
            self.assertIsNone(decision(out), path)

    def test_DEVA_GUARD_004_spec_guard_fails_open(self):
        code, out, err = run_hook("spec_guard.py", "{not json", self.project)
        self.assertEqual((code, out), (0, None))
        self.assertIn("edit allowed", err)


class DataGuardTest(FixtureProject):
    def check(self, tool, tool_input):
        _, out, _ = run_hook("data_guard.py", {"tool_name": tool, "tool_input": tool_input}, self.project)
        return decision(out)

    def test_DEVA_GUARD_002_blocks_secret_files(self):
        self.assertEqual(self.check("Read", {"file_path": ".env"}), "deny")
        self.assertEqual(self.check("Read", {"file_path": "C:/x/project/.env.local"}), "deny")
        self.assertEqual(self.check("Edit", {"file_path": "/home/u/.claude/.credentials.json"}), "deny")
        self.assertEqual(self.check("Glob", {"pattern": "**/.env"}), "deny")
        self.assertEqual(self.check("Bash", {"command": "cat .env"}), "deny")
        self.assertEqual(self.check("PowerShell", {"command": "Get-Content .env.production"}), "deny")

    def test_DEVA_GUARD_002_allows_env_example_and_code_mentioning_env(self):
        self.assertIsNone(self.check("Read", {"file_path": ".env.example"}))
        self.assertIsNone(self.check("Bash", {"command": "cat .env.example"}))
        self.assertIsNone(self.check("Bash", {"command": "grep -rn process.env src"}))
        self.assertIsNone(self.check("Read", {"file_path": ".gitignore"}))

    def test_DEVA_GUARD_002_blocks_workbook_writes_but_allows_reads_and_regeneration(self):
        self.assertEqual(self.check("Write", {"file_path": "../data/code-app-data.xlsx"}), "deny")
        self.assertEqual(self.check("Bash", {"command": "rm ../data/code-app-data.xlsx"}), "deny")
        self.assertEqual(self.check("Bash", {"command": "echo x > ../data/a.xlsx"}), "deny")
        self.assertEqual(self.check("PowerShell", {"command": "Remove-Item ..\\data\\a.xlsx"}), "deny")
        self.assertIsNone(self.check("Read", {"file_path": "../data/code-app-data.xlsx"}))
        self.assertIsNone(self.check("Bash", {"command": "py -I scripts/generate_demo_workbook.py ../data/x.xlsx 2>&1"}))
        self.assertIsNone(self.check("Bash", {"command": "ls ../data/*.xlsx 2>/dev/null"}))

    def test_DEVA_GUARD_002_judges_each_shell_command_separately(self):
        mixed = ('cat > "$S/msg.txt" <<\'EOF\'\nmessage\nEOF\n'
                 'git diff --name-only | py -I -c "print([f for f in x if f.endswith(\'.xlsx\')])"')
        self.assertIsNone(self.check("Bash", {"command": mixed}))
        self.assertEqual(self.check("Bash", {"command": "ls; cp a.xlsx ../data/code-app-data.xlsx"}), "deny")
        self.assertEqual(self.check("Bash", {"command": "echo hi && cat x > ../data/b.xlsx"}), "deny")

    def test_DEVA_GUARD_004_data_guard_fails_closed(self):
        _, out, _ = run_hook("data_guard.py", "{not json", self.project)
        self.assertEqual(decision(out), "deny")


class PostEditCheckTest(FixtureProject):
    def test_DEVA_GATE_001_feeds_back_spec_lint_errors(self):
        os.makedirs(os.path.join(self.project, "spec", "scripts"))
        shutil.copy(os.path.join(ROOT, "spec", "scripts", "spec_lint.py"), os.path.join(self.project, "spec", "scripts"))
        self.set_tasks(TASKS_IDLE.replace("Covers: —", "Covers: DEMO-NOPE-001"))
        event = {"tool_name": "Edit", "tool_input": {"file_path": "spec/specs/001-demo/tasks.md"}}
        code, out, _ = run_hook("post_edit_check.py", event, self.project)
        self.assertEqual(code, 0)
        self.assertEqual(out["decision"], "block")
        self.assertIn("DEMO-NOPE-001", out["reason"])

    def test_DEVA_GATE_001_ignores_files_it_does_not_check(self):
        code, out, _ = run_hook("post_edit_check.py", {"tool_name": "Edit", "tool_input": {"file_path": "README.md"}},
                                self.project)
        self.assertEqual((code, out), (0, None))


class StopAndContextTest(FixtureProject):
    def test_DEVA_GATE_002_never_blocks_twice(self):
        code, out, _ = run_hook("gates_on_stop.py", {"stop_hook_active": True}, self.project)
        self.assertEqual((code, out), (0, None))

    def test_DEVA_GATE_002_reads_changed_paths_without_losing_characters(self):
        sys.path.insert(0, HOOKS)
        import gates_on_stop
        text = " M spec/specs/026-dev-agents/tasks.md\n?? .claude/hooks/x.py\nR  old.ts -> src/new.ts\n"
        self.assertEqual(gates_on_stop.parse_porcelain(text),
                         ["spec/specs/026-dev-agents/tasks.md", ".claude/hooks/x.py", "src/new.ts"])

    def test_DEVA_GATE_002_runs_only_tests_related_to_changed_files(self):
        sys.path.insert(0, HOOKS)
        import gates_on_stop
        os.makedirs(os.path.join(self.project, "src"), exist_ok=True)
        with open(os.path.join(self.project, "src", "a.ts"), "w", encoding="utf-8") as fh:
            fh.write("export {};\n")
        args = gates_on_stop.related_test_args(self.project, ["src/a.ts", "src/deleted.ts", "spec/x.md"])
        self.assertEqual(args, ["related", "src/a.ts", "--run", "--reporter=dot", "--passWithNoTests"])
        self.assertIsNone(gates_on_stop.related_test_args(self.project, ["src/deleted.ts", "spec/x.md"]))

    def test_DEVA_GATE_002_runs_tools_from_an_upper_case_drive(self):
        sys.path.insert(0, HOOKS)
        import _common
        old = os.environ.get("CLAUDE_PROJECT_DIR")
        try:
            os.environ["CLAUDE_PROJECT_DIR"] = self.project[0].lower() + self.project[1:]
            root = _common.project_root()
            self.assertTrue(root[1] != ":" or root[0].isupper(), root)
        finally:
            if old is None:
                os.environ.pop("CLAUDE_PROJECT_DIR", None)
            else:
                os.environ["CLAUDE_PROJECT_DIR"] = old

    def test_DEVA_GATE_002_passes_when_nothing_changed(self):
        code, out, _ = run_hook("gates_on_stop.py", {"stop_hook_active": False}, self.project)  # not a git repo
        self.assertEqual((code, out), (0, None))

    def test_DEVA_CTX_001_reports_task_in_progress_and_open_high_gaps(self):
        self.set_tasks(TASKS_ACTIVE)
        _, out, _ = run_hook("session_context.py", {"hook_event_name": "SessionStart"}, self.project)
        text = out["hookSpecificOutput"]["additionalContext"]
        self.assertIn("DEMO-T01", text)
        self.assertIn("Open High gaps: 1 (UCF-EDIT-002)", text)

    def test_DEVA_CTX_001_says_edits_are_blocked_when_idle(self):
        _, out, _ = run_hook("session_context.py", {}, self.project)
        self.assertIn("No task is 🔄 In progress", out["hookSpecificOutput"]["additionalContext"])


if __name__ == "__main__":
    unittest.main()
