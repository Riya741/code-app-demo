# Steering: Constitution ↔ Spec Mapping

This file links every article of the [constitution](../constitution.md) to the specs and requirements that put it
into practice, and shows where compliance is incomplete. Update it whenever a spec or the constitution changes.

**Legend:** ● primary (the spec exists mainly to satisfy this article) · ○ contributes · ⚠️ known gap / recorded exception

## 1. Matrix

| Spec ↓ / Article → | I Spec first | II Workbook truth | III Safe | IV Valid input | V Feedback | VI Theme/responsive | VII A11y | VIII Simple | IX Layered | X Testable | XI Perf |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [customer-search](../specs/001-customer-search/) | ○ | | | ○ | ● | ○ | ⚠️ | | ○ | ○ | ● |
| [workspace-layout](../specs/002-workspace-layout/) | ○ | ○ | | | ⚠️ | ● | ○ | ● | | ○ | |
| [executive-summary](../specs/003-executive-summary/) | ○ | ⚠️ | ○ | | ● | ○ | ○ | | ○ | ○ | ○ |
| [use-cases-panel](../specs/004-use-cases-panel/) | ○ | ○ | ○ | | ● | ○ | ○ | | ● | ○ | |
| [use-case-form](../specs/005-use-case-form/) | ○ | ⚠️ | | ● | ● | ○ | ○ | | ○ | ○ | |
| [use-case-bulk](../specs/006-use-case-bulk/) | ○ | ○ | | ● | ● | ○ | ○ | | ○ | ○ | ○ |
| [events-panel](../specs/007-events-panel/) | ○ | ○ | ○ | | ● | ○ | ○ | ⚠️ | ● | ○ | |
| [event-form](../specs/008-event-form/) | ○ | ⚠️ | | ⚠️ | ● | ○ | ○ | | ○ | ○ | |
| [data-grid](../specs/009-data-grid/) | ○ | | | | ● | ● | ⚠️ | ● | | ○ | |
| [export](../specs/010-export/) | ○ | | ● | | ○ | | | ● | | ○ | |
| [rich-text](../specs/011-rich-text/) | ○ | | ● | | | ● | ○ | | | ○ | ● |
| [data-model](../specs/012-data-model/) | ○ | ● | | ● ⚠️ | | | | | | ○ | |
| [workbook-storage](../specs/013-workbook-storage/) | ○ | ● ⚠️ | | | ○ | | | ● | | ○ | ● |
| [workbook-api](../specs/014-workbook-api/) | ○ | ● | ⚠️ | ● ⚠️ | ○ | | | | ● | ○ | |
| [client-data-layer](../specs/015-client-data-layer/) | ○ | | | | ● | | | | ● | ○ | ● |
| [data-pipeline](../specs/016-data-pipeline/) | ○ | ● | | | | | | | | ● | |
| [design-system](../specs/017-design-system/) | ○ | | | | ● | ● | ○ | ⚠️ | | | |
| [accessibility](../specs/018-accessibility/) | ○ | | | | | | ● ⚠️ | | | ○ | |
| [security](../specs/019-security/) | ○ | | ● ⚠️ | | | | | ⚠️ | | ○ | |
| [performance-reliability](../specs/020-performance-reliability/) | ○ | ● ⚠️ | | | ○ | ○ | | | | | ● |
| [quality](../specs/021-quality/) | ● | | | | | | | | | ● ⚠️ | |

## 2. Article → enforcing requirements

