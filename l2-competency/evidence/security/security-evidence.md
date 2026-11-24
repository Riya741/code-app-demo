# Security evidence (Topic 5)

All results below were run on 2026-11-24 at `main` `e3793a4`.

## 1. Workflow hooks: 18 tests pass
The hooks in `.claude/hooks/` are registered in `.claude/settings.json` (spec 026-dev-agents).

`npm run test:hooks` reported `Ran 18 tests … OK`. The tests by hook:

| Hook | Control | Tests (titles start with the requirement ID) |
|---|---|---|
| `spec_guard.py` | No code edit unless a task is 🔄 (Article I, DEVA-GUARD-001) | blocks a code edit without a task in progress · allows one while a task is in progress · allows spec docs and outside paths · fails open on its own error (DEVA-GUARD-004) |
| `data_guard.py` | No shell command may touch `.env*` or credential files (DEVA-GUARD-002) | blocks secret files · allows `.env.example` and code that only mentions env · judges each shell command separately · fails **closed** on its own error (DEVA-GUARD-004) |
| `post_edit_check.py` | Spec lint after every edit, with errors fed back to the agent (DEVA-GATE-001) | feeds back lint errors · ignores files it does not check |
| `gates_on_stop.py` | Related tests before the agent stops (DEVA-GATE-002) | runs only the tests related to changed files · never blocks twice · passes when nothing changed · reads changed paths without losing characters · works from an upper-case drive |
| `session_context.py` | Shows the task in progress and open High gaps at session start (DEVA-CTX-001) | reports a task in progress and High gaps · says edits are blocked when idle |

**These hooks worked during real work.** In this project's sessions:
- **data guard:** blocked commands that named a secrets-file pattern, twice in the final batch: a `sed` edit and a
  repository scan. Each time the agent rewrote the command instead of working around the guard.
- **post-edit lint:** rejected a new MCP test file that wrote fixture requirement IDs as literals (MCP-T03), until
  they were built at run time.
- **spec guard:** allowed code edits only after the task was set to 🔄.

See [ai-dev-log.md](../ai-dev-log.md).

## 2. `workbook-mcp`: 59 tests pass, mapped to each control
Run with `npx vitest run tests/mcp`: 6 files, 59 tests, 0 failures. The server is specified in
[spec 025-mcp-tooling](../../../spec/specs/025-mcp-tooling/requirements.md); all 17 requirements are ✅.

| Control | Requirement | Hostile-input tests (file: title) |
|---|---|---|
| Path allow-list | MCP-SEC-001 | `guard`: "refuses '..' segments, absolute paths outside and other files next to the workbook" · "refuses a symbolic link or junction inside spec/ that points outside" (a real Windows junction) · "writes only to a new or existing file under spec/changes/". `specTools`: "refuses any other resource URI, and audits each read" (`../../.env`, `file:///etc/passwd`) |
| Read-only by default | MCP-SEC-002 | `changeRequest`: "does not list or run propose_change_request unless MCP_ALLOW_WRITE is exactly 1" (unset, `0`, `true`, `yes`, `" 1"`) · "never writes the workbook, with writes enabled or not" · "calling every tool with MCP_ALLOW_WRITE=1 leaves the workbook file unchanged" (SHA-256) |
| Validated input | MCP-SEC-003 | `guard`: "refuses an oversize string (201 characters), naming the field …" · "refuses an ID that does not match its pattern, such as a path traversal" · "refuses a page size over 50, a wrong type, a missing field and an unknown field". `hostile`: the same sweep over **every** tool and every field |
| No shell | MCP-SEC-004 | `specTools`: "starts the linter with execFile, a fixed program, a fixed argument list and no shell" · "refuses any argument, such as shell metacharacters, before anything runs" (`; rm -rf / & calc.exe`, `$(whoami)`) |
| Data minimisation | MCP-SEC-005 | `dataTools`: "redacts emails and phone numbers, and never returns emails, summaries, IDs or deleted rows" · "returns full note text only for one record asked for by ID …". Mutation-checked: removing the note cut makes it fail |
| Free text marked as data | MCP-SEC-006 | `dataTools`: "returns workbook free text only in fields named text, and every data tool says it is data" (a planted "IGNORE ALL PREVIOUS INSTRUCTIONS") |
| No secrets in config | MCP-SEC-007 | `server`: ".mcp.json holds no environment values, keys or tokens" · "takes the workbook path from WORKBOOK_PATH or the app's default, and reads no settings file" |
| Audit, no free text | MCP-AUD-001, -002 | `guard`: "appends one line per call, accepted or not …" · "fails the call closed when the audit line cannot be written" · "holds no argument value, result text or unregistered tool name" (canary values) |
| A test for every tool | MCP-TEST-001 | `hostile`: "every registered tool, including the write tool, is called by name in a test" |

