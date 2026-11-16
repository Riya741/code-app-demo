# Traceability

## 1. Spec → source files

| Spec | Prefix | Implemented in |
|---|---|---|
| customer-search | SRCH | `src/lib/search.ts`, `src/components/customers/SearchBox.tsx`, `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts` |
| workspace-layout | LAY | `src/App.tsx`, `src/pages/Customers.tsx`, `src/components/customers/TopBar.tsx`, `src/components/customers/Panel.tsx`, `src/hooks/useMediaQuery.ts` |
| executive-summary | SUM | `src/components/customers/CustomerDetails.tsx`, `src/lib/wordDoc.ts` |
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

## 2. Source file → specs (reverse lookup)

| File | Specs |
|---|---|
| `server/workbook.ts` | workbook-storage, workbook-api, data-model |
| `src/pages/Customers.tsx` | workspace-layout, customer-search, executive-summary (planned) |
| `src/components/customers/ParentActivity.tsx` | use-cases-panel, events-panel, design-system |
| `src/components/customers/UseCaseForm.tsx` | use-case-form, use-case-bulk (helpers) |
| `src/components/customers/CustomerDetails.tsx` | executive-summary, rich-text |
| `src/lib/html.ts` | rich-text, security, export |
| `src/lib/csv.ts` | export, security, data-grid |
| `src/lib/search.ts` | customer-search |
| `scripts/generate_demo_workbook.py`, `scripts/demo_catalogue.json` | data-pipeline (PIPE-GEN-001..008), data-model (DATA-QUAL-001, -002, -004) |
| `tests/unit/search.test.ts` | customer-search (SRCH-RANK-001..004) |
| `tests/unit/csv.test.ts` | export (EXP-CSV-001..003, EXP-CSV-005, EXP-NAME-001, EXP-NAME-002) |
| `vitest.config.ts` | quality |
| `src/lib/lookups.ts` | client-data-layer, use-case-form, use-case-bulk, event-form, data-model |
| `vite.config.ts` | workbook-api, security, tech steering |

## 3. Shared tasks (one piece of work, several specs)
Do these once and mark every linked task ✅ together.

| Work | Tasks |
|---|---|
| Date display on stored calendar day (`src/lib/dates.ts`) | UCP-T08, EVP-T07, PERF-T03 |
| Workbook backups | STO-T06, PERF-T04 |
| Summary endpoint | API-T09, SUM-T07 |
| Localhost binding | SEC-T01, API-T10 |
| Keyboard row expansion | GRID-T06, A11Y-T03 |
| Search `aria-activedescendant` | SRCH-T06, A11Y-T02 |
| Shared duplicate check | UCF-T09, UCB-T10 |
| XSS regression tests | RTX-T07, SEC-T05 |
| Remove `detectKey` | DATA-T04 → CDL-T06 |

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
```
