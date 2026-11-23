# Code App Demo — Constitution

**Version:** 1.1.2 · **Ratified:** 2026-11-11 · **Last amended:** 2026-11-23 ([CR-20261123-1](changes/CR-20261123-1-ai-gateway-mode.md))

The constitution holds the non-negotiable principles for this project. Every spec, design and task must comply with
them. Where a spec conflicts with the constitution, the constitution wins and the spec must be changed.
The mapping from each article to the specs that put it into practice is in
[steering/constitution-mapping.md](steering/constitution-mapping.md).

---

## Article I — Spec First
1. No behaviour is added, changed or removed in code without first being written in a spec
   (`requirements.md` → `design.md` → `tasks.md`) and reviewed.
2. If code and spec disagree, one of them is a defect; it is resolved by changing one of them deliberately, never by leaving both.
3. Requirement IDs are permanent. They are retired, never reused or renumbered.

## Article II — The Workbook Is the Single Source of Truth
1. All business data lives in the workbook (`code-app-data.xlsx`). The browser stores only UI preferences (theme, panel sizes).
2. Every write is **atomic**: it lands completely or leaves the file untouched.
3. Writes are **serialised**; two requests never interleave.
4. Use cases and events are **soft-deleted**; their rows and their status history are never destroyed by the app.
   An edit updates the record in place (same `id`) and replaces that record's own link rows (personnel, content
   types, solutions) with the set the user saved; no other record's link rows are touched.
5. Sheet and column names are a contract. Changing them requires a spec change to the data model and the API.

## Article III — Safe by Default
1. All HTML that comes from data is sanitised before it is rendered or exported.
2. All spreadsheet exports are protected against formula injection.
3. The service handles internal customer data; it must not be exposed beyond the user's machine unless authentication is specified first.
4. Errors returned to the browser carry a message, never a stack trace.

## Article IV — Valid by Construction
1. Forms only offer valid choices (cascading pick-lists filtered by their parent: subsidiary → department → stakeholder, solution → type/status).
2. Required fields are marked and enforced before any request is sent.
3. The server rejects requests missing required fields with a clear message.

## Article V — Clear Feedback
1. Every data view has explicit **loading**, **error (with retry)**, **empty** and **content** states.
2. Every write gives visible success or failure feedback; on failure the user's input is kept.
3. Destructive actions require confirmation.
4. Every user-facing message is listed in the [messages catalog](specs/017-design-system/messages-catalog.md).

## Article VI — Consistent, Theme-Aware UI
1. All colours come from design tokens; every UI works in **light and dark** themes.
2. Every screen works on **desktop (≥1024px)** and **narrow (<1024px)** layouts.
3. Shared components are reused before new ones are created.

## Article VII — Accessible to Everyone
1. New work targets **WCAG 2.1 AA**.
2. Every interactive element is reachable and operable by keyboard and has an accessible name.

## Article VIII — Simple and Local-First
1. Prefer the simplest design that meets the spec; no speculative abstractions.
2. Add a dependency only when it is used; remove unused ones.
3. The app runs with one command (`npm run dev`) and no external services apart from the font CDN.

## Article IX — Layered Architecture
1. Components never call `fetch`; data access goes **component → hook → `src/lib` fetcher → `/api/workbook`**.
2. Each query and mutation lives in a hook; mutations invalidate the queries they affect.
3. Server logic (joins, validation, persistence) lives in `server/`; UI logic lives in `src/`.

## Article X — Testable and Traceable
1. Every requirement has acceptance criteria written as testable statements.
2. Every task references the requirement(s) it fulfils; every test names the requirement it verifies.
3. A task is only **Done** when its acceptance criteria pass and the spec status is updated.

## Article XI — Performance Budget
1. Search responds within one frame for the expected data size.
2. Reference data is cached; heavy UI (the rich text editor) is loaded only when needed.
3. Known scaling limits are documented in the spec, with the threshold at which the design must change.

## Article XII — AI Agents and Data
1. Every AI agent (runtime, evaluation or development) has an **agent spec** in [agents/](agents/README.md) naming its
   purpose, inputs, outputs, allowed tools, model, guardrails, failure behaviour and done criteria. An agent may not
   use a tool its spec does not list, and its prompt or subagent file cites the spec and version it implements.
2. Agents hand off through **versioned contracts** (JSON Schema in [contracts/](contracts/README.md)). A hand-off that
   fails validation is rejected; it is never repaired silently.
3. AI output is a **draft** until a human accepts it. No agent writes business data to the workbook; only the
   existing, specified write endpoints do, on a user's action.
4. Workbook data is sent to a model provider, directly or through an AI gateway that the
   [AI data policy](steering/ai-data-policy.md) names, only when `AI_ENABLED=true` and that policy allows the field. This qualifies Article III.3: the project holds only
   fictional data (ADR-0006), which the policy allows; real customer data may not be sent until authentication and
   data handling are specified first. Development and evaluation use generated fictional data only.
5. Every factual claim in AI output that is shown to a user cites the source record it comes from; an uncited or
   wrongly cited claim fails verification.
6. Every AI capability ships with an **evaluation**. A prompt or model change is accepted only when the eval gate
   (G7) passes, and model choices are recorded in an ADR that cites the eval report.
7. Every AI run is **traceable**: run ID, step, agent spec and version, model, tokens, cost, latency and outcome.
8. AI features are **optional**. With `AI_ENABLED` unset, the app runs exactly as Article VIII.3 requires; the model
   provider, reached directly or, only when configured, through the AI gateway the AI data policy names, is the only
   extra external service, and only while AI is enabled.

---

## Governance
- **Amendments** are made by a change request ([templates/change-request.md](templates/change-request.md)) that names the
  articles affected, bumps the version (MAJOR: article removed/redefined · MINOR: article added · PATCH: wording) and
  updates [steering/constitution-mapping.md](steering/constitution-mapping.md).
- **Compliance check:** every `design.md` has a "Constitution check" section; reviewers reject a spec that fails it
  without a recorded, approved exception.
- **Exceptions** are recorded in the spec's design under "Constitution check → Exceptions", with the reason and an exit plan (a task).

## Amendment log
| Version | Date | Change | Change request |
|---|---|---|---|
| 1.0.0 | 2026-11-11 | Ratified: Articles I–XI | — |
| 1.1.0 | 2026-11-17 | Article XII (AI Agents and Data) added; qualifies III.3 and VIII.3 for AI features | [CR-20261117-1](changes/CR-20261117-1-ai-agents.md) |
| 1.1.1 | 2026-11-20 | PATCH: Article II.4 worded to match the specified write rule (API-WRITE-004): an edit replaces the record's own link rows; soft delete and history unchanged | [CR-20261120-1](changes/CR-20261120-1-owner-decisions-summary-band.md) |
| 1.1.2 | 2026-11-23 | PATCH: Articles XII.4 and XII.8 name an AI gateway, listed in the AI data policy and used only when configured, as a way to reach the same model provider; AI stays optional and the model route stays the only extra external service | [CR-20261123-1](changes/CR-20261123-1-ai-gateway-mode.md) |
