# User-Facing Messages Catalog

Every string a user can see as feedback. Change wording here first, then in code. Keep the tone short, plain and actionable.

## 1. Toasts

| Trigger | Type | Text (title — description) | Source |
|---|---|---|---|
| Use case added | success | Use case added | UseCaseForm |
| Event added | success | Event added | EventForm |
| Edit saved (not wired) | info | Editing isn't connected yet — This is a preview of the edit form; your changes were not saved. | UseCaseForm, EventForm |
| Use case deleted | success | Use case deleted | UseCasesPanel |
| Event deleted | success | Event deleted | EventsPanel |
| Use cases exported | success | Exported N use case / use cases | UseCasesPanel |
| Events exported | success | Exported N event / events | EventsPanel |
| Summary saved | success | Executive summary updated — Shown on screen only; it is not written to the database. | CustomerDetails |
| Summary exported | success | Executive summary exported | CustomerDetails |
| Bulk all saved | success | N use case(s) created | UseCaseBulkForm |
| Bulk partial | error | S of N created — The rows that did not save are still in the table. | UseCaseBulkForm |
| Paste unmatched | warning | N name(s) didn't match and were left blank — Choose them in the table. | UseCaseBulkForm |
| No departments | info | That subsidiary has no departments | UseCaseBulkForm |
| Department load failed | error | Could not load departments — <message> | UseCaseBulkForm |

## 2. Inline messages

| Where | Text |
|---|---|
| Required field | Required |
| Form save failure | Could not save: <message> |
| Delete failure | Could not delete: <message> |
| Bulk lookup failure | Could not load some lists: <message> |
| Bulk failed rows | N row(s) could not be saved. Hover "Not saved" on a row to see why, then try again. |
| Panel load error | <message> + [Try again] |
| Search load error | <message> + [Try again] |
| Empty use cases | No use cases recorded for this customer. |
| Empty events | No events recorded for this customer. |
| Empty summary | No executive summary yet. Click to add one. |
| No search matches | No customers match "<query>" / Check the spelling or try a shorter name. |
| Filters hide all | No rows match the current filters. [Clear filters] |
| Bulk table empty | No rows yet. Add a row below. |
| Editor loading | Loading editor... |

## 3. Service / API errors (shown via the messages above)

| Source | Text |
|---|---|
| Client, network | Could not reach the workbook service. Start the app with `npm run dev`. |
| Client, non-JSON | The workbook service is not available here. It only runs with `npm run dev` / `npm run preview`. |
| Client, generic | The workbook request failed (<status>). |
| Client, no id | This use case has no id. / This event has no id. |
| Server 400 | Missing: <fields> · The request body is not valid JSON. · parentId is required. |
| Server 404 | The workbook has no "<name>" sheet. · Use case <id> was not found. · Event <id> was not found. · This use case could not be found. · This event could not be found. · Unknown workbook request: <METHOD> <path> |
| Server 409 | This use case was already deleted. / This event was already deleted. |
| Server 423 | Could not save: <file> is open in Excel. Close it and try again. |
| Server 500 | Workbook not found: <path> · or the raw error message |

## 4. Placeholders and hints (forms)

| Field | Text |
|---|---|
| Hero search / bar search / loading | Search Parent · Search another parent... · Loading parents... |
| Combobox default / search | Select... · Search... |
| Dependent pick-lists | Choose a subsidiary first · Choose a department first · Choose a solution first (bulk: Pick a subsidiary / Pick a department / Pick a solution / None) |
| Value | Short value statement |
| Notes / meeting notes | Click to add notes... · Click to add meeting notes... |
| Stage | e.g. Completed |
| Multi-select hint | (one or more) |
| Dialog description | Fields marked * are required. |
| Bulk fill pickers | Leave as is |
