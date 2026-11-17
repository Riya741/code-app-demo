# Glossary

| Term | Definition | Where in data |
|---|---|---|
| **Parent / Customer** | The top-level customer account. Users search for and select a parent. | `customer` sheet (`id`, `parent_id`, `parent_name`) |
| **Parent ID** | The customer's business identifier shown in the top bar chip. In the generated workbook `id` = `parent_id`. | `customer.parent_id` |
| **Visible customer** | A customer row whose `visible` is `true`, `1` or `"true"`. Only these are searchable. | `customer.visible` |
| **Subsidiary** | A legal/organisational unit belonging to a parent. Use cases and events are recorded against a subsidiary. | `subsidiary` sheet |
| **Department** | A unit inside a subsidiary, with a `department_type` (e.g. Finance). | `department` sheet |
| **Stakeholder** | A customer-side contact inside a department. | `stakeholder` sheet |
| **Solution** | A product/offering being adopted. Determines allowed use case types and statuses. | `solution` sheet |
| **Use case type** | A category of use case; allowed values depend on the solution. | `use_case_type`, `solution_use_case_type` |
| **Status** | Lifecycle state of a use case (e.g. Planned, Live). Allowed values and order depend on the solution. | `status`, `solution_status` |
| **Live** | A use case whose status name contains the word "live" (case-insensitive). Counted in the Live tally. | derived |
| **Use case** | One adoption of a solution in a subsidiary (optionally a department and stakeholder), with targets, launch date, value and notes. | `use_case` sheet |
| **Content type** | Category of content involved in a use case. Many-to-many. | `content_type`, `use_case_content_type` |
| **Personnel / CSS contributor** | Internal team members linked to a use case or event. Many-to-many. | `personnel`, `use_case_personnel`, `event_personnel` |
| **Event** | An engagement (meeting, workshop…) with a subsidiary, on a date, at a stage. | `event` sheet |
| **Event type** | Category of event. | `event_type` sheet |
| **Stage** | Free-text state of an event (e.g. "Completed"). | `event.stage` |
| **Executive summary** | Rich-text narrative about the customer. | `customer.executive_summary` |
| **Value snippet** | Short statement of the business value of a use case. | `use_case.value_snippet` |
| **Premium credit** | Flag copied from the chosen solution onto the use case when it is saved. | `solution.premium_credit`, `use_case.premium_credit` |
| **Soft delete** | Deleting sets `deleted = true` on the row; it stays in the workbook but is hidden from every read. | `deleted` column |
| **Workbook** | The Excel file `code-app-data.xlsx` that is the app's database. Each sheet is one table. | file |
| **Lookup** | Reference data used to fill dropdowns (subsidiaries, departments, …). | several sheets |
| **Clone** | Creating new use cases from existing ones, typically to copy them to other subsidiaries/departments. | UI |
| **Pending row** (bulk form) | A row in the bulk table with neither subsidiary nor department set. | UI |
| **Surrogate key / alt key** | Lookup sheets carry both `id` and `<name>_id`. The app detects which one the activity rows use (`detectKey`). | `src/lib/lookups.ts` |

## AI terms (Constitution Article XII)

| Term | Definition | Where |
|---|---|---|
| **AI Account Brief** | An AI-drafted executive summary built from a customer's use cases and events, reviewed and saved by a person. | spec 022 |
| **Agent** | A component that does one job in an AI workflow: an LLM step, a deterministic code step, or a Claude Code subagent. | `spec/agents/` |
| **Agent spec** | The governing document of an agent: purpose, inputs, outputs, tools, model, guardrails, done criteria, failure. | `spec/agents/*.md` |
| **Contract** | A versioned JSON Schema for a hand-off between agents; invalid hand-offs are rejected. | `spec/contracts/` |
| **Hand-off** | What one agent passes to the next: a contract-shaped JSON object at runtime, or a hand-off file for a development task. | `spec/handoffs/` |
| **Fact sheet / fact ID** | The allow-listed, redacted data for one customer; each record has a fact ID (`CU-`, `UC-`, `EV-` + workbook id) that the draft cites. | fact-sheet.v1 |
| **Run** | One execution of the brief pipeline, with a run ID, checkpoints and a trace. | `../data/ai-runs/` |
| **Unverified draft** | A draft the critic still rejected after two revisions; shown with its issues, never hidden. | AOPS-FAIL-003 |
| **Judge** | An LLM that scores outputs against a rubric during evaluation; trusted only while calibrated against human scores. | AGENT-JUDGE |
| **Gate G7** | The eval gate: quality thresholds a prompt or model change must meet. | EVAL-GATE-001 |
