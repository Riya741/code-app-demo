# Traceability

## 1. Spec → source files

| Spec | Prefix | Implemented in |
|---|---|---|
| customer-search | SRCH | `src/lib/search.ts`, `src/components/customers/SearchBox.tsx`, `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts` |
| workspace-layout | LAY | `src/App.tsx`, `src/pages/Customers.tsx`, `src/components/customers/TopBar.tsx` (summary button slot), `src/components/customers/Panel.tsx`, `src/components/customers/SummaryDialog.tsx` (LAY-T11, LAY-T12), `src/hooks/useMediaQuery.ts`, `src/components/ui/dialog.tsx` and `alert-dialog.tsx` (reused) |
| executive-summary | SUM | `src/components/customers/CustomerDetails.tsx`, `src/components/customers/SummaryDialog.tsx` (SUM-VIEW-006), `src/lib/wordDoc.ts` |
| use-cases-panel | UCP | `src/components/customers/ParentActivity.tsx` (`UseCasesPanel`), `src/components/customers/ConfirmDelete.tsx` |
| use-case-form | UCF | `src/components/customers/UseCaseForm.tsx` |
| use-case-bulk | UCB | `src/components/customers/UseCaseBulkForm.tsx` |
| events-panel | EVP | `src/components/customers/ParentActivity.tsx` (`EventsPanel`) |
| event-form | EVF | `src/components/customers/EventForm.tsx` |
| data-grid | GRID | `src/components/customers/DataGrid.tsx` |
| export | EXP | `src/lib/csv.ts`, `src/lib/wordDoc.ts`, `src/components/customers/ExportButton.tsx` |
| rich-text | RTX | `src/lib/html.ts`, `src/components/customers/RichTextEditor.tsx`, `src/components/customers/RichTextField.tsx`, `src/index.css` |
| data-model | DATA | `scripts/build_workbook.py`, `server/workbook.ts`, `../data/code-app-data.xlsx` |
| workbook-storage | STO | `server/workbook.ts` (`Store`, `norm`, `clean`, `exclusive`) |
| workbook-api | API | `server/workbook.ts` (`handle`, queries, `saveUseCase`, `saveEvent`, `softDelete`, `relink`), `vite.config.ts` |
| client-data-layer | CDL | `src/lib/workbookApi.ts`, `src/lib/lookups.ts`, `src/lib/parentData.ts`, `src/lib/types.ts`, `src/hooks/*` |
| data-pipeline | PIPE | `scripts/build_workbook.py`, `scripts/apply_use_case_notes.py` |
| design-system | DS | `src/index.css`, `tailwind.config.ts`, `components.json`, `src/components/customers/{Panel,Combobox,FormBits,ConfirmDelete,ExportButton}.tsx`, `src/components/ui/*` |
| accessibility | A11Y | cross-cutting |
| security | SEC | `src/lib/html.ts`, `src/lib/csv.ts`, `vite.config.ts`, `package.json` |
| performance-reliability | PERF/REL/COMP/DT | cross-cutting, `package.json` |
| quality | QA | `eslint.config.js`, `tsconfig*.json`, `package.json` (scripts) |
| ai-account-brief | AIB | `server/ai/contracts.ts`, `server/ai/steps/retriever.ts`, `server/ai/tools.ts` (redaction, field builders) · planned: `server/ai/steps/{analyst,writer,guard}.ts`, `server/ai/routes.ts`, `src/lib/aiBrief.ts`, `src/hooks/useAiBrief.ts` (incl. `useAutoBrief`, called from `Customers.tsx`), `CustomerDetails.tsx` (summary dialog content), `AiDraftBanner.tsx` · agents: `spec/agents/{analyst,writer}.md` · contracts: `spec/contracts/*.v1.schema.json` |
| ai-evaluation | EVAL | planned: `evals/**` (deterministic graders; eval-only judge AGENT-EVAL-JUDGE since CR-20261121-2) |
| agent-ops | AOPS | `server/ai/{config,client,orchestrator,trace,tools}.ts`, `server/ai/contracts.ts` (hand-off validation) · planned: `server/ai/resilience.ts`, `src/pages/AiRuns.tsx`, `docs/ai-runbook.md`; gateway route in `server/ai/{config,client,trace}.ts` (AOPS-T12, CR-20261123-1) · code steps, no agent spec (CR-20261121-1) |
| mcp-tooling | MCP | planned: `mcp/workbook-mcp/**`, `.mcp.json` |
| dev-agents | DEVA | `spec/scripts/spec_lint.py` (checks 10–13, retired agents and tasks), `spec/templates/{agent,handoff}.md`, `spec/agents/` (Analyst, Writer, Spec author; retired roster), `spec/contracts/`, `spec/handoffs/`, `.claude/agents/spec-author.md`, `.claude/hooks/*.py`, `.claude/skills/*/SKILL.md` |

