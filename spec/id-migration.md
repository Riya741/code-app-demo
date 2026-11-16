# ID migration (2026-11-11)

Requirement IDs changed from `PREFIX-NNN` to `PREFIX-AREA-NNN` when the specs moved to the sdd-spectree
format, and spec folders gained a number (`customer-search` → `001-customer-search`). Use this table to read
older notes or commits. Task IDs (`SRCH-T06`) and story IDs (`SRCH-R1`) did not change.

| Old | New | Spec | Title |
|---|---|---|---|
| SRCH-001 | SRCH-LOAD-001 | 001-customer-search | Load visible customers once at startup |
| SRCH-002 | SRCH-LOAD-002 | 001-customer-search | Never render the full customer list |
| SRCH-003 | SRCH-LOAD-003 | 001-customer-search | Disabled input while loading |
| SRCH-004 | SRCH-LOAD-004 | 001-customer-search | Load error with Try again |
| SRCH-010 | SRCH-RANK-001 | 001-customer-search | Normalise and tokenise the query |
| SRCH-011 | SRCH-RANK-002 | 001-customer-search | Match on all tokens or parent ID |
| SRCH-012 | SRCH-RANK-003 | 001-customer-search | Rank matches |
| SRCH-013 | SRCH-RANK-004 | 001-customer-search | Cap at 100 results with match count |
| SRCH-014 | SRCH-RANK-005 | 001-customer-search | Highlight tokens, hide parent ID |
| SRCH-015 | SRCH-RANK-006 | 001-customer-search | No-match message |
| SRCH-020 | SRCH-SEL-001 | 001-customer-search | Open results on focus or input |
| SRCH-021 | SRCH-SEL-002 | 001-customer-search | Arrow-key navigation |
| SRCH-022 | SRCH-SEL-003 | 001-customer-search | Open customer on Enter or click |
| SRCH-023 | SRCH-SEL-004 | 001-customer-search | Close on Escape or outside click |
| SRCH-024 | SRCH-SEL-005 | 001-customer-search | Clear button |
| SRCH-025 | SRCH-SEL-006 | 001-customer-search | Enter-to-open hint |
| SRCH-030 | SRCH-VAR-001 | 001-customer-search | Hero search on landing page |
| SRCH-031 | SRCH-VAR-002 | 001-customer-search | Bar search in top bar |
| SRCH-040 | SRCH-ARIA-001 | 001-customer-search | Combobox and listbox roles |
| SRCH-041 | SRCH-ARIA-002 | 001-customer-search | Expose active option with aria-activedescendant |
| LAY-001 | LAY-STATE-001 | 002-workspace-layout | Landing page with hero search |
| LAY-002 | LAY-STATE-002 | 002-workspace-layout | Workspace keyed by customer |
| LAY-003 | LAY-STATE-003 | 002-workspace-layout | Pass customer keys to panels |
| LAY-004 | LAY-STATE-004 | 002-workspace-layout | Workspace width and padding |
| LAY-005 | LAY-STATE-005 | 002-workspace-layout | Decorative backdrop |
| LAY-010 | LAY-PANEL-001 | 002-workspace-layout | One-viewport desktop layout |
| LAY-011 | LAY-PANEL-002 | 002-workspace-layout | Desktop split proportions |
| LAY-012 | LAY-PANEL-003 | 002-workspace-layout | Draggable dividers |
| LAY-013 | LAY-PANEL-004 | 002-workspace-layout | Persist all split sizes |
| LAY-014 | LAY-PANEL-005 | 002-workspace-layout | Stacked panels below 1024px |
| LAY-020 | LAY-TOP-001 | 002-workspace-layout | Sticky translucent top bar |
| LAY-021 | LAY-TOP-002 | 002-workspace-layout | Customer chip |
| LAY-022 | LAY-TOP-003 | 002-workspace-layout | Bar search in top bar |
| LAY-023 | LAY-TOP-004 | 002-workspace-layout | Refresh reloads all data |
| LAY-030 | LAY-THEME-001 | 002-workspace-layout | Light default theme, persisted |
| LAY-031 | LAY-THEME-002 | 002-workspace-layout | Theme toggle |
| LAY-040 | LAY-SHELL-001 | 002-workspace-layout | Shared panel shell |
| SUM-001 | SUM-VIEW-001 | 003-executive-summary | Summary panel title and colours |
| SUM-002 | SUM-VIEW-002 | 003-executive-summary | Render HTML or plain text |
| SUM-003 | SUM-VIEW-003 | 003-executive-summary | Empty summary prompt |
| SUM-004 | SUM-VIEW-004 | 003-executive-summary | Last modified timestamp |
| SUM-010 | SUM-EDIT-001 | 003-executive-summary | Persist summary edits |
| SUM-011 | SUM-EDIT-002 | 003-executive-summary | Open editor by click or key |
| SUM-012 | SUM-EDIT-003 | 003-executive-summary | Lazy editor pre-filled |
| SUM-013 | SUM-EDIT-004 | 003-executive-summary | Cancel and Save while editing |
| SUM-014 | SUM-EDIT-005 | 003-executive-summary | Save success and failure feedback |
| SUM-015 | SUM-EDIT-006 | 003-executive-summary | Disable buttons while saving |
| SUM-016 | SUM-EDIT-007 | 003-executive-summary | Interim on-screen-only marker |
| SUM-020 | SUM-WORD-001 | 003-executive-summary | Export summary to Word |
| SUM-021 | SUM-WORD-002 | 003-executive-summary | Disable export when empty |
| SUM-022 | SUM-WORD-003 | 003-executive-summary | Export toast |
| UCP-001 | UCP-HEAD-001 | 004-use-cases-panel | Use case count in header |
| UCP-002 | UCP-HEAD-002 | 004-use-cases-panel | Live tally |
| UCP-003 | UCP-HEAD-003 | 004-use-cases-panel | Add use case split button |
| UCP-004 | UCP-HEAD-004 | 004-use-cases-panel | Selection toolbar |
| UCP-005 | UCP-HEAD-005 | 004-use-cases-panel | Export button |
| UCP-010 | UCP-GRID-001 | 004-use-cases-panel | Grid columns and filters |
| UCP-011 | UCP-GRID-002 | 004-use-cases-panel | Initial order and empty cells |
| UCP-012 | UCP-GRID-003 | 004-use-cases-panel | Comma lists for multi-values |
| UCP-013 | UCP-GRID-004 | 004-use-cases-panel | Launch date sort and display |
| UCP-020 | UCP-ROW-001 | 004-use-cases-panel | Expandable value and notes |
| UCP-021 | UCP-ROW-002 | 004-use-cases-panel | Row checkbox and actions |
| UCP-022 | UCP-ROW-003 | 004-use-cases-panel | Clone opens bulk form |
| UCP-023 | UCP-ROW-004 | 004-use-cases-panel | Clear selection after bulk form |
| UCP-024 | UCP-ROW-005 | 004-use-cases-panel | Edit opens single form |
| UCP-030 | UCP-DEL-001 | 004-use-cases-panel | Confirm before delete |
| UCP-031 | UCP-DEL-002 | 004-use-cases-panel | Pending and failed delete |
| UCP-032 | UCP-DEL-003 | 004-use-cases-panel | Soft delete with toast |
| UCP-040 | UCP-CSV-001 | 004-use-cases-panel | Export shown rows to CSV |
| UCP-050 | UCP-STATE-001 | 004-use-cases-panel | Loading skeleton |
| UCP-051 | UCP-STATE-002 | 004-use-cases-panel | Error with Try again |
| UCP-052 | UCP-STATE-003 | 004-use-cases-panel | Empty state |
| UCF-001 | UCF-FIELD-001 | 005-use-case-form | Form fields and order |
| UCF-002 | UCF-FIELD-002 | 005-use-case-form | Subsidiary and department options |
| UCF-003 | UCF-FIELD-003 | 005-use-case-form | Type and status options per solution |
| UCF-004 | UCF-FIELD-004 | 005-use-case-form | Cascade clearing |
| UCF-005 | UCF-FIELD-005 | 005-use-case-form | Disabled dependent fields |
| UCF-006 | UCF-FIELD-006 | 005-use-case-form | Empty option messages |
| UCF-007 | UCF-FIELD-007 | 005-use-case-form | Option loading and errors |
| UCF-008 | UCF-FIELD-008 | 005-use-case-form | Option key from detectKey |
| UCF-010 | UCF-ADD-001 | 005-use-case-form | Required field validation |
| UCF-011 | UCF-ADD-002 | 005-use-case-form | Post UseCaseInput |
| UCF-012 | UCF-ADD-003 | 005-use-case-form | Saving state |
| UCF-013 | UCF-ADD-004 | 005-use-case-form | Success toast and refresh |
| UCF-014 | UCF-ADD-005 | 005-use-case-form | Failure keeps input |
| UCF-015 | UCF-ADD-006 | 005-use-case-form | Blank dialog on open |
| UCF-016 | UCF-ADD-007 | 005-use-case-form | No target fields in form |
| UCF-017 | UCF-ADD-008 | 005-use-case-form | Warn on possible duplicate |
| UCF-020 | UCF-EDIT-001 | 005-use-case-form | Edit dialog pre-filled |
| UCF-021 | UCF-EDIT-002 | 005-use-case-form | Save use case edits |
| UCF-022 | UCF-EDIT-003 | 005-use-case-form | Cascades in edit mode |
| UCF-023 | UCF-EDIT-004 | 005-use-case-form | Preserve target fields on edit |
| UCB-010 | UCB-CLONE-001 | 006-use-case-bulk | List clone sources |
| UCB-011 | UCB-CLONE-002 | 006-use-case-bulk | Copy fields from source |
| UCB-012 | UCB-CLONE-003 | 006-use-case-bulk | Match department by name |
| UCB-013 | UCB-CLONE-004 | 006-use-case-bulk | Default planned status |
| UCB-020 | UCB-FILL-001 | 006-use-case-bulk | Set on all rows bar |
| UCB-021 | UCB-FILL-002 | 006-use-case-bulk | Apply order of fill |
| UCB-030 | UCB-ROWS-001 | 006-use-case-bulk | Row fields and actions |
| UCB-031 | UCB-ROWS-002 | 006-use-case-bulk | Keep type and status on solution change |
| UCB-032 | UCB-ROWS-003 | 006-use-case-bulk | Add row copies template |
| UCB-033 | UCB-ROWS-004 | 006-use-case-bulk | Rows for every department |
| UCB-034 | UCB-ROWS-005 | 006-use-case-bulk | Empty table message |
| UCB-040 | UCB-PASTE-001 | 006-use-case-bulk | Paste rows from Excel |
| UCB-041 | UCB-PASTE-002 | 006-use-case-bulk | Match pasted names |
| UCB-042 | UCB-PASTE-003 | 006-use-case-bulk | Pasted rows replace pending rows |
| UCB-043 | UCB-PASTE-004 | 006-use-case-bulk | Split on tabs only when present |
| UCB-050 | UCB-SHARE-001 | 006-use-case-bulk | Shared details section |
| UCB-051 | UCB-SHARE-002 | 006-use-case-bulk | Shared details default |
| UCB-060 | UCB-SAVE-001 | 006-use-case-bulk | Row status pill |
| UCB-061 | UCB-SAVE-002 | 006-use-case-bulk | Duplicates warn only |
| UCB-062 | UCB-SAVE-003 | 006-use-case-bulk | Footer counts |
| UCB-063 | UCB-SAVE-004 | 006-use-case-bulk | Block create on incomplete rows |
| UCB-064 | UCB-SAVE-005 | 006-use-case-bulk | Sequential save with progress |
| UCB-065 | UCB-SAVE-006 | 006-use-case-bulk | All saved toast |
| UCB-066 | UCB-SAVE-007 | 006-use-case-bulk | Partial failure keeps failed rows |
| UCB-067 | UCB-SAVE-008 | 006-use-case-bulk | List load error |
| EVP-001 | EVP-HEAD-001 | 007-events-panel | Event count in header |
| EVP-002 | EVP-HEAD-002 | 007-events-panel | Completed and attendee tallies |
| EVP-003 | EVP-HEAD-003 | 007-events-panel | Add event and Export buttons |
| EVP-010 | EVP-GRID-001 | 007-events-panel | Grid columns and filters |
| EVP-011 | EVP-GRID-002 | 007-events-panel | Newest first order |
| EVP-012 | EVP-GRID-003 | 007-events-panel | Show stored calendar day |
| EVP-013 | EVP-GRID-004 | 007-events-panel | Expandable attendees and notes |
| EVP-014 | EVP-GRID-005 | 007-events-panel | Edit and Delete only |
| EVP-015 | EVP-GRID-006 | 007-events-panel | Warning banners |
| EVP-030 | EVP-DEL-001 | 007-events-panel | Confirm before delete |
| EVP-031 | EVP-DEL-002 | 007-events-panel | Delete behaviour matches use cases |
| EVP-040 | EVP-CSV-001 | 007-events-panel | Export shown rows to CSV |
| EVP-050 | EVP-STATE-001 | 007-events-panel | Loading, error and empty states |
| EVF-001 | EVF-FIELD-001 | 008-event-form | Form fields |
| EVF-002 | EVF-FIELD-002 | 008-event-form | Stage suggestions |
| EVF-003 | EVF-FIELD-003 | 008-event-form | Subsidiary key from events |
| EVF-010 | EVF-ADD-001 | 008-event-form | Required field validation |
| EVF-011 | EVF-ADD-002 | 008-event-form | Post EventInput |
| EVF-012 | EVF-ADD-003 | 008-event-form | Saving, success and failure |
| EVF-013 | EVF-ADD-004 | 008-event-form | Validate whole numbers |
| EVF-014 | EVF-ADD-005 | 008-event-form | Stage from an agreed list |
| EVF-020 | EVF-EDIT-001 | 008-event-form | Edit dialog pre-filled |
| EVF-021 | EVF-EDIT-002 | 008-event-form | Save event edits |
| GRID-001 | GRID-SORT-001 | 009-data-grid | Sort cycle |
| GRID-002 | GRID-SORT-002 | 009-data-grid | Sort arrow and aria-sort |
| GRID-003 | GRID-SORT-003 | 009-data-grid | Empty values sort last |
| GRID-010 | GRID-FILT-001 | 009-data-grid | Filter funnel and popover |
| GRID-011 | GRID-FILT-002 | 009-data-grid | Select filter |
| GRID-012 | GRID-FILT-003 | 009-data-grid | Text filter |
| GRID-013 | GRID-FILT-004 | 009-data-grid | Number filter |
| GRID-014 | GRID-FILT-005 | 009-data-grid | Date filter |
| GRID-015 | GRID-FILT-006 | 009-data-grid | Combine filters with AND |
| GRID-016 | GRID-FILT-007 | 009-data-grid | Clear filters strip |
| GRID-017 | GRID-FILT-008 | 009-data-grid | No rows match message |
| GRID-018 | GRID-FILT-009 | 009-data-grid | Reset state on customer change |
| GRID-020 | GRID-ROW-001 | 009-data-grid | One expanded row at a time |
| GRID-021 | GRID-ROW-002 | 009-data-grid | Actions do not toggle expansion |
| GRID-022 | GRID-ROW-003 | 009-data-grid | Row action buttons |
| GRID-023 | GRID-ROW-004 | 009-data-grid | Row tint, hover and sticky header |
| GRID-024 | GRID-ROW-005 | 009-data-grid | No select-all |
| GRID-025 | GRID-ROW-006 | 009-data-grid | Keyboard row expansion |
| GRID-030 | GRID-CSV-001 | 009-data-grid | Export visible columns and rows |
| EXP-001 | EXP-NAME-001 | 010-export | Export file name pattern |
| EXP-002 | EXP-NAME-002 | 010-export | Keep any-script letters in names |
| EXP-010 | EXP-CSV-001 | 010-export | CSV encoding and format |
| EXP-011 | EXP-CSV-002 | 010-export | CSV quoting |
| EXP-012 | EXP-CSV-003 | 010-export | Formula-injection guard |
| EXP-013 | EXP-CSV-004 | 010-export | Rich text as plain text |
| EXP-014 | EXP-CSV-005 | 010-export | Revoke Blob URL |
| EXP-020 | EXP-WORD-001 | 010-export | Word-compatible HTML document |
| EXP-021 | EXP-WORD-002 | 010-export | Sanitise or escape bodies |
| EXP-022 | EXP-WORD-003 | 010-export | Word styling |
| EXP-023 | EXP-WORD-004 | 010-export | True .docx export |
| RTX-001 | RTX-CONV-001 | 011-rich-text | Detect HTML values |
| RTX-002 | RTX-CONV-002 | 011-rich-text | Convert HTML to text |
| RTX-010 | RTX-SAN-001 | 011-rich-text | Sanitise with DOMPurify |
| RTX-011 | RTX-SAN-002 | 011-rich-text | Allowed style properties |
| RTX-012 | RTX-SAN-003 | 011-rich-text | Allowed classes |
| RTX-013 | RTX-SAN-004 | 011-rich-text | Safe external links |
| RTX-014 | RTX-SAN-005 | 011-rich-text | Never modify stored HTML |
| RTX-020 | RTX-DARK-001 | 011-rich-text | Adjust colours in dark mode |
| RTX-021 | RTX-DARK-002 | 011-rich-text | Resolve colour formats |
| RTX-022 | RTX-DARK-003 | 011-rich-text | Rich text class |
| RTX-023 | RTX-DARK-004 | 011-rich-text | Dark editor content |
| RTX-024 | RTX-DARK-005 | 011-rich-text | Quill classes outside editor |
| RTX-030 | RTX-EDIT-001 | 011-rich-text | Lazy-load editor |
| RTX-031 | RTX-EDIT-002 | 011-rich-text | Toolbar options |
| RTX-032 | RTX-EDIT-003 | 011-rich-text | Inline styles for legacy formatting |
| RTX-033 | RTX-EDIT-004 | 011-rich-text | Sanitised initial content |
| RTX-034 | RTX-EDIT-005 | 011-rich-text | Report HTML on change |
| RTX-035 | RTX-EDIT-006 | 011-rich-text | Sticky toolbar and sizes |
| RTX-036 | RTX-EDIT-007 | 011-rich-text | Placeholder per field |
| RTX-040 | RTX-FIELD-001 | 011-rich-text | Textarea-like field |
| RTX-041 | RTX-FIELD-002 | 011-rich-text | Open compact editor |
| DATA-001 | DATA-TBL-001 | 012-data-model | One sheet per table |
| DATA-002 | DATA-TBL-002 | 012-data-model | Integer ids |
| DATA-003 | DATA-TBL-003 | 012-data-model | Mirror ids |
| DATA-004 | DATA-TBL-004 | 012-data-model | Link sheet keys |
| DATA-005 | DATA-TBL-005 | 012-data-model | README sheet |
| DATA-010 | DATA-FMT-001 | 012-data-model | Date and timestamp format |
| DATA-011 | DATA-FMT-002 | 012-data-model | Booleans |
| DATA-012 | DATA-FMT-003 | 012-data-model | Empty values |
| DATA-013 | DATA-FMT-004 | 012-data-model | Text limits |
| DATA-020 | DATA-LINK-001 | 012-data-model | Multi-valued relations in link sheets |
| DATA-021 | DATA-LINK-002 | 012-data-model | Event belongs via subsidiary |
| DATA-022 | DATA-LINK-003 | 012-data-model | Soft delete |
| DATA-023 | DATA-LINK-004 | 012-data-model | Allowed types and statuses per solution |
| DATA-024 | DATA-LINK-005 | 012-data-model | Status history |
| DATA-025 | DATA-LINK-006 | 012-data-model | One agreed key column |
| DATA-030 | DATA-QUAL-001 | 012-data-model | Real event type names |
| DATA-031 | DATA-QUAL-002 | 012-data-model | Real personnel ids and emails |
| DATA-032 | DATA-QUAL-003 | 012-data-model | Valid statuses per solution |
| DATA-033 | DATA-QUAL-004 | 012-data-model | Populate customer and event fields |
| STO-001 | STO-LOAD-001 | 013-workbook-storage | Workbook path |
| STO-002 | STO-LOAD-002 | 013-workbook-storage | Reload on mtime change |
| STO-003 | STO-LOAD-003 | 013-workbook-storage | Missing workbook error |
| STO-004 | STO-LOAD-004 | 013-workbook-storage | Fix openpyxl table paths |
| STO-005 | STO-LOAD-005 | 013-workbook-storage | Sheets to rows |
| STO-006 | STO-LOAD-006 | 013-workbook-storage | Normalise cell values |
| STO-010 | STO-SAVE-001 | 013-workbook-storage | Write sheets as Excel tables |
| STO-011 | STO-SAVE-002 | 013-workbook-storage | README sheet first |
| STO-012 | STO-SAVE-003 | 013-workbook-storage | Clean strings |
| STO-013 | STO-SAVE-004 | 013-workbook-storage | Atomic save |
| STO-014 | STO-SAVE-005 | 013-workbook-storage | Locked file error |
| STO-015 | STO-SAVE-006 | 013-workbook-storage | Discard memory after failure |
| STO-016 | STO-SAVE-007 | 013-workbook-storage | No self-triggered reload |
| STO-017 | STO-SAVE-008 | 013-workbook-storage | Preserve column order |
| STO-018 | STO-SAVE-009 | 013-workbook-storage | Data-only workbook |
| STO-019 | STO-SAVE-010 | 013-workbook-storage | Rolling backups |
| STO-020 | STO-CONC-001 | 013-workbook-storage | Serial request queue |
| STO-021 | STO-CONC-002 | 013-workbook-storage | Missing sheet error |
| API-001 | API-GEN-001 | 014-workbook-api | JSON success responses |
| API-002 | API-GEN-002 | 014-workbook-api | Error responses |
| API-003 | API-GEN-003 | 014-workbook-api | Unknown route |
| API-004 | API-GEN-004 | 014-workbook-api | Invalid JSON body |
| API-005 | API-GEN-005 | 014-workbook-api | Local-only, no auth |
| API-010 | API-READ-001 | 014-workbook-api | Raw table reads |
| API-011 | API-READ-002 | 014-workbook-api | Use cases for a customer |
| API-012 | API-READ-003 | 014-workbook-api | Events for a customer |
| API-013 | API-READ-004 | 014-workbook-api | parentId required |
| API-014 | API-READ-005 | 014-workbook-api | Solution mappings |
| API-015 | API-READ-006 | 014-workbook-api | Health check |
| API-020 | API-WRITE-001 | 014-workbook-api | Insert or update use case |
| API-021 | API-WRITE-002 | 014-workbook-api | Full-replace writes |
| API-022 | API-WRITE-003 | 014-workbook-api | Write timestamps |
| API-023 | API-WRITE-004 | 014-workbook-api | Replace link rows |
| API-024 | API-WRITE-005 | 014-workbook-api | Append status history |
| API-025 | API-WRITE-006 | 014-workbook-api | Insert or update event |
| API-026 | API-WRITE-007 | 014-workbook-api | Id response |
| API-027 | API-WRITE-008 | 014-workbook-api | Validate references |
| API-040 | API-DEL-001 | 014-workbook-api | Soft delete endpoints |
| API-041 | API-DEL-002 | 014-workbook-api | Delete not found or already deleted |
| API-030 | API-SUMM-001 | 014-workbook-api | Save customer summary |
| CDL-001 | CDL-HTTP-001 | 015-client-data-layer | API base path |
| CDL-002 | CDL-HTTP-002 | 015-client-data-layer | Network error message |
| CDL-003 | CDL-HTTP-003 | 015-client-data-layer | Non-JSON response message |
| CDL-004 | CDL-HTTP-004 | 015-client-data-layer | Server error message |
| CDL-005 | CDL-HTTP-005 | 015-client-data-layer | Table query encoding |
| CDL-010 | CDL-FETCH-001 | 015-client-data-layer | Visible customers only |
| CDL-011 | CDL-FETCH-002 | 015-client-data-layer | Subsidiaries by first matching key |
| CDL-012 | CDL-FETCH-003 | 015-client-data-layer | Ordered lookup lists |
| CDL-013 | CDL-FETCH-004 | 015-client-data-layer | Delete without id |
| CDL-020 | CDL-QUERY-001 | 015-client-data-layer | No focus refetch, one retry |
| CDL-021 | CDL-QUERY-002 | 015-client-data-layer | Ten-minute lookup cache |
| CDL-022 | CDL-QUERY-003 | 015-client-data-layer | Write the server's join key |
| CDL-023 | CDL-QUERY-004 | 015-client-data-layer | Invalidate after writes |
| CDL-024 | CDL-QUERY-005 | 015-client-data-layer | Sequential bulk save |
| CDL-025 | CDL-QUERY-006 | 015-client-data-layer | Queries need a parent id |
| PIPE-001 | PIPE-BUILD-001 | 016-data-pipeline | Import integer use case ids |
| PIPE-002 | PIPE-BUILD-002 | 016-data-pipeline | Rejoin split summaries |
| PIPE-003 | PIPE-BUILD-003 | 016-data-pipeline | Derive lookups |
| PIPE-004 | PIPE-BUILD-004 | 016-data-pipeline | Generate personnel and content type ids |
| PIPE-005 | PIPE-BUILD-005 | 016-data-pipeline | Recover events |
| PIPE-006 | PIPE-BUILD-006 | 016-data-pipeline | Drop incomplete events |
| PIPE-007 | PIPE-BUILD-007 | 016-data-pipeline | Match event solutions |
| PIPE-008 | PIPE-BUILD-008 | 016-data-pipeline | Add missing subsidiaries |
| PIPE-009 | PIPE-BUILD-009 | 016-data-pipeline | Keep active customers |
| PIPE-010 | PIPE-BUILD-010 | 016-data-pipeline | Default statuses and event types |
| PIPE-011 | PIPE-BUILD-011 | 016-data-pipeline | Drop orphan history |
| PIPE-012 | PIPE-BUILD-012 | 016-data-pipeline | Clean text |
| PIPE-013 | PIPE-BUILD-013 | 016-data-pipeline | README sheet and tables |
| PIPE-014 | PIPE-BUILD-014 | 016-data-pipeline | Print build counts |
| PIPE-020 | PIPE-NOTES-001 | 016-data-pipeline | Find note start rows |
| PIPE-021 | PIPE-NOTES-002 | 016-data-pipeline | Note line layout |
| PIPE-022 | PIPE-NOTES-003 | 016-data-pipeline | Restore bullet glyphs |
| PIPE-023 | PIPE-NOTES-004 | 016-data-pipeline | Non-id integers as text |
| PIPE-024 | PIPE-NOTES-005 | 016-data-pipeline | Collapse blank lines |
| PIPE-025 | PIPE-NOTES-006 | 016-data-pipeline | Write notes only |
| DS-001 | DS-TOKEN-001 | 017-design-system | Colour tokens only |
| DS-002 | DS-TOKEN-002 | 017-design-system | Light and dark values |
| DS-003 | DS-TOKEN-003 | 017-design-system | Radius token |
| DS-010 | DS-TYPE-001 | 017-design-system | Type scale |
| DS-011 | DS-TYPE-002 | 017-design-system | Compact controls |
| DS-012 | DS-TYPE-003 | 017-design-system | Panel title style |
| DS-020 | DS-COLOR-001 | 017-design-system | Status pill colours |
| DS-030 | DS-COMP-001 | 017-design-system | Combobox |
| DS-031 | DS-COMP-002 | 017-design-system | Field |
| DS-032 | DS-COMP-003 | 017-design-system | ConfirmDelete |
| DS-033 | DS-COMP-004 | 017-design-system | Reuse shared components |
| DS-034 | DS-COMP-005 | 017-design-system | Vendored primitives unchanged |
| DS-040 | DS-MSG-001 | 017-design-system | Messages catalog |
| DS-050 | DS-MOTION-001 | 017-design-system | Enter animations |
| DS-051 | DS-MOTION-002 | 017-design-system | Slim scrollbars |
| DS-052 | DS-MOTION-003 | 017-design-system | Remove unused theme extras |
| A11Y-001 | A11Y-NAME-001 | 018-accessibility | Icon buttons labelled |
| A11Y-002 | A11Y-NAME-002 | 018-accessibility | Search combobox pattern |
| A11Y-003 | A11Y-NAME-003 | 018-accessibility | Search active option |
| A11Y-004 | A11Y-NAME-004 | 018-accessibility | Grid sort and checkbox labels |
| A11Y-005 | A11Y-NAME-005 | 018-accessibility | Decorative elements hidden |
| A11Y-010 | A11Y-KEY-001 | 018-accessibility | Keyboard row expansion |
| A11Y-011 | A11Y-KEY-002 | 018-accessibility | Keyboard click-to-edit |
| A11Y-012 | A11Y-KEY-003 | 018-accessibility | Dialog focus trap |
| A11Y-013 | A11Y-KEY-004 | 018-accessibility | Keyboard dividers |
| A11Y-014 | A11Y-KEY-005 | 018-accessibility | Visible focus |
| A11Y-020 | A11Y-FORM-001 | 018-accessibility | Labels associated with controls |
| A11Y-021 | A11Y-FORM-002 | 018-accessibility | Announce validation errors |
| A11Y-030 | A11Y-SEE-001 | 018-accessibility | AA contrast |
| A11Y-031 | A11Y-SEE-002 | 018-accessibility | Not colour alone |
| A11Y-032 | A11Y-SEE-003 | 018-accessibility | Announce toasts |
| SEC-001 | SEC-SAFE-001 | 019-security | Sanitise HTML |
| SEC-002 | SEC-SAFE-002 | 019-security | CSV formula guard |
| SEC-003 | SEC-SAFE-003 | 019-security | No stack traces to browser |
| SEC-010 | SEC-EXPO-001 | 019-security | Bind to localhost |
| SEC-011 | SEC-EXPO-002 | 019-security | Auth before multi-user hosting |
| SEC-020 | SEC-SUPPLY-001 | 019-security | Workbook never committed |
| SEC-021 | SEC-SUPPLY-002 | 019-security | No secrets |
| SEC-022 | SEC-SUPPLY-003 | 019-security | No high npm audit issues |
| SEC-023 | SEC-SUPPLY-004 | 019-security | Remove unused dependencies |
| PERF-001 | PERF-SPEED-001 | 020-performance-reliability | Instant search |
| PERF-002 | PERF-SPEED-002 | 020-performance-reliability | Cached lookups |
| PERF-003 | PERF-SPEED-003 | 020-performance-reliability | Lazy editor |
| PERF-004 | PERF-SPEED-004 | 020-performance-reliability | Reload only on change |
| PERF-005 | PERF-SPEED-005 | 020-performance-reliability | Save time budget |
| PERF-006 | PERF-SPEED-006 | 020-performance-reliability | Bulk save limit |
| PERF-007 | PERF-SPEED-007 | 020-performance-reliability | Grid size limit |
| REL-001 | REL-SAFE-001 | 020-performance-reliability | Atomic writes |
| REL-002 | REL-SAFE-002 | 020-performance-reliability | Locked workbook error |
| REL-003 | REL-SAFE-003 | 020-performance-reliability | Re-read after failure |
| REL-004 | REL-SAFE-004 | 020-performance-reliability | Serialised requests |
| REL-005 | REL-SAFE-005 | 020-performance-reliability | Pick up external saves |
| REL-006 | REL-SAFE-006 | 020-performance-reliability | Close Excel while using the app |
| REL-007 | REL-SAFE-007 | 020-performance-reliability | Retry once |
| REL-008 | REL-SAFE-008 | 020-performance-reliability | Backup before save |
| COMP-001 | COMP-ENV-001 | 020-performance-reliability | Supported browsers |
| COMP-002 | COMP-ENV-002 | 020-performance-reliability | 360px to 1920px |
| COMP-003 | COMP-ENV-003 | 020-performance-reliability | Node version in engines |
| COMP-004 | COMP-ENV-004 | 020-performance-reliability | openpyxl and Excel workbooks |
| DT-001 | DT-TIME-001 | 020-performance-reliability | UTC timestamps |
| DT-002 | DT-TIME-002 | 020-performance-reliability | Summary time in UTC |
| DT-003 | DT-TIME-003 | 020-performance-reliability | Date-only values show stored day |
| DT-004 | DT-TIME-004 | 020-performance-reliability | UTC date in file names |
| QA-001 | QA-TEST-001 | 021-quality | Unit tests |
| QA-002 | QA-TEST-002 | 021-quality | Component tests |
| QA-003 | QA-TEST-003 | 021-quality | Server integration tests |
| QA-004 | QA-TEST-004 | 021-quality | End-to-end smoke and axe |
| QA-005 | QA-TEST-005 | 021-quality | Typecheck script |
| QA-010 | QA-TRACE-001 | 021-quality | Tests cite requirement IDs |
| QA-011 | QA-TRACE-002 | 021-quality | Tasks list requirements and status |
| QA-020 | QA-GATE-001 | 021-quality | Lint passes |
| QA-021 | QA-GATE-002 | 021-quality | TypeScript strict |
| QA-022 | QA-GATE-003 | 021-quality | Checks on every commit |
| QA-030 | QA-DOD-001 | 021-quality | Spec before code |
| QA-031 | QA-DOD-002 | 021-quality | Criteria verified |
| QA-032 | QA-DOD-003 | 021-quality | Messages catalogued |
| QA-033 | QA-DOD-004 | 021-quality | Themes and breakpoints checked |
| QA-034 | QA-DOD-005 | 021-quality | Statuses and traceability updated |