| Article | Enforced by (requirement IDs) | Gaps (task) |
|---|---|---|
| **I Spec first** | QA-DOD-001..005, all `requirements.md` | — |
| **II Workbook is truth** | STO-LOAD-001..006, STO-SAVE-001..010, STO-CONC-001, STO-CONC-002, API-WRITE-001..008, API-DEL-001, API-DEL-002, API-SUMM-001, DATA-TBL-001..005, DATA-FMT-001..004, DATA-LINK-001..005, LAY-THEME-001 (only UI prefs in browser), UCP-DEL-003, EVP-DEL-002 | SUM-EDIT-001 (SUM-T07..T10), UCF-EDIT-002 (UCF-T07), EVF-EDIT-002 (EVF-T06), STO-SAVE-010 backups (STO-T06), DATA-LINK-006 (DATA-T04) |
| **III Safe by default** | RTX-SAN-001..005, EXP-CSV-003, EXP-WORD-002, SEC-SAFE-001..003, API-GEN-002 | SEC-EXPO-001 localhost (SEC-T01), SEC-SUPPLY-004 deps (SEC-T03) |
| **IV Valid by construction** | UCF-FIELD-001..008, UCF-ADD-001, UCB-ROWS-001, UCB-SAVE-001..004, EVF-ADD-001, API-WRITE-001, API-WRITE-006, DATA-LINK-004 | API-WRITE-008 FK validation (API-T08), EVF-ADD-004 (EVF-T07), DATA-QUAL-003 (DATA-T06) |
| **V Clear feedback** | SRCH-LOAD-003, SRCH-LOAD-004, SRCH-RANK-006, UCP-DEL-001..003, UCP-CSV-001, UCP-STATE-001..003, EVP-DEL-001, EVP-DEL-002, EVP-CSV-001, EVP-STATE-001, UCF-ADD-003..005, UCB-SAVE-005..008, SUM-EDIT-004, SUM-WORD-003, CDL-HTTP-002..004, GRID-FILT-008, DS-MSG-001 | LAY-TOP-004 refresh (LAY-T07), SUM-EDIT-005, SUM-EDIT-006 (SUM-T09) |
| **VI Theme & responsive** | LAY-PANEL-001..005, LAY-THEME-001, LAY-THEME-002, DS-TOKEN-001..003, RTX-DARK-001..005, GRID-ROW-004 | — |
| **VII Accessible** | SRCH-ARIA-001, GRID-SORT-002, A11Y-NAME-001..005, A11Y-KEY-001..005, A11Y-FORM-001, A11Y-FORM-002, A11Y-SEE-001..003 | SRCH-ARIA-002 (SRCH-T06), GRID-ROW-006 (GRID-T06), A11Y-FORM-001, A11Y-FORM-002 (A11Y-T04/T05), A11Y-SEE-001 (A11Y-T06) |
| **VIII Simple & local-first** | ADR-0001, ADR-0002, LAY-STATE-001, GRID (one shared grid), EXP (no export library) | DS-COMP-004, DS-MOTION-003 (DS-T06..T08), SEC-SUPPLY-004 (SEC-T03), EVP-GRID-006 (EVP-T08), EXP-T05 |
| **IX Layered architecture** | CDL-HTTP-001..005, CDL-FETCH-001..004, CDL-QUERY-001..006, structure.md CONV-002/003 | — |
| **X Testable & traceable** | QA-TRACE-001, QA-TRACE-002, PIPE-BUILD-014 (logged recovery), every tasks.md | QA-TEST-001..005 (QA-T01..T05), QA-GATE-002, QA-GATE-003 |
| **XI Performance budget** | PERF-SPEED-001..007, SRCH-RANK-004, CDL-QUERY-002, RTX-EDIT-001 | PERF-SPEED-005..007 thresholds monitored (PERF-T07) |

## 3. Recorded exceptions
| Article | Spec | Reason | Exit task |
|---|---|---|---|
| II | executive-summary | Edits session-only until the summary endpoint exists | SUM-T07..T10 |
| II | use-case-form, event-form | Edit dialogs do not persist yet | UCF-T07, EVF-T06 |
| III.3 | security | Dev server reachable from the network | SEC-T01 |
| VII | accessibility | Label association, error announcement, keyboard row expansion | A11Y-T02..T06 |
| X | quality | No automated tests | QA-T01..T05 |

## 4. Maintenance rules
1. A new spec MUST add a row to the matrix and its requirement IDs to section 2.
2. A constitution amendment MUST add/rename a column and re-check every spec's "Constitution check".
3. When an exit task is done, remove the exception row and the ⚠️ markers.
