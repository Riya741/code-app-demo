# ADR-0005: TanStack Query for server state

- **Status:** Accepted (recorded retroactively, 2026-11-11)

## Context
Panels and dialogs need loading/error states, caching of lookup lists, and refresh after writes.

## Decision
Use `@tanstack/react-query` for every read (`useQuery`) and write (`useMutation`), wrapped in hooks under
`src/hooks/`. Writes invalidate the affected query key instead of patching the cache. Lookups use a 10-minute
`staleTime`. Window-focus refetch is off; failed queries retry once.

## Consequences
- Consistent loading/error UI and no hand-written cache code.
- After a write the list refetches (one extra request) — acceptable and always consistent with the file.
- Query keys are part of the contract; they are listed in [client-data-layer design](../specs/015-client-data-layer/design.md).
