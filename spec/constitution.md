# Code App Demo — Constitution

**Version:** 1.0.0 · **Ratified:** 2026-11-11 · **Last amended:** 2026-11-11

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
4. Use cases and events are **soft-deleted**; history and link rows are never destroyed by the app.
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

---

## Governance
- **Amendments** are made by a change request ([templates/change-request.md](templates/change-request.md)) that names the
  articles affected, bumps the version (MAJOR: article removed/redefined · MINOR: article added · PATCH: wording) and
  updates [steering/constitution-mapping.md](steering/constitution-mapping.md).
- **Compliance check:** every `design.md` has a "Constitution check" section; reviewers reject a spec that fails it
  without a recorded, approved exception.
- **Exceptions** are recorded in the spec's design under "Constitution check → Exceptions", with the reason and an exit plan (a task).
