# Steering: Product

> Steering files give every spec the shared context it needs. Read them before writing or reviewing a spec.

## Purpose
The Code App Demo is an internal tool for a customer-success team. A user looks up a **parent customer** and, on one
screen, sees and maintains its:
- **Executive summary** — rich-text account narrative.
- **Use cases** — adoptions of a product *solution* in a subsidiary/department of the customer.
- **Events** — meetings, workshops and other engagements with the customer's subsidiaries.

It replaces an older Power Apps / SQL application. Data now lives in a local Excel workbook (see ADR-0001).

## Users
| Persona | Needs |
|---|---|
| Customer Success Specialist (CSS) — primary | Open a customer fast, review the summary, log use cases and events, clone use cases across subsidiaries, export lists. |
| Team lead / manager | Review a customer's use cases and engagement history; export to Excel/Word. |
| Data maintainer | Rebuild the workbook from the Power BI export; fix lookup data in Excel. |

## In scope
Customer search · workspace layout & theme · executive summary (view/edit/export) · use cases (list, filter, sort, add,
bulk add, clone, paste, delete, export) · events (list, filter, sort, add, delete, export) · local workbook API ·
workbook build scripts · **planned:** AI Account Brief, an optional, cited AI draft of the executive summary that a
person reviews and saves ([022-ai-account-brief](../specs/022-ai-account-brief/requirements.md), Constitution Article XII);
drafted automatically for a customer with no saved summary, or on *Regenerate with AI*, and shown in a full-width,
collapsible summary band above the grids (CR-20261120-1).

## Out of scope
Authentication and multi-user concurrency · hosted deployment · editing lookup data or customers in the app ·
dashboards/charts · AI that writes data without a person's Save · sending real customer data to a model
([AI data policy](ai-data-policy.md)).

## Product principles
1. **Speed to the customer** — a few keystrokes to open any customer.
2. **Only valid data** — pick-lists offer only valid combinations.
3. **Excel stays usable** — maintainers can always open and fix the workbook by hand.
4. **Exports are first-class** — what you see (filters/sort) is what you export.

## Success measures
- Any visible customer found in ≤ 3 keystrokes on average.
- Adding a use case takes one dialog; cloning to all departments of a subsidiary takes one dialog.
- No data loss on save failures (Excel lock, crash).

## Glossary
See [glossary.md](glossary.md).
