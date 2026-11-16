# ADR-0004: Client-side customer search

- **Status:** Accepted (recorded retroactively, 2026-11-11)

## Context
The customer list is small (hundreds to low thousands of visible customers). Users expect instant, typo-tolerant-ish
matching on partial names and on the parent ID.

## Decision
Load all visible customers once at start (`GET /table/customer`, filtered client-side on `visible`) and search in
memory with token matching and a fixed ranking (SRCH-SEL-001, SRCH-SEL-002). Show at most 100 results.

## Consequences
- Instant results, no server round-trip per keystroke, works with the simple workbook API.
- The full customer table (including executive summaries) is downloaded at start. If the list grows large or
  summaries become heavy, add a lightweight endpoint returning only `id`, `parent_id`, `parent_name`, `visible`,
  and load the selected customer's summary on demand.
- No fuzzy/typo tolerance; revisit if users ask for it.
