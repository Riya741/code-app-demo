# Gap register

Every requirement whose status is ❌ Gap or ⚠️ Partial, with the open tasks that close it. Planned (📝)
requirements are not gaps; they live only in their spec's tasks.

Rules:
- A row is added when a requirement is set to Gap or Partial, and moved to **Closed** when the requirement becomes
  ✅ Implemented (keep the row, struck through, for history).
- Severity: **High** loses or exposes data or breaks a core flow · **Medium** wrong or missing behaviour with a
  workaround · **Low** cosmetic, partial or documented limit.
- Regenerate the counts in [README](../README.md) after changing this file.

## Open

| Requirement | Sev | Title | Spec | Fix tasks | State |
|---|---|---|---|---|---|
| SRCH-ARIA-002 | Medium | Expose active option with aria-activedescendant | [001-customer-search](../specs/001-customer-search/requirements.md) | SRCH-T06 ⬜ | Open |
| EVF-ADD-004 | Medium | Validate whole numbers | [008-event-form](../specs/008-event-form/requirements.md) | EVF-T07 ⬜ | Open |
| GRID-ROW-006 | Medium | Keyboard row expansion | [009-data-grid](../specs/009-data-grid/requirements.md) | GRID-T06 ⬜ | Open |
| DATA-QUAL-003 | Medium | Valid statuses per solution (Every status allowed for every solution) | [012-data-model](../specs/012-data-model/requirements.md) | DATA-T06 ⛔ | Open |
| A11Y-NAME-003 | Medium | Search active option | [018-accessibility](../specs/018-accessibility/requirements.md) | A11Y-T02 ⬜ | Open |
| A11Y-KEY-001 | Medium | Keyboard row expansion | [018-accessibility](../specs/018-accessibility/requirements.md) | GRID-T06 ⬜, A11Y-T03 ⬜ | Open |
| A11Y-FORM-002 | Medium | Announce validation errors | [018-accessibility](../specs/018-accessibility/requirements.md) | A11Y-T05 ⬜ | Open |
| SEC-SUPPLY-004 | Medium | Remove unused dependencies (30 unused) | [019-security](../specs/019-security/requirements.md) | SEC-T03 ⬜ | Open |
| LAY-TOP-004 | Low | Refresh reloads all data (Only the customer list reloads) | [002-workspace-layout](../specs/002-workspace-layout/requirements.md) | LAY-T07 ⬜ | Open |
| UCF-EDIT-005 | Low | Value saved as plain text on edit (Implemented; no test names it yet) | [005-use-case-form](../specs/005-use-case-form/requirements.md) | UCF-T11 ⬜ | Open |
| UCF-EDIT-006 | Low | Launch date saved as a calendar date on edit (Implemented; no test names it yet) | [005-use-case-form](../specs/005-use-case-form/requirements.md) | UCF-T11 ⬜ | Open |
| EVF-EDIT-003 | Low | Attendee names saved as plain text on edit (Implemented; no test names it yet) | [008-event-form](../specs/008-event-form/requirements.md) | EVF-T10 ⬜ | Open |
| UCB-PASTE-004 | Low | Split on tabs only when present (Splits on tabs and commas together) | [006-use-case-bulk](../specs/006-use-case-bulk/requirements.md) | UCB-T09 ⬜ | Open |
| EXP-NAME-002 | Low | Keep any-script letters in names (Only ASCII letters/digits kept; non-Latin names become `customer`) | [010-export](../specs/010-export/requirements.md) | EXP-T04 ⬜, EXP-T07 ⬜ | Open |
| RTX-EDIT-007 | Low | Placeholder per field (Always "Write the executive summary...") | [011-rich-text](../specs/011-rich-text/requirements.md) | RTX-T06 ⬜ | Open |
| DATA-LINK-006 | Low | One agreed key column (Client may write the alternate `<name>_id` key (detectKey); server joins on `id`) | [012-data-model](../specs/012-data-model/requirements.md) | DATA-T04 ⬜ | Open |
| CDL-QUERY-003 | Low | Write the server's join key (`detectKey` may choose the alternate key; server joins on `id`) | [015-client-data-layer](../specs/015-client-data-layer/requirements.md) | DATA-T04 ⬜, CDL-T06 ⛔ | Open |
| DS-COMP-004 | Low | Reuse shared components (`Pill` defined twice (ParentActivity, UseCaseBulkForm)) | [017-design-system](../specs/017-design-system/requirements.md) | DS-T06 ⬜, DS-T08 ⬜ | Open |
| A11Y-FORM-001 | Low | Labels associated with controls (`Field` label has no `htmlFor`; comboboxes have no accessible name) | [018-accessibility](../specs/018-accessibility/requirements.md) | A11Y-T04 ⬜ | Open |
| A11Y-SEE-001 | Low | AA contrast (Not verified (small 10.5–11px text)) | [018-accessibility](../specs/018-accessibility/requirements.md) | A11Y-T06 ⬜ | Open |
| SEC-SUPPLY-003 | Low | No high npm audit issues (Not verified) | [019-security](../specs/019-security/requirements.md) | SEC-T04 ⬜ | Open |
| AOPS-FAIL-007 | Low | Degrade gracefully (No client and `enabled: false` done; the status route comes with AIB-T05) | [024-agent-ops](../specs/024-agent-ops/requirements.md) | AIB-T05 ✅, AOPS-T09 ⬜ (deferred, CR-20261123-2) | Open |
| AIB-SAFE-001 | Low | Data is not instructions (Escaped data block done; draft behaviour needs prompts and the eval) | [022-ai-account-brief](../specs/022-ai-account-brief/requirements.md) | AIB-T03 ✅, EVAL-T01 ✅ (dataset; the live eval run measures it) | Open |
| AIB-FAITH-003 | Low | Sparse or empty customers (Fact sheet exact; draft behaviour needs prompts and the eval) | [022-ai-account-brief](../specs/022-ai-account-brief/requirements.md) | AIB-T03 ✅, EVAL-T01 ✅ (dataset; the live eval run measures it) | Open |