## 2. Source file → specs (reverse lookup)

| File | Specs |
|---|---|
| `server/workbook.ts` | workbook-storage, workbook-api, data-model, agent-ops (read model for `server/ai/tools.ts`) |
| `src/pages/Customers.tsx` | workspace-layout, customer-search, executive-summary (selected-row re-pick; summary dialog from LAY-T11/SUM-T13) |
| `src/components/customers/ParentActivity.tsx` | use-cases-panel, events-panel, design-system |
| `src/components/customers/UseCaseForm.tsx` | use-case-form, use-case-bulk (helpers) |
| `src/components/customers/CustomerDetails.tsx` | executive-summary, rich-text |
| `src/components/customers/SummaryDialog.tsx` | workspace-layout (LAY-DLG-001..014), executive-summary (SUM-VIEW-006) |
| `src/lib/html.ts` | rich-text, security, export |
| `src/lib/csv.ts` | export, security, data-grid |
| `src/lib/search.ts` | customer-search |
| `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json` | data-pipeline (PIPE-GEN-001..008), data-model (DATA-QUAL-001, -002, -004) |
| `tests/unit/search.test.ts` | customer-search (SRCH-RANK-001..004) |
| `tests/component/*.test.tsx` (Testing Library) | design-system (DS-COMP-003), use-cases-panel (UCP-DEL-002), workspace-layout (LAY-SHELL-001, LAY-PANEL-004, LAY-PANEL-007, LAY-PANEL-008, LAY-DLG-001..014 in `Customers.test.tsx`, `SummaryDialog.test.tsx`, `TopBar.test.tsx`) |
| `tests/integration/harness.ts`, `tests/integration/*.test.ts` | quality (QA-TEST-003), workbook-api (API-GEN-001..004, API-READ-004, API-WRITE-001, API-WRITE-007, API-DEL-001, API-DEL-002, API-SUMM-001, API-SUMM-002) |
| `tests/component/UseCaseForm.test.tsx`, `tests/integration/use-case-edit.test.ts` | use-case-form (UCF-EDIT-002, UCF-EDIT-004, UCF-ADD-002, UCF-ADD-004; UCF-EDIT-007 evidence under UCF-EDIT-002 titles until UCF-T11) |
| `tests/component/EventForm.test.tsx`, `tests/integration/event-edit.test.ts` | event-form (EVF-EDIT-002, EVF-ADD-003; EVF-EDIT-004 evidence under an EVF-EDIT-002 title until EVF-T10) |
| `tests/integration/summary.test.ts` | workbook-api (API-SUMM-001, API-SUMM-002) |
| `tests/component/CustomerDetails.test.tsx`, `tests/unit/fmtUtc.test.ts` | executive-summary (SUM-EDIT-001, SUM-EDIT-004..006, SUM-VIEW-004; SUM-VIEW-001, SUM-VIEW-006, and LAY-DLG-007..009 through `onStateChange` / `onSaved`) |
| `src/lib/customerSource.ts` (`saveSummary`), `src/hooks/useCustomers.ts` (`useSaveSummary`) | executive-summary (SUM-EDIT-001), client-data-layer |
| `tests/hooks/test_hooks.py` | dev-agents (DEVA-GUARD-001..004, DEVA-GATE-001, DEVA-GATE-002 incl. related tests only, DEVA-CTX-001) |
| `tests/unit/csv.test.ts` | export (EXP-CSV-001..003, EXP-CSV-005, EXP-NAME-001, EXP-NAME-002) |
| `vitest.config.ts` | quality |
| `src/lib/lookups.ts` | client-data-layer, use-case-form, use-case-bulk, event-form, data-model |
| `vite.config.ts` | workbook-api, security, tech steering |
| `spec/scripts/spec_lint.py` | quality (G1), dev-agents (DEVA-SPEC-001, DEVA-SPEC-002, DEVA-SPEC-004, DEVA-SPEC-005, DEVA-HAND-002..004) |
| `server/ai/tools.ts` | agent-ops (runtime tools), ai-account-brief (redaction and fact builders for the Retriever), mcp-tooling (shared by the MCP server) |
| `server/ai/contracts.ts` | ai-account-brief (contracts), agent-ops (hand-off validation) |
| `server/ai/config.ts`, `server/ai/client.ts`, `server/ai/orchestrator.ts`, `server/ai/trace.ts` | agent-ops (AOPS-ORCH-006 four-step pipeline, AOPS-FAIL-008, AOPS-OBS-007) |
| `tests/integration/orchestrator.test.ts`, `tests/unit/ai-config.test.ts`, `tests/unit/ai-trace.test.ts`, `tests/unit/ai-client.test.ts`, `tests/integration/tools.test.ts` | agent-ops (AOPS-ORCH-002..004, AOPS-ORCH-006, AOPS-FAIL-007, AOPS-FAIL-008, AOPS-OBS-002, AOPS-OBS-007) |
| `tests/unit/contracts.test.ts` | ai-account-brief (contracts), agent-ops (AOPS-ORCH-002), dev-agents (DEVA-HAND-004) |
| `server/ai/config.ts`, `server/ai/client.ts`, `server/ai/trace.ts` (gateway route, planned) and `tests/integration/gateway.live.test.ts` (planned) | agent-ops (AOPS-ROUTE-001..008), security (SEC-SUPPLY-005); AOPS-T12, CR-20261123-1 |
| `.claude/hooks/gates_on_stop.py` | dev-agents (DEVA-GATE-002: related tests only, CR-20261121-1) |
| `server/ai/steps/retriever.ts` | ai-account-brief (retriever code step, `code:retriever`) |

