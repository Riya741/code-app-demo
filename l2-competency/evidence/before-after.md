# Before and after

| | Before | After |
|---|---|---|
| **Date** | 2026-11-16 | 2026-11-24 |
| **Commit** | `5a63140` (first project commit, SEC-T02) | `e3793a4` on `main` |
| **Source** | `spec/README.md` dashboard and `spec/gates/gap-register.md` at that commit | Same files today, recounted by `spec/scripts/dashboard.py` |

## Spec set
| Measure | Before | After | Change |
|---|---|---|---|
| Specs | 21 | 26 | +5 (022 AI brief, 023 evaluation, 024 agent ops, 025 MCP, 026 dev agents) |
| Requirements | 363 | 529 | +166 |
| ✅ Implemented | 306 | 450 | +144 |
| ⚠️ Partial | 21 | 25 | +4 |
| ❌ Gap | 18 | 8 | −10 |
| 📝 Planned | 18 | 46 | +28 (mostly AI hardening tasks deferred by CR-20261123-2) |
| Tasks | 171 | 244 | +73 |
| Tasks done | 96 | 174 | +78 |
| Change requests | 0 | 8 | CR-20261117-1 (AI agents), CR-20261120-1 and -2, CR-20261121-1 and -2, CR-20261123-1 and -2, CR-20261124-1 |
| ADRs | 6 | 9 | +0007 model and prompt choice (Proposed), 0008 orchestration pattern, 0009 gateway route |
| Agent specs / contracts | 0 / 0 | 4 / 6 | Analyst, Writer, Spec author, Eval judge (9 retired by CR-20261121-1); 6 JSON Schema hand-off contracts |
| Task hand-off files | 0 | 45 | `spec/handoffs/<TASK>.md`, each with gate results and a review verdict |

## Gaps
| Measure | Before | After |
|---|---|---|
| **Open High gaps** | **7** | **0** |
| Open gap rows (all severities) | 38 | 24 (0 High, 8 Medium, 16 Low) |
| Closed gap rows | 0 | 23 |

The 7 High gaps and the tasks that closed them:

| High gap | What was wrong | Closed by | Date |
|---|---|---|---|
| SEC-EXPO-001 | Dev server reachable from the network | SEC-T01 | 2026-11-16 |
| UCF-EDIT-002 | Use case edits were not saved | UCF-T07 (reviewer caught a data-loss bug first) | 2026-11-18 |
| UCF-EDIT-004 | Edits erased target fields | UCF-T08 | 2026-11-18 |
| EVF-EDIT-002 | Event edits were not saved | EVF-T06 | 2026-11-18 |
| SUM-EDIT-001 | Executive summary edits were not saved | API-T09, SUM-T07..T11 | 2026-11-18 |
| API-WRITE-008 | Writes accepted unknown references and disallowed values | API-T08 | 2026-11-24 |
| DT-TIME-003 | Dates shown one day early west of UTC | UCP-T08, PERF-T03 (with EVP-T07) | 2026-11-24 |

## Tests and gates
| Measure | Before | After |
|---|---|---|
| Automated tests | 0 | 474 Vitest tests in 40 files (unit, component, integration, MCP), plus 1 pinned known gap (`it.fails`), 1 opt-in live check, and 18 hook tests |
| Test titles naming a requirement ID | — | All (enforced by spec lint check 9) |
| G1 spec lint | 9 checks | 13 checks (agent specs, prompt headers, hand-offs, contracts added) |
| G3 lint + typecheck | lint only | `npm run lint` (0 errors) + `npm run typecheck` (app and server, strict for server, evals and MCP) |
| G4 tests | none | `npm test` |
| G5 manual UI | informal | Recorded per task, by the owner, in light and dark themes, at ≥ 1024px and < 1024px |
| G6 CI | none | GitHub Actions: spec lint, lint, typecheck and tests on every push and PR (QA-T07) |
| G7 eval | none | `npm run eval:smoke` against `evals/thresholds.json`; passed 2026-11-24 |

## AI capability
| Before | After |
|---|---|
| No LLM feature, agent, eval or MCP server | **AI Account Brief:** retrieve → analyse → write → guard, cited and sanitised, drafted in the summary dialog and saved only by a person. **Eval harness:** 32 cases, 6 deterministic graders, G7. **`workbook-mcp`:** an MCP server with 10 read tools (plus 1 opt-in write tool), 2 resources, a prompt, and security controls with tests |