## Accepted limitations
Known limits agreed as acceptable at the current data size. Revisit using the triggers in the requirement.

| Requirement | Sev | Title | Spec | Fix tasks | State |
|---|---|---|---|---|---|
| STO-SAVE-009 | Low | Data-only workbook (Documented limitation) | [013-workbook-storage](../specs/013-workbook-storage/requirements.md) | — | Accepted limit |
| PERF-SPEED-005 | Low | Save time budget (Documented limit) | [020-performance-reliability](../specs/020-performance-reliability/requirements.md) | PERF-T07 ⬜ | Accepted limit |
| PERF-SPEED-006 | Low | Bulk save limit (Documented limit) | [020-performance-reliability](../specs/020-performance-reliability/requirements.md) | — | Accepted limit |
| PERF-SPEED-007 | Low | Grid size limit (Documented limit) | [020-performance-reliability](../specs/020-performance-reliability/requirements.md) | — | Accepted limit |
| REL-SAFE-006 | Low | Close Excel while using the app (Operational rule, not shown in the app) | [020-performance-reliability](../specs/020-performance-reliability/requirements.md) | PERF-T06 ⬜ | Accepted limit |

## Closed

| Requirement | Sev | Title | Spec | Fix tasks | State |
|---|---|---|---|---|---|
| ~~MCP-TEST-002~~ | Low | ~~Works in a real client~~ | [025-mcp-tooling](../specs/025-mcp-tooling/requirements.md) | MCP-T06 ✅ | Closed 2026-11-24 |
| ~~DT-TIME-003~~ | High | ~~Date-only values show stored day~~ | [020-performance-reliability](../specs/020-performance-reliability/requirements.md) | UCP-T08 ✅, PERF-T03 ✅ | Closed 2026-11-24 |
| ~~UCP-GRID-004~~ | Low | ~~Launch date sort and display~~ | [004-use-cases-panel](../specs/004-use-cases-panel/requirements.md) | UCP-T08 ✅ | Closed 2026-11-24 |
| ~~EVP-GRID-003~~ | Low | ~~Show stored calendar day~~ | [007-events-panel](../specs/007-events-panel/requirements.md) | EVP-T07 ✅ | Closed 2026-11-24 |
| ~~API-WRITE-008~~ | High | ~~Validate references~~ | [014-workbook-api](../specs/014-workbook-api/requirements.md) | API-T08 ✅ | Closed 2026-11-24 |
| ~~DEVA-GATE-002~~ | Low | ~~Gates before stopping (the hook ran the whole test suite, not the affected tests)~~ | [026-dev-agents](../specs/026-dev-agents/requirements.md) | DEVA-T17 ✅ | Closed 2026-11-21 |
| ~~AIB-CITE-001~~ | Low | ~~Stable fact IDs~~ | [022-ai-account-brief](../specs/022-ai-account-brief/requirements.md) | AIB-T01 ✅, AIB-T02 ✅ | Closed 2026-11-21 |
| ~~AOPS-ORCH-002~~ | Low | ~~Every hand-off is validated~~ | [024-agent-ops](../specs/024-agent-ops/requirements.md) | AIB-T01 ✅, AOPS-T01 ✅ | Closed 2026-11-21 |
| ~~AOPS-ORCH-004~~ | Low | ~~Only listed tools~~ | [024-agent-ops](../specs/024-agent-ops/requirements.md) | AOPS-T02 ✅, AOPS-T01 ✅ | Closed 2026-11-21 |
| ~~LAY-PANEL-004~~ | Low | ~~Persist all split sizes~~ | [002-workspace-layout](../specs/002-workspace-layout/requirements.md) | LAY-T08 ✅ | Closed 2026-11-20 |
| ~~API-SUMM-002~~ | Medium | ~~Reject a summary body without a string summary~~ | [014-workbook-api](../specs/014-workbook-api/requirements.md) | API-T14 ✅ | Closed 2026-11-20 |
| ~~UCF-EDIT-002~~ | High | ~~Save use case edits~~ | [005-use-case-form](../specs/005-use-case-form/requirements.md) | UCF-T07 ✅ | Closed 2026-11-18 |
| ~~EVF-EDIT-002~~ | High | ~~Save event edits~~ | [008-event-form](../specs/008-event-form/requirements.md) | EVF-T06 ✅ | Closed 2026-11-18 |
| ~~SUM-EDIT-001~~ | High | ~~Persist summary edits~~ | [003-executive-summary](../specs/003-executive-summary/requirements.md) | API-T09 ✅, SUM-T07..T11 ✅ | Closed 2026-11-18 |
| ~~SUM-EDIT-005~~ | Low | ~~Save success and failure feedback~~ | [003-executive-summary](../specs/003-executive-summary/requirements.md) | SUM-T09 ✅ | Closed 2026-11-18 |
| ~~SUM-EDIT-006~~ | Low | ~~Disable buttons while saving~~ | [003-executive-summary](../specs/003-executive-summary/requirements.md) | SUM-T09 ✅ | Closed 2026-11-18 |
| ~~UCF-EDIT-004~~ | High | ~~Preserve target fields on edit~~ | [005-use-case-form](../specs/005-use-case-form/requirements.md) | UCF-T08 ✅ | Closed 2026-11-18 |
| ~~DATA-QUAL-001~~ | Medium | ~~Real event type names~~ | [012-data-model](../specs/012-data-model/requirements.md) | DATA-T05 ✅ (PIPE-T07) | Closed 2026-11-16 |
| ~~DATA-QUAL-002~~ | Medium | ~~Real personnel ids and emails~~ | [012-data-model](../specs/012-data-model/requirements.md) | DATA-T07 ✅ (PIPE-T07) | Closed 2026-11-16 |
| ~~DATA-QUAL-004~~ | Medium | ~~Populate customer and event fields~~ | [012-data-model](../specs/012-data-model/requirements.md) | DATA-T08 ✅ (PIPE-T07) | Closed 2026-11-16 |
| ~~SEC-EXPO-001~~ | High | ~~Bind to localhost~~ | [019-security](../specs/019-security/requirements.md) | SEC-T01 ✅ | Closed 2026-11-16 |
| ~~API-GEN-005~~ | Low | ~~Local-only, no auth~~ | [014-workbook-api](../specs/014-workbook-api/requirements.md) | SEC-T01 ✅, API-T10 ✅ | Closed 2026-11-16 |
| ~~SEC-SUPPLY-001~~ | Low | ~~Workbook never committed~~ | [019-security](../specs/019-security/requirements.md) | SEC-T02 ✅ | Closed 2026-11-16 |
| ~~EVAL-CODE-004~~ | Medium | ~~Numeric and status accuracy ("N use cases are <status>" checked against the total; false G7 failure on case `long-01`)~~ | [023-ai-evaluation](../specs/023-ai-evaluation/requirements.md) | EVAL-T15 ✅ (CR-20261125-1) | Closed 2026-11-25 |