## 3. Shared tasks (one piece of work, several specs)
Do these once and mark every linked task ✅ together.

| Work | Tasks |
|---|---|
| Date display on stored calendar day (`src/lib/dates.ts`) | UCP-T08, EVP-T07, PERF-T03 |
| Workbook backups | STO-T06, PERF-T04 |
| Summary endpoint | API-T09, SUM-T07 (both ✅ 2026-11-17) |
| Localhost binding | SEC-T01, API-T10 |
| Keyboard row expansion | GRID-T06, A11Y-T03 |
| Search `aria-activedescendant` | SRCH-T06, A11Y-T02 |
| Shared duplicate check | UCF-T09, UCB-T10 |
| XSS regression tests | RTX-T07, SEC-T05 |
| Remove `detectKey` | DATA-T04 → CDL-T06 |
| Shared read-only tools for runtime agents and MCP | AOPS-T02 → MCP-T02 |
| Lint check for a reviewed hand-off before ✅ | DEVA-T10 (uses DEVA-HAND-003) |
| Summary dialog (CR-20261120-2, replaces the band of CR-20261120-1) | LAY-T09, LAY-T11, LAY-T12, SUM-T13, LAY-T08 (one change; LAY-T10 is spec-only and closes with the CR's approval) |

## 4. Dependency chain for the main open work
```
SEC-T02 (git) ──► QA-T07 (CI)
QA-T01 ──► QA-T02 ──► component tests (SRCH-T08, UCP-T09, UCF-T10, UCB-T11, EVP-T09, EVF-T09, GRID-T07)
QA-T01 + DATA-T09 ──► QA-T03 ──► API-T11, STO-T07, QA-T04
API-T09 ──► SUM-T08 ──► SUM-T09 ──► SUM-T10
UCF-T07 ──► UCF-T08
DATA-T04 ──► CDL-T06
SEC-T03 ──► SEC-T04
A11Y-T04 ──► A11Y-T05
SUM-T09 (✅) ──► AIB-T07 (an AI draft must be savable)
LAY-T09 + LAY-T11 + LAY-T12 + SUM-T13 (summary dialog) ──► AIB-T10, AIB-T07 ──► AIB-T09
AOPS-T01 ──► AIB-T03 ──► AOPS-T04 ;  AOPS-T01 ──► AIB-T05 ──► AIB-T06 ──► AIB-T10 ──► AIB-T07
AOPS-T01 ──► AOPS-T12 (gateway mode) ──► AIB-T03 live check ;  AOPS-T12 ──► EVAL-T04, AOPS-T10 (gateway route, bulk opt-in)
AIB-T03 ──► EVAL-T04 ──► EVAL-T06 ──► EVAL-T07 (ADR-0007)
                 └──► EVAL-T11 (judge) ──► EVAL-T12 (κ calibration) ──► EVAL-T06 report
AOPS-T02 ──► MCP-T02
QA-T07 ──► EVAL-T09 (G7 in CI)
DEVA-T05 + DEVA-T09 ──► DEVA-T11 (first hand-offs)
```