### Audit-log sample
These lines were written by the MCP Inspector session. The full sample, and the Claude Code session's lines, are in
[mcp-workbook-server.md](../mcp-workbook-server.md).

```json
{"time":"2026-11-24T21:39:53.234Z","tool":"get_requirement","args_sha256":"3269da14ab3ba32c0d390598a5e24b088768572f1640973d0ff18655fb209948","duration_ms":9,"result_bytes":45,"outcome":"rejected"}
{"time":"2026-11-24T21:40:01.169Z","tool":"search_customers","args_sha256":"0b3035e19840aad9cb390ad899e7853795cab8efce7514381d4dfb24d638efc6","duration_ms":9,"result_bytes":40,"outcome":"rejected"}
{"time":"2026-11-24T21:40:24.711Z","tool":"resources/read","args_sha256":"9122e5e6529fa6a139b1e62ae9985d76ce2540d235d40b7ea3bf4d7b4762da85","duration_ms":6,"result_bytes":17,"outcome":"rejected"}
```

These are a traversal ID, a shell-metacharacter field, and a `file://` URI. All were refused, and the log holds a hash
of the arguments, never the arguments themselves.

## 3. Repository scan: no secrets, no real data
| Check | Command (run from the repo root) | Result |
|---|---|---|
| No workbook committed (SEC-SUPPLY-001) | `git ls-files` for `*.xlsx` | 0 files |
| No env files committed (SEC-SUPPLY-002) | `git ls-files` for dot-env files | 0 files |
| No keys | `git grep` for Anthropic key, AWS access key and private-key patterns (excluding `package-lock.json`) | 0 files |
| No real email addresses | `git grep` for email addresses, excluding the reserved `example.*` and `.test` domains | none (only `a@b.example`, a reserved domain) |
| Model keys only in the environment | SEC-SUPPLY-005, AOPS-ROUTE-005; 10 unit tests in `tests/unit/ai-gateway.test.ts` | ✅ keys never in config, client, traces or errors |

The workbook is fictional by design ([ADR-0006](../../../spec/adr/0006-fictional-demo-dataset.md)). Tests generate
their own 8-customer fixture.

## 4. App security already in place
These come from spec 019-security.
- **Localhost only:** the dev server and API bind to localhost (SEC-EXPO-001, closed 2026-11-16).
- **Sanitising:** HTML from data is sanitised before it is rendered or exported (Article III). The AI draft's HTML is
  built by the Guard from plain sentences and then sanitised (AIB-SAFE-002).
- **Validated writes:** writes check references and allowed values (API-WRITE-008, closed 2026-11-24). They are
  atomic and serialised, and rows are soft-deleted (Article II).

Open, not hidden:
- SEC-SUPPLY-003: `npm audit --omit=dev` has 1 high finding, zod < 4.6.6. The project's own zod 3.x
  dependency was already on `main` before the MCP SDK was added.
- SEC-SUPPLY-004: there are unused dependencies.

Both are tracked in the gap register.
