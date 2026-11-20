# Steering: Constitution ↔ Spec Mapping

This file links every article of the [constitution](../constitution.md) to the specs and requirements that put it
into practice, and shows where compliance is incomplete. Update it whenever a spec or the constitution changes.

**Legend:** ● primary (the spec exists mainly to satisfy this article) · ○ contributes · ⚠️ known gap / recorded exception

## 1. Matrix

| Spec ↓ / Article → | I Spec first | II Workbook truth | III Safe | IV Valid input | V Feedback | VI Theme/responsive | VII A11y | VIII Simple | IX Layered | X Testable | XI Perf | XII AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [customer-search](../specs/001-customer-search/) | ○ | | | ○ | ● | ○ | ⚠️ | | ○ | ○ | ● | |
| [workspace-layout](../specs/002-workspace-layout/) | ○ | ○ | | | ⚠️ | ● | ○ | ● | | ○ | | ○ |
| [executive-summary](../specs/003-executive-summary/) | ○ | ○ | ○ | | ● | ○ | ○ | | ○ | ○ | ○ | ○ |
| [use-cases-panel](../specs/004-use-cases-panel/) | ○ | ○ | ○ | | ● | ○ | ○ | | ● | ○ | | |
| [use-case-form](../specs/005-use-case-form/) | ○ | ○ | | ● | ● | ○ | ○ | | ○ | ○ | | |
| [use-case-bulk](../specs/006-use-case-bulk/) | ○ | ○ | | ● | ● | ○ | ○ | | ○ | ○ | ○ | |
| [events-panel](../specs/007-events-panel/) | ○ | ○ | ○ | | ● | ○ | ○ | ⚠️ | ● | ○ | | |
| [event-form](../specs/008-event-form/) | ○ | ○ | | ⚠️ | ● | ○ | ○ | | ○ | ○ | | |
| [data-grid](../specs/009-data-grid/) | ○ | | | | ● | ● | ⚠️ | ● | | ○ | | |
| [export](../specs/010-export/) | ○ | | ● | | ○ | | | ● | | ○ | | |
| [rich-text](../specs/011-rich-text/) | ○ | | ● | | | ● | ○ | | | ○ | ● | |
| [data-model](../specs/012-data-model/) | ○ | ● | | ● ⚠️ | | | | | | ○ | | |
| [workbook-storage](../specs/013-workbook-storage/) | ○ | ● ⚠️ | | | ○ | | | ● | | ○ | ● | |
| [workbook-api](../specs/014-workbook-api/) | ○ | ● | ⚠️ | ● ⚠️ | ○ | | | | ● | ○ | | |
| [client-data-layer](../specs/015-client-data-layer/) | ○ | | | | ● | | | | ● | ○ | ● | |
| [data-pipeline](../specs/016-data-pipeline/) | ○ | ● | | | | | | | | ● | | |
| [design-system](../specs/017-design-system/) | ○ | | | | ● | ● | ○ | ⚠️ | | | | |
| [accessibility](../specs/018-accessibility/) | ○ | | | | | | ● ⚠️ | | | ○ | | |
| [security](../specs/019-security/) | ○ | | ● ⚠️ | | | | | ⚠️ | | ○ | | ○ |
| [performance-reliability](../specs/020-performance-reliability/) | ○ | ● ⚠️ | | | ○ | ○ | | | | | ● | |
| [quality](../specs/021-quality/) | ● | | | | | | | | | ● ⚠️ | | ○ |
| [ai-account-brief](../specs/022-ai-account-brief/) | ○ | ○ | ● | ○ | ● | ○ | ○ | ○ | ● | ○ | ○ | ● |
| [ai-evaluation](../specs/023-ai-evaluation/) | ○ | | ○ | | | | | ○ | | ● | | ● |
| [agent-ops](../specs/024-agent-ops/) | ○ | ○ | ○ | ○ | ● | | | ● | ○ | ● | ○ | ● |
| [mcp-tooling](../specs/025-mcp-tooling/) | ○ | ● | ● | ○ | | | | ○ | ● | ○ | | ● |
| [dev-agents](../specs/026-dev-agents/) | ● | ○ | ○ | | | | | | | ● | | ● |

## 2. Article → enforcing requirements

