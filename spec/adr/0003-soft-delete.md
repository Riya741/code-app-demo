# ADR-0003: Soft delete for use cases and events

- **Status:** Accepted (recorded retroactively, 2026-11-11)

## Context
The legacy application soft-deleted rows. Reports and the status history refer to use cases by id; hard deletes
would orphan link and history rows. Users occasionally delete by mistake.

## Decision
`DELETE /use-cases/:id` and `DELETE /events/:id` set `deleted = true` and `last_modified = now`. Every read
endpoint excludes `deleted = true` rows. Link-table and history rows are kept.

## Consequences
- Recovery is possible by setting `deleted` back to FALSE in Excel.
- The UI says "This cannot be undone from the app." An in-app undo/restore is not provided.
- Generic `GET /table/:name` returns deleted rows too; it is only used for lookups.
- The workbook grows over time; acceptable at current volumes.
