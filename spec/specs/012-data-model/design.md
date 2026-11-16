# Design — Data Model

## Entity relationships
```
customer 1───* subsidiary 1───* department 1───* stakeholder
   │               │
   │               └──* event *──* personnel   (event_personnel)
   │                      │  └──* solution    (event_solution)
   │                      └── event_type
   └──* use_case ── subsidiary, department, stakeholder, solution, status, use_case_type
          ├──* personnel     (use_case_personnel)
          ├──* content_type  (use_case_content_type)
          └──* use_case_status_history
solution *──* use_case_type (solution_use_case_type)
solution *──* status        (solution_status + sort_order)
```

## Schema (★ key, → foreign key)

| Sheet | Columns |
|---|---|
| customer | id★, parent_id, parent_name, executive_summary, summary_last_modified, visible, industry, vertical |
| subsidiary | id★, subsidiary_id, subsidiary_name, parent_id→customer, geo_id, is_enterprise, market_area_id |
| department | id★, department_id, department_name, department_type, subsidiary_id→subsidiary |
| stakeholder | id★, stakeholder_name, stakeholder_title, department_id→department, email |
| solution | id★, solution_name, metric_type, premium_credit, is_ffe |
| use_case_type | id★, use_case_type |
| status | id★, status |
| solution_use_case_type | id★, solution_id, use_case_type_id |
| solution_status | id★, solution_id, status_id, sort_order |
| personnel | id★, name, email, role, sdm_geo_id |
| content_type | id★, content_type |
| event_type | id★, event_type |
| use_case | id★, use_case_id, parent_id, subsidiary_id, department_id, stakeholder_id, solution_id, status_id, use_case_type_id, target_users, target_credits_consumed, target_api_calls, expected_launch_date, note, value_snippet, premium_credit, deleted, created, last_modified, jsp, jsp_link, uc_in_jsp, dr_id, jira_id, photography_type_id, fde_support_request, fde_request_notes, fde_escalation_id, fde_request_ts, adoption_criteria, engaged_success_criteria, blocker_names, current_solution_names |
| use_case_personnel | id★, use_case_id, personnel_id |
| use_case_content_type | id★, use_case_id, content_type_id |
| use_case_status_history | id★, use_case_id, status_id, previous_status_id, change_datetime |
| event | id★, event_id, attendee_count, attendee_names, meeting_notes, event_date, event_type_id, stage, onsite, virtual, duration, subsidiary_id, deleted, created, last_modified |
| event_personnel | event_personnel_id★, event_id, personnel_id |
| event_solution | event_solution_id★, event_id, solution_id |

Legacy `use_case` columns from `jsp` to `engaged_success_criteria` are kept for compatibility and not used by the app.
`blocker_names` and `current_solution_names` are legacy concatenated text, returned as-is.

## Column ownership
| Columns | Written by |
|---|---|
| `use_case` core fields, `event` fields, link sheets, history | App (API) |
| Lookups, customer flags | Build script / maintainers in Excel |
| `customer.executive_summary` | Build script (app write planned — executive-summary spec) |
| `use_case.note` | App and `apply_use_case_notes.py` |

## Key column decision (DATA-LINK-006)
Recommendation: standardise on `id` for all references, remove `detectKey` from forms once confirmed no rows use the
alternate key (DATA-T04).

## Constitution check
| Article | Compliance |
|---|---|
| II | Single workbook, soft delete, history. ✅ |
| IV | Allowed values defined by mapping sheets. ✅ (data quality: DATA-QUAL-003) |