| Article | Enforced by (requirement IDs) | Gaps (task) |
|---|---|---|
| **I Spec first** | QA-DOD-001..005, all `requirements.md` | — |
| **II Workbook is truth** | STO-LOAD-001..006, STO-SAVE-001..010, STO-CONC-001, STO-CONC-002, API-WRITE-001..008 (API-WRITE-004 = II.4 link rows replaced on edit, v1.1.1), API-DEL-001, API-DEL-002, API-SUMM-001, API-SUMM-002, SUM-EDIT-001, UCF-EDIT-002, EVF-EDIT-002, DATA-TBL-001..005, DATA-FMT-001..004, DATA-LINK-001..005, LAY-THEME-001, LAY-BAND-003 (only UI prefs in browser), UCP-DEL-003, EVP-DEL-002 | API-SUMM-002 body check (API-T14), STO-SAVE-010 backups (STO-T06), DATA-LINK-006 (DATA-T04) |
| **III Safe by default** | RTX-SAN-001..005, EXP-CSV-003, EXP-WORD-002, SEC-SAFE-001..003, API-GEN-002, SEC-EXPO-001 | SEC-SUPPLY-004 deps (SEC-T03) |
| **IV Valid by construction** | UCF-FIELD-001..008, UCF-ADD-001, UCB-ROWS-001, UCB-SAVE-001..004, EVF-ADD-001, API-WRITE-001, API-WRITE-006, API-SUMM-002, DATA-LINK-004 | API-WRITE-008 FK validation (API-T08), API-SUMM-002 (API-T14), EVF-ADD-004 (EVF-T07), DATA-QUAL-003 (DATA-T06) |
| **V Clear feedback** | SRCH-LOAD-003, SRCH-LOAD-004, SRCH-RANK-006, UCP-DEL-001..003, UCP-CSV-001, UCP-STATE-001..003, EVP-DEL-001, EVP-DEL-002, EVP-CSV-001, EVP-STATE-001, UCF-ADD-003..005, UCB-SAVE-005..008, SUM-EDIT-004..006, SUM-WORD-003, CDL-HTTP-002..004, GRID-FILT-008, DS-MSG-001 | LAY-TOP-004 refresh (LAY-T07) |
| **VI Theme & responsive** | LAY-PANEL-001, LAY-PANEL-003..006 (LAY-PANEL-002 Deprecated), LAY-BAND-001..005, LAY-THEME-001, LAY-THEME-002, DS-TOKEN-001..003, RTX-DARK-001..005, GRID-ROW-004 | LAY-PANEL-006, LAY-BAND-001..005 planned (LAY-T09, LAY-T10) |
| **VII Accessible** | SRCH-ARIA-001, GRID-SORT-002, A11Y-NAME-001..005, A11Y-KEY-001..005, A11Y-FORM-001, A11Y-FORM-002, A11Y-SEE-001..003, LAY-BAND-006 | SRCH-ARIA-002 (SRCH-T06), GRID-ROW-006 (GRID-T06), A11Y-FORM-001, A11Y-FORM-002 (A11Y-T04/T05), A11Y-SEE-001 (A11Y-T06), LAY-BAND-006 planned (LAY-T09) |
| **VIII Simple & local-first** | ADR-0001, ADR-0002, LAY-STATE-001, GRID (one shared grid), EXP (no export library) | DS-COMP-004, DS-MOTION-003 (DS-T06..T08), SEC-SUPPLY-004 (SEC-T03), EVP-GRID-006 (EVP-T08), EXP-T05 |
| **IX Layered architecture** | CDL-HTTP-001..005, CDL-FETCH-001..004, CDL-QUERY-001..006, structure.md CONV-002/003 | — |
| **X Testable & traceable** | QA-TRACE-001, QA-TRACE-002, PIPE-BUILD-014 (logged recovery), every tasks.md | QA-TEST-001..005 (QA-T01..T05), QA-GATE-002, QA-GATE-003, UCF-EDIT-005, UCF-EDIT-006 (UCF-T11), EVF-EDIT-003 (EVF-T10): implemented, no test names them yet |
| **XI Performance budget** | PERF-SPEED-001..007, SRCH-RANK-004, CDL-QUERY-002, RTX-EDIT-001 | PERF-SPEED-005..007 thresholds monitored (PERF-T07) |
| **XII AI agents & data** | DEVA-SPEC-001..003, DEVA-HAND-002 (lint checks 10–13); all other AIB, EVAL, AOPS, MCP, DEVA requirements are 📝 Planned | XII.1/XII.2 runtime enforcement (AOPS-T01, AOPS-T02, AIB-T01), XII.3 draft-only, including the automatic draft (AIB-T07, AIB-T10), XII.4 policy (AIB-T02, MCP-T02), XII.5 citations (AIB-T03), XII.6 eval + G7 (EVAL-T08), XII.7 traces (AOPS-T01), XII.8 optional (AOPS-T01, AIB-GEN-013 in AIB-T07) |

## 3. Recorded exceptions
| Article | Spec | Reason | Exit task |
|---|---|---|---|
| VII | accessibility | Label association, error announcement, keyboard row expansion | A11Y-T02..T06 |
| X | quality | Unit tests only; component, integration and E2E tests pending | QA-T02..T04 |

## 4. Maintenance rules
1. A new spec MUST add a row to the matrix and its requirement IDs to section 2.
2. A constitution amendment MUST add/rename a column and re-check every spec's "Constitution check".
3. When an exit task is done, remove the exception row and the ⚠️ markers.

## 5. Amendment re-check (constitution v1.1.0, 2026-11-17)
Article XII was added by [CR-20261117-1](../changes/CR-20261117-1-ai-agents.md). Every spec's Constitution check was
re-read against it: Article XII applies to the new specs 022–026 and touches three existing ones, whose designs gained
an Article XII row: executive-summary (an AI draft is saved through SUM-EDIT-001), security (secrets and the AI data
policy) and quality (gate G7). The other 18 specs do not involve AI; their checks are unchanged.

## 6. Amendment re-check (constitution v1.1.1, 2026-11-20)
[CR-20261120-1](../changes/CR-20261120-1-owner-decisions-summary-band.md) reworded Article II.4 (PATCH): use cases and
events stay soft-deleted and their rows and status history are never destroyed; an edit updates the record in place
and replaces that record's own link rows. No column changes. Specs that write use cases, events or link rows were
re-read: workbook-api (API-WRITE-004 is now the rule, not an exception), use-case-form and event-form (the II.4
exception and its ⚠️ markers are removed; exit task API-T13 closes with the CR), use-case-bulk (inserts only),
use-cases-panel and events-panel (soft delete unchanged), data-model (DATA-LINK-001..005 unchanged), workbook-storage
(atomic, serialised saves unchanged) and mcp-tooling (never writes the workbook). All comply; the Article II.4
exception row was removed from section 3. The same CR moved the Executive Summary into a full-width band (002, 003)
and changed the AI Account Brief trigger (022); their Constitution checks gained VII and XII rows where needed.
