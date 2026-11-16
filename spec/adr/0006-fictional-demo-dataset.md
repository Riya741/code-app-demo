# ADR-0006: Fictional demo dataset as the project's data source

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** Project owner

## Context
The workbook built from the Power BI export (`Terra_Data.xlsx` → `code-app-data.xlsx`, ADR-0001) held real customer
data and real product and vendor names. The project is now also a case study for AI work (evals, agents, MCP tools,
demos), which means sharing screenshots and traces and, later, sending data to an LLM. Constitution Article III.3
says internal customer data must not leave the user's machine. The export also had known gaps (placeholder event
types, no emails, blank industry/vertical/virtual: DATA-QUAL-001, -002, -004).

## Options considered
1. **Keep the real workbook, redact on the way out** — realistic, but every new feature (exports, traces, LLM calls)
   needs its own redaction, and one miss leaks customer data.
2. **Anonymise the real workbook** — keeps the real distribution, but the real product catalogue and free-text notes
   are hard to anonymise reliably.
3. **Generate a fictional dataset with the same schema and distributions** — no real data anywhere; reproducible from a
   seed; edge cases can be planted on purpose. Less realistic text.

## Decision
Option 3. `scripts/generate_demo_workbook.py` writes `../data/code-app-data.xlsx` with fictional customers, people,
products and text. The product catalogue in `scripts/demo_catalogue.json` keeps the original ids, metric types,
premium flags and allowed status / use case type per solution, so the app behaves exactly as before. The real
workbook and export were removed from the project folder (moved to the Recycle Bin, not committed anywhere).
Requirements: PIPE-GEN-001..008.

## Consequences
- The app, tests (QA-T03 fixture via `--customers 8`), evals and demos run on data that can be shared.
- DATA-QUAL-001, -002 and -004 are met by the generated data. DATA-QUAL-003 (valid statuses per solution) is not: the
  catalogue still allows every status for every solution, as the export did.
- `scripts/build_workbook.py` and `scripts/apply_use_case_notes.py` remain for importing a future export but have no
  input in the project.
- Text is template-based, so it is less varied than real notes; AI evals must keep that in mind.

## Revisit when
- Real data is needed for a pilot: then specify authentication and data handling first (Article III.3, SEC-EXPO-002).
- The data model changes: update the generator and `demo_catalogue.json` in the same change.
